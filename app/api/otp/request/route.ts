import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { createOtpToken, generateOtpCode } from "../../../../lib/otp-token";
import { sendOtpEmail } from "../../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

async function findUserByEmail(
  email: string,
): Promise<{ name: string | null; email: string; phone: string | null } | null> {
  const { data, error } = await supabaseAdmin
    .from("stay-connected")
    .select("email, name, phone")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (error || !data) return null;
  return data;
}

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
    const email = body.email?.trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 },
      );
    }

    // Find user in stay-connected table
    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: "Email not found. Please sign up first." },
        { status: 404 },
      );
    }

    // Generate OTP code and create token
    const code = generateOtpCode();
    const token = createOtpToken({
      email: user.email,
      code,
      firstName: user.name?.split(" ")[0] || "",
      expiresAt: Date.now() + OTP_EXPIRY_MS,
    });

    // Send email
    const sent = await sendOtpEmail({ to: user.email, code });
    if (!sent) {
      return NextResponse.json(
        { error: "Failed to send verification email" },
        { status: 500 },
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("[OTP Request] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
