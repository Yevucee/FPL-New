import { NextResponse } from "next/server";

import { isPlannerAuthenticated } from "@/lib/plannerAuth";
import { plannerEntryId } from "@/lib/plannerConfig";
import {
  activeSeasonId,
  getOrCreateProfile,
  getReferenceScreenshotData,
} from "@/server/plannerRepository";

export const dynamic = "force-dynamic";

/** Private reference screenshot — requires planner session cookie. */
export async function GET() {
  if (!(await isPlannerAuthenticated())) {
    return new NextResponse(null, { status: 401 });
  }

  const seasonId = await activeSeasonId();
  if (!seasonId) {
    return new NextResponse(null, { status: 404 });
  }

  const profile = await getOrCreateProfile(seasonId, plannerEntryId());
  const data = await getReferenceScreenshotData(profile.id);
  if (!data) {
    return new NextResponse(null, { status: 404 });
  }

  const bytes = Buffer.from(data.base64, "base64");
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": data.mime,
      "Cache-Control": "private, no-store",
    },
  });
}
