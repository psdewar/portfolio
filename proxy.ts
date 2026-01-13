import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers for all requests
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");

  // Additional security for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Add API-specific security headers
    response.headers.set("X-Robots-Tag", "noindex, nofollow");

    // Rate limiting headers (for monitoring)
    const ip =
      request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    response.headers.set("X-Client-IP", ip.split(",")[0]);

    // Validate content type for POST requests
    if (request.method === "POST") {
      const contentType = request.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        return new NextResponse("Invalid content type", { status: 400 });
      }
    }
  }

  // Protect sensitive API endpoints
  if (
    request.nextUrl.pathname.startsWith("/api/create-checkout-session") ||
    request.nextUrl.pathname.startsWith("/api/fund-project")
  ) {
    // Verify user agent for checkout endpoints only (not downloads)
    const userAgent = request.headers.get("user-agent");
    if (!userAgent || userAgent.length < 10) {
      return new NextResponse("Invalid request", { status: 403 });
    }

    const suspiciousPatterns = [/bot/i, /crawler/i, /spider/i, /scraper/i];

    if (suspiciousPatterns.some((pattern) => pattern.test(userAgent))) {
      if (process.env.NODE_ENV === "development") {
        const clientIp = request.headers.get("x-forwarded-for") || "unknown";
        console.warn(`Suspicious user agent blocked: ${userAgent}, IP: ${clientIp}`);
      }
      return new NextResponse("Access denied", { status: 403 });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
