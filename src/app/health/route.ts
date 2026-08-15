import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Liveness probe (specification section 17): checks the process is up. It must
 * not touch the database or leak credentials.
 */
export async function GET() {
  return NextResponse.json({ status: "ok", uptime: process.uptime() });
}
