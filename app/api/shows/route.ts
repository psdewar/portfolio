import { NextRequest, NextResponse } from "next/server";
import { publishEventbrite, cancelEventbrite, updateEventbriteForShow } from "../../lib/eventbrite";
import { hasRsvps } from "../../lib/rsvp";
import { isAdminAuthorized } from "../shared/admin-auth";
import { CHORUS_TOKEN, chorusFetch } from "../../lib/chorus";
import { isShowListed, getShowBySlug, type Show } from "../../lib/shows";
import {
  checkSpacing,
  conflictBody,
  deleteSponsors,
  loadBookingContext,
  loadShows,
  newDraftSlug,
  resolveLeg,
  SCHEDULE_FIELDS,
  scheduleChanged,
} from "../../lib/booking";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const res = await chorusFetch("shows", { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text();
      console.error("[shows] GET failed:", res.status, text);
      return NextResponse.json({ error: `Upstream ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("[shows] GET error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upstream unreachable" },
      { status: 502 },
    );
  }
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CHORUS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const { force, ...body } = await request.json();

    if (body.stage !== "intent" && body.date) {
      const { shows, legs } = await loadBookingContext();
      const spacing = force ? { ok: true as const } : await checkSpacing(body, shows);
      if (!spacing.ok) {
        return NextResponse.json({ ...conflictBody(spacing), conflict: spacing.conflict }, { status: 409 });
      }
      if (!body.leg && body.region) body.leg = await resolveLeg(body, shows, legs);
    }

    const res = await chorusFetch("shows", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: responseText || "Failed to add show" },
        { status: res.status },
      );
    }

    let created: Record<string, unknown>;
    try {
      created = JSON.parse(responseText);
    } catch {
      created = body;
    }

    const show = { ...body, ...created };
    // Same rule as confirm: drafts defer, private and unlisted never publish.
    const eventbrite =
      !isShowListed(show) || show.visibility === "private"
        ? undefined
        : await publishEventbrite(show);

    return NextResponse.json({ ...created, eventbrite });
  } catch (error) {
    console.error("[shows] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CHORUS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const { cancelEventbrite: alsoCancelEb, ...forward } = await request.json();

    // Only take the Eventbrite listing down when explicitly opted in. Best-effort:
    // a stale/already-cancelled event shouldn't block the delete.
    if (alsoCancelEb && forward.slug) {
      const existing = await getShowBySlug(forward.slug);
      if (existing?.eventbriteId) {
        await cancelEventbrite(existing.eventbriteId).catch((e) =>
          console.error("[shows] Eventbrite cancel on delete failed:", e),
        );
      }
    }

    const res = await chorusFetch("shows", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forward),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to delete show" }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[shows] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}

const REOPEN_CLEARED = {
  city: null,
  region: null,
  country: null,
  venue: null,
  venueLabel: null,
  address: null,
  tags: null,
  posterImg: null,
  doorLabel: null,
  visibility: null,
  eventbriteId: null,
  stage: "intent",
};

async function patchShow(body: Record<string, unknown>) {
  return chorusFetch("shows", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function reopenSlot(slug: string) {
  const shows = await loadShows();
  const show = shows.find((s) => s.slug === slug);
  if (!show?.leg || !show.date) {
    return NextResponse.json({ error: "Needs a leg and a date." }, { status: 400 });
  }
  if (await hasRsvps(slug)) {
    return NextResponse.json({ error: "Has RSVPs. Email those guests first." }, { status: 409 });
  }
  if (show.eventbriteId) {
    await cancelEventbrite(show.eventbriteId).catch((e) =>
      console.error("[shows] Eventbrite cancel on reopen failed:", e),
    );
  }
  await deleteSponsors(slug);

  const newSlug = newDraftSlug();
  const toDraft = await patchShow({ slug, visibility: "draft" });
  if (!toDraft.ok) {
    return NextResponse.json({ error: (await toDraft.text()) || "Failed to reopen" }, { status: toDraft.status });
  }
  const renamed = await patchShow({ slug, newSlug, ...REOPEN_CLEARED });
  if (!renamed.ok) {
    return NextResponse.json({ error: (await renamed.text()) || "Failed to reopen" }, { status: renamed.status });
  }
  return NextResponse.json({ ok: true, slug: newSlug });
}

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CHORUS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const { cancelEventbrite: alsoCancelEb, force, reopen, ...forward } = await request.json();

    if (reopen) return await reopenSlot(forward.slug);

    const touchesSchedule = [...SCHEDULE_FIELDS, "stage"].some((f) => f in forward);
    const shows = touchesSchedule ? await loadShows() : [];
    const existing = shows.find((s) => s.slug === forward.slug);
    const merged = { ...existing, ...forward } as Show;
    const scheduleEdited = !!existing && scheduleChanged(existing, forward);
    const promoted = existing?.stage === "intent" && merged.stage !== "intent";

    if (!force && (scheduleEdited || promoted) && merged.stage !== "intent" && merged.date) {
      const spacing = await checkSpacing(merged, shows);
      if (!spacing.ok) {
        return NextResponse.json({ ...conflictBody(spacing), conflict: spacing.conflict }, { status: 409 });
      }
    }

    // Reverting a show to draft only cancels Eventbrite when opted in. When it does,
    // clear the stale id too, otherwise publishEventbrite no-ops on re-confirm and
    // the show never relists.
    if (alsoCancelEb && forward.stage === "intent" && forward.slug) {
      const current = await getShowBySlug(forward.slug);
      if (current?.eventbriteId) {
        await cancelEventbrite(current.eventbriteId).catch((e) =>
          console.error("[shows] Eventbrite cancel on revert failed:", e),
        );
        forward.eventbriteId = null;
      }
    }

    const res = await chorusFetch("shows", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(forward),
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: responseText || "Failed to update show" },
        { status: res.status },
      );
    }

    const eventbrite =
      scheduleEdited && existing?.eventbriteId && forward.stage !== "intent"
        ? await updateEventbriteForShow(merged)
        : undefined;

    try {
      return NextResponse.json({ ...JSON.parse(responseText), eventbrite });
    } catch {
      return NextResponse.json({ ok: true, eventbrite });
    }
  } catch (error) {
    console.error("[shows] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
