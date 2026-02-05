import { NextResponse } from "next/server";
import { verifyOtpToken, verifyOtpCodeSafe } from "../../../../lib/otp-token";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

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

    // Verify and decrypt token
    const payload = verifyOtpToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: "Code expired. Please try again." },
        { status: 400 },
      );
    }

    // Compare codes (timing-safe to prevent timing attacks)
    if (!verifyOtpCodeSafe(payload.code, code.trim())) {
      return NextResponse.json(
        { error: "Invalid code. Please try again." },
        { status: 400 },
      );
    }

    // Store in Supabase
    const { error: dbError } = await supabaseAdmin
      .from("stay-connected")
      .insert({
        email: payload.email.toLowerCase().trim(),
        name: payload.firstName?.trim() || null,
        phone: payload.phone?.trim() || null,
        tier: payload.tier?.trim() || null,
      });

    if (dbError) {
      console.error("[OTP Verify-Signup] Database error:", dbError);
      return NextResponse.json(
        { error: "Failed to save. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ firstName: payload.firstName });
  } catch (error) {
    console.error("[OTP Verify-Signup] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
