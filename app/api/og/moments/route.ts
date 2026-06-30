import { renderOgMoment } from "../../shared/moments";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  return renderOgMoment();
}
