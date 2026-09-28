import { NextResponse } from "next/server";
import { readSession } from "../../../lib/session";

export async function GET(request: Request) {
  const session = readSession(request);
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  return NextResponse.json({ name: session.name, email: session.email });
}
