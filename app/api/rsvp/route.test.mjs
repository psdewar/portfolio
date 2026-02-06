import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";

// In-memory mock database
let db;

function resetDb() {
  db = new Map(); // email -> { id, email, name, phone, tier, rsvp, created_at }
}

// Mock Supabase client that operates on the in-memory db
function mockSupabase() {
  let table, filter, pendingUpdate;

  function makeChain() {
    const chain = {};

    chain.from = (t) => { table = t; filter = {}; pendingUpdate = null; return chain; };
    chain.select = () => chain;
    chain.eq = (col, val) => {
      filter[col] = val;
      if (pendingUpdate) {
        for (const [key, row] of db) {
          if (row[col] === val) {
            db.set(key, { ...row, ...pendingUpdate });
            pendingUpdate = null;
            return { error: null };
          }
        }
        pendingUpdate = null;
        return { error: { message: "No matching row" } };
      }
      return chain;
    };

    chain.single = () => {
      if (table !== "stay-connected") return { data: null, error: null };
      for (const [, row] of db) {
        if (filter.email && row.email === filter.email) return { data: row, error: null };
        if (filter.id && row.id === filter.id) return { data: row, error: null };
      }
      return { data: null, error: { code: "PGRST116", message: "No rows found" } };
    };

    chain.update = (data) => { pendingUpdate = data; return chain; };

    chain.insert = (data) => {
      if (table === "stay-connected") {
        if (db.has(data.email)) {
          return { error: { code: "23505", message: "Duplicate" } };
        }
        const row = { id: crypto.randomUUID(), ...data, created_at: new Date().toISOString() };
        db.set(data.email, row);
      }
      return { error: null };
    };

    return chain;
  }

  return makeChain();
}

// Extract the core RSVP logic from route.ts to test it in isolation
async function handleRsvp(body, supabase) {
  const { name, email, guests, eventId } = body;

  if (!email?.trim() || !email.includes("@")) {
    return { status: 400, body: { error: "Valid email is required" } };
  }
  const VALID_EVENTS = new Set(["ftgu-20260220"]);
  if (!eventId?.trim() || !VALID_EVENTS.has(eventId.trim())) {
    return { status: 400, body: { error: "Invalid event" } };
  }

  const guestCount = Math.max(1, Math.min(10, parseInt(guests, 10) || 1));
  const rsvpEntry = `${eventId}:${guestCount}`;
  const emailLower = email.trim().toLowerCase();

  const { data: contact } = supabase
    .from("stay-connected")
    .select("id, rsvp")
    .eq("email", emailLower)
    .single();

  if (contact) {
    const current = contact.rsvp || [];
    if (current.some((r) => r.startsWith(eventId))) {
      return { status: 400, body: { error: "You've already RSVP'd! Check your email for details." } };
    }
    const { error: updateError } = supabase
      .from("stay-connected")
      .update({ rsvp: [...current, rsvpEntry] })
      .eq("id", contact.id);
    if (updateError) {
      return { status: 500, body: { error: "Failed to save RSVP. Please try again." } };
    }
  } else {
    const { error: insertError } = supabase
      .from("stay-connected")
      .insert({ email: emailLower, ...(name?.trim() && { name: name.trim() }), rsvp: [rsvpEntry] });
    if (insertError) {
      return { status: 500, body: { error: "Failed to save RSVP. Please try again." } };
    }
  }

  return { status: 200, body: { success: true }, guestCount, rsvpEntry };
}

// --- Tests ---

describe("RSVP Route", () => {
  beforeEach(() => resetDb());

  it("creates contact without name", async () => {
    const supabase = mockSupabase();
    const res = await handleRsvp({ email: "noname@test.com", guests: 1, eventId: "ftgu-20260220" }, supabase);

    assert.equal(res.status, 200);
    const row = db.get("noname@test.com");
    assert.ok(row);
    assert.equal(row.name, undefined);
    assert.deepEqual(row.rsvp, ["ftgu-20260220:1"]);
  });

  it("rejects missing eventId", async () => {
    const res = await handleRsvp({ name: "Test", email: "a@b.com", guests: 1 }, mockSupabase());
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid event/);
  });

  it("rejects unknown eventId", async () => {
    const res = await handleRsvp({ name: "Test", email: "a@b.com", guests: 1, eventId: "fake-event" }, mockSupabase());
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Invalid event/);
  });

  it("rejects invalid email", async () => {
    const res = await handleRsvp({ name: "Test", email: "bad", guests: 1, eventId: "ftgu-20260220" }, mockSupabase());
    assert.equal(res.status, 400);
    assert.match(res.body.error, /Valid email/);
  });

  it("creates new contact with rsvp entry", async () => {
    const supabase = mockSupabase();
    const res = await handleRsvp({ name: "Alice", email: "alice@test.com", guests: 2, eventId: "ftgu-20260220" }, supabase);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.rsvpEntry, "ftgu-20260220:2");

    const row = db.get("alice@test.com");
    assert.ok(row, "contact should exist in db");
    assert.equal(row.name, "Alice");
    assert.deepEqual(row.rsvp, ["ftgu-20260220:2"]);
  });

  it("appends rsvp to existing contact", async () => {
    // Seed an existing contact with a different event
    db.set("bob@test.com", {
      id: "bob-id",
      email: "bob@test.com",
      name: "Bob",
      rsvp: ["other-event-20250101:1"],
      created_at: new Date().toISOString(),
    });

    const supabase = mockSupabase();
    const res = await handleRsvp({ name: "Bob", email: "bob@test.com", guests: 3, eventId: "ftgu-20260220" }, supabase);

    assert.equal(res.status, 200);
    assert.equal(res.rsvpEntry, "ftgu-20260220:3");

    const row = db.get("bob@test.com");
    assert.deepEqual(row.rsvp, ["other-event-20250101:1", "ftgu-20260220:3"]);
  });

  it("rejects duplicate rsvp for same event", async () => {
    db.set("carol@test.com", {
      id: "carol-id",
      email: "carol@test.com",
      name: "Carol",
      rsvp: ["ftgu-20260220:1"],
      created_at: new Date().toISOString(),
    });

    const supabase = mockSupabase();
    const res = await handleRsvp({ name: "Carol", email: "carol@test.com", guests: 2, eventId: "ftgu-20260220" }, supabase);

    assert.equal(res.status, 400);
    assert.match(res.body.error, /already RSVP/);
    // rsvp array should be unchanged
    assert.deepEqual(db.get("carol@test.com").rsvp, ["ftgu-20260220:1"]);
  });

  it("clamps guest count to 1-10", async () => {
    const supabase1 = mockSupabase();
    const res1 = await handleRsvp({ name: "A", email: "a@t.com", guests: 0, eventId: "ftgu-20260220" }, supabase1);
    assert.equal(res1.guestCount, 1);
    assert.equal(res1.rsvpEntry, "ftgu-20260220:1");

    resetDb();
    const supabase2 = mockSupabase();
    const res2 = await handleRsvp({ name: "B", email: "b@t.com", guests: 50, eventId: "ftgu-20260220" }, supabase2);
    assert.equal(res2.guestCount, 10);
    assert.equal(res2.rsvpEntry, "ftgu-20260220:10");

    resetDb();
    const supabase3 = mockSupabase();
    const res3 = await handleRsvp({ name: "C", email: "c@t.com", guests: "abc", eventId: "ftgu-20260220" }, supabase3);
    assert.equal(res3.guestCount, 1);
  });

  it("normalizes email to lowercase", async () => {
    const supabase = mockSupabase();
    await handleRsvp({ name: "Dan", email: "DAN@Test.COM", guests: 1, eventId: "ftgu-20260220" }, supabase);

    assert.ok(db.has("dan@test.com"), "email should be lowercased");
    assert.ok(!db.has("DAN@Test.COM"), "original case should not be stored");
  });

  it("trims name and email whitespace", async () => {
    const supabase = mockSupabase();
    await handleRsvp({ name: "  Eve  ", email: "  eve@test.com  ", guests: 1, eventId: "ftgu-20260220" }, supabase);

    const row = db.get("eve@test.com");
    assert.equal(row.name, "Eve");
    assert.equal(row.email, "eve@test.com");
  });

  it("handles existing contact with empty rsvp array", async () => {
    db.set("frank@test.com", {
      id: "frank-id",
      email: "frank@test.com",
      name: "Frank",
      rsvp: [],
      created_at: new Date().toISOString(),
    });

    const supabase = mockSupabase();
    const res = await handleRsvp({ name: "Frank", email: "frank@test.com", guests: 5, eventId: "ftgu-20260220" }, supabase);

    assert.equal(res.status, 200);
    assert.deepEqual(db.get("frank@test.com").rsvp, ["ftgu-20260220:5"]);
  });

  it("handles existing contact with null rsvp", async () => {
    db.set("grace@test.com", {
      id: "grace-id",
      email: "grace@test.com",
      name: "Grace",
      rsvp: null,
      created_at: new Date().toISOString(),
    });

    const supabase = mockSupabase();
    const res = await handleRsvp({ name: "Grace", email: "grace@test.com", guests: 1, eventId: "ftgu-20260220" }, supabase);

    assert.equal(res.status, 200);
    assert.deepEqual(db.get("grace@test.com").rsvp, ["ftgu-20260220:1"]);
  });
});
