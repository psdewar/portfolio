import { NextRequest, NextResponse } from "next/server";
import { publishEventbrite, cancelEventbrite } from "../../lib/eventbrite";
import { isAdminAuthorized } from "../shared/admin-auth";
import { CHORUS_TOKEN, chorusFetch } from "../../lib/chorus";
import { isShowListed, getShowBySlug } from "../../lib/shows";

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
    const body = await request.json();

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

export async function PATCH(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CHORUS_TOKEN) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const { cancelEventbrite: alsoCancelEb, ...forward } = await request.json();

    // Reverting a show to draft only cancels Eventbrite when opted in. When it does,
    // clear the stale id too, otherwise publishEventbrite no-ops on re-confirm and
    // the show never relists.
    if (alsoCancelEb && forward.stage === "intent" && forward.slug) {
      const existing = await getShowBySlug(forward.slug);
      if (existing?.eventbriteId) {
        await cancelEventbrite(existing.eventbriteId).catch((e) =>
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

    try {
      return NextResponse.json(JSON.parse(responseText));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[shows] PATCH error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
