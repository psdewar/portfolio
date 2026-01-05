import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { createOtpToken, generateOtpCode } from "../../../../lib/otp-token";
import { sendOtpEmail } from "../../../../lib/sendgrid";
import { checkRateLimit, getClientIP } from "../../shared/rate-limit";

const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 minutes

interface StayConnectedEntry {
  firstName: string;
  email: string;
  phone: string;
  createdAt: number;
}

function parseEntry(entry: string): StayConnectedEntry | null {
  const parts = entry.split(",");
  if (parts.length < 4) return null;

  return {
    firstName: parts[0].replace(/\\,/g, ","),
    email: parts[1].replace(/\\,/g, ","),
    phone: parts[2].replace(/\\,/g, ","),
    createdAt: parseInt(parts[3], 10),
  };
}

async function findUserByEmail(
  email: string,
): Promise<StayConnectedEntry | null> {
  const { data, error } = await supabaseAdmin
    .from("stay-connected")
    .select("entry")
    .not("entry", "like", "_keepalive_%");

  if (error || !data) return null;

  const normalizedEmail = email.toLowerCase().trim();

  for (const row of data) {
    const parsed = parseEntry(row.entry);
    if (parsed && parsed.email.toLowerCase().trim() === normalizedEmail) {
      return parsed;
    }
  }

  return null;
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
      firstName: user.firstName,
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
