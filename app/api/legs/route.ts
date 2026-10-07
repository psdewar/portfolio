import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "../shared/admin-auth";
import { CHORUS_TOKEN, chorusFetch, chorusList } from "../../lib/chorus";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await chorusList("legs"));
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!CHORUS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await chorusFetch("legs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok)
      return NextResponse.json({ error: text || "Failed to add leg" }, { status: res.status });

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[legs] POST error:", error);
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

  if (!CHORUS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await chorusFetch("legs", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok)
      return NextResponse.json({ error: text || "Failed to update leg" }, { status: res.status });

    try {
      return NextResponse.json(JSON.parse(text));
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[legs] PATCH error:", error);
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

  if (!CHORUS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });

  try {
    const body = await request.json();
    const res = await chorusFetch("legs", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok)
      return NextResponse.json({ error: "Failed to delete leg" }, { status: res.status });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[legs] DELETE error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    );
  }
}
