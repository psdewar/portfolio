import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "./admin-auth";
import { CHORUS_TOKEN, chorusFetch } from "../../lib/chorus";

type Method = "POST" | "PATCH" | "DELETE";

export function makeChorusProxy(resource: string) {
  const tag = `[${resource}]`;

  async function GET(request: NextRequest) {
    if (!(await isAdminAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    try {
      const res = await chorusFetch(resource, { cache: "no-store" });
      if (!res.ok) {
        console.error(`${tag} GET failed:`, res.status, await res.text());
        return NextResponse.json({ error: "upstream unavailable" }, { status: 502 });
      }
      return NextResponse.json(await res.json());
    } catch (error) {
      console.error(`${tag} GET error:`, error);
      return NextResponse.json({ error: "upstream unavailable" }, { status: 502 });
    }
  }

  async function mutate(request: NextRequest, method: Method) {
    if (!(await isAdminAuthorized(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!CHORUS_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });
    try {
      const body = await request.json();
      const res = await chorusFetch(resource, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) return NextResponse.json({ error: text || "Request failed" }, { status: res.status });
      try {
        return NextResponse.json(JSON.parse(text));
      } catch {
        return NextResponse.json({ ok: true });
      }
    } catch (error) {
      console.error(`${tag} ${method} error:`, error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unknown error" },
        { status: 500 },
      );
    }
  }

  return {
    GET,
    POST: (request: NextRequest) => mutate(request, "POST"),
    PATCH: (request: NextRequest) => mutate(request, "PATCH"),
    DELETE: (request: NextRequest) => mutate(request, "DELETE"),
  };
}
