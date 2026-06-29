import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.SCHEDULE_API_URL || "https://live.peytspencer.com";
const API_TOKEN = process.env.SCHEDULE_API_TOKEN;

type Method = "POST" | "PATCH" | "DELETE";

export function makeChorusProxy(resource: string) {
  const url = `${API_BASE}/chorus/${resource}`;
  const tag = `[${resource}]`;

  async function GET() {
    try {
      const res = await fetch(url, { cache: "no-store" });
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
    if (!API_TOKEN) return NextResponse.json({ error: "Not configured" }, { status: 500 });
    try {
      const body = await request.json();
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${API_TOKEN}` },
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
