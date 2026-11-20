import { NextRequest, NextResponse } from "next/server";
import { fetchVps } from "../../shared/audio-utils";

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

  const fileConfig = ALLOWED_FILES[fileId];
  if (!fileConfig) {
    return new NextResponse("File not found", { status: 404 });
  }

  try {
    const response = await fetchVps(fileConfig.filename);

    if (!response.ok) {
      console.error(`VPS fetch failed: ${response.status} for ${fileConfig.filename}`);
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
