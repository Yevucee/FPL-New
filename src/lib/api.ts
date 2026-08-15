import { NextResponse } from "next/server";

/**
 * Consistent API envelope (specification section 11): { data, meta, error }.
 */
export function ok<T>(data: T, meta: Record<string, unknown> = {}) {
  return NextResponse.json({
    data,
    meta: { generatedAt: new Date().toISOString(), ...meta },
    error: null,
  });
}

export function fail(code: string, message: string, status = 400) {
  return NextResponse.json(
    { data: null, meta: { generatedAt: new Date().toISOString() }, error: { code, message } },
    { status },
  );
}
