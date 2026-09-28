import { NextResponse } from "next/server";
import { verifyOtpToken, verifyOtpCodeSafe } from "../../../../lib/otp-token";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";
import { setSessionCookie } from "../../../../lib/session";
import { upsertIdentity, firstNameOf } from "../../../lib/identity";

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(ip, "otpVerify");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const { token, code } = body;

    if (!token || !code) {
      return NextResponse.json(
        { error: "Token and code are required" },
        { status: 400 },
      );
    }

    const payload = verifyOtpToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Code expired. Please try again." },
        { status: 400 },
      );
    }

    if (!verifyOtpCodeSafe(payload.code, code.trim())) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 },
      );
    }

    const { contact } = await upsertIdentity({
      email: payload.email,
      name: payload.firstName,
      phone: payload.phone,
      tier: payload.tier,
      source: "email",
    });
    const firstName = firstNameOf(contact.name) || payload.firstName;

    const res = NextResponse.json({ firstName });
    return setSessionCookie(res, { email: contact.email, name: firstName });
  } catch (error) {
    console.error("[OTP Verify-Signup] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
