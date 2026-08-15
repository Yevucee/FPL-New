import { NextResponse } from "next/server";

import { sql } from "@/db/client";

export const dynamic = "force-dynamic";

/**
 * Readiness probe (specification section 17): checks required dependencies
 * (the database) without leaking connection details.
 */
export async function GET() {
  try {
    await sql`select 1`;
    return NextResponse.json({ status: "ready", database: "up" });
  } catch {
    return NextResponse.json(
      { status: "not-ready", database: "down" },
      { status: 503 },
    );
  }
}
