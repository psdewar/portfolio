import { NextResponse } from "next/server";
import { isAdminAuthorized } from "./admin-auth";

export async function adminJson(request: Request, handler: () => Promise<unknown>) {
  if (!(await isAdminAuthorized(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await handler());
  } catch (error) {
    console.error("[admin]", error);
    const message = error instanceof Error ? error.message : (error as { message?: string }).message;
    return NextResponse.json({ error: message || "Unknown error" }, { status: 500 });
  }
}
