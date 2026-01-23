import { NextResponse } from "next/server";
import { createOtpToken, generateOtpCode } from "../../../../lib/otp-token";
import { sendOtpEmail } from "../../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(request: Request) {
  try {
    const ip = getClientIP(request);
    const rateCheck = checkRateLimit(ip, "otpRequest");
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rateCheck.resetIn / 1000)),
          },
        },
      );
    }

    const body = await request.json();
    const { firstName, email, phone, tier } = body;

    if (!firstName?.trim()) {
      return NextResponse.json(
        { error: "First name is required" },
        { status: 400 },
      );
    }

    if (!email?.trim() || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    // Generate OTP code and create token with signup data
    const code = generateOtpCode();
    const token = createOtpToken({
      email: email.trim(),
      code,
      firstName: firstName.trim(),
      phone: phone?.trim() || "",
      tier: tier?.trim() || "",
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    // Send email
    const sent = await sendOtpEmail({ to: email.trim(), code });
    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("[OTP Signup] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
