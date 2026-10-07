import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized, roleForToken } from "../shared/admin-auth";
import { CHORUS_TOKEN, chorusFetch, chorusRead } from "../../lib/chorus";
import { publicCache } from "../../lib/http";

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await isAdminAuthorized(request);
    const cacheable = !isAdmin && !request.nextUrl.searchParams.has("scope");
    const res = cacheable
      ? await chorusRead("schedule")
      : await chorusFetch("schedule", { cache: "no-store" });

    if (!res.ok) {
      console.error("[schedule] GET failed:", res.status, await res.text());
      return NextResponse.json({ nextStream: null }, { status: 200 });
    }

    const data = await res.json();
    if (!isAdmin) {
      return NextResponse.json(
        { nextStream: data.nextStream ?? null },
        {
          headers: {
            "Cache-Control": cacheable ? publicCache(60, 300) : "private, no-store",
          },
        },
      );
    }
    return NextResponse.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[schedule] GET error:", error);
    return NextResponse.json({ nextStream: null }, { status: 200 });
  }
}

export async function POST(request: NextRequest) {
  const role = await roleForToken(request.cookies.get("admin-auth")?.value);
  if (!role) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (role !== "owner") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!CHORUS_TOKEN) {
    console.error("[schedule] SCHEDULE_API_TOKEN not configured");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  try {
    const body = await request.json();

    const res = await chorusFetch("schedule", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const responseText = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { error: responseText || "Failed to update" },
        { status: res.status }
      );
    }

    try {
      const data = JSON.parse(responseText);
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ ok: true });
    }
  } catch (error) {
    console.error("[schedule] POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
