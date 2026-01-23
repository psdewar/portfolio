import { NextRequest, NextResponse } from "next/server";

const VPS_BASE_URL = process.env.VPS_AUDIO_URL || "https://assets.peytspencer.com/audio";
const CF_ACCESS_CLIENT_ID = process.env.CF_ACCESS_CLIENT_ID || "";
const CF_ACCESS_CLIENT_SECRET = process.env.CF_ACCESS_CLIENT_SECRET || "";

const ALLOWED_FILES: Record<string, { filename: string; contentType: string }> = {
  "singles-16s-2025": {
    filename: "peyt-spencer-singles-and-16s-2025.zip",
    contentType: "application/zip",
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId = searchParams.get("file");

  if (!fileId) {
    return new NextResponse("File ID required", { status: 400 });
  }

  // Check patron status
  const patronToken = request.cookies.get("patronToken")?.value;
  if (patronToken !== "active") {
    return new NextResponse("Patron access required", { status: 403 });
  }

  const fileConfig = ALLOWED_FILES[fileId];
  if (!fileConfig) {
    return new NextResponse("File not found", { status: 404 });
  }

  const vpsUrl = `${VPS_BASE_URL}/${fileConfig.filename}`;
  const headers: HeadersInit = {};

  if (CF_ACCESS_CLIENT_ID && CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = CF_ACCESS_CLIENT_SECRET;
  }

  try {
    const response = await fetch(vpsUrl, { headers });

    if (!response.ok) {
      console.error(`VPS fetch failed: ${response.status} for ${vpsUrl}`);
      return new NextResponse("File not found", { status: 404 });
    }

    const blob = await response.blob();

    return new NextResponse(blob, {
      headers: {
        "Content-Type": fileConfig.contentType,
        "Content-Disposition": `attachment; filename="${fileConfig.filename}"`,
        "Content-Length": blob.size.toString(),
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return new NextResponse("Download failed", { status: 500 });
  }
}
