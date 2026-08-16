import { createHash, createHmac, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

const COOKIE_NAME = "sel_planner_session";
const SESSION_SALT = "sel-planner-v1";

export function plannerConfigured(): boolean {
  return Boolean(process.env.PLANNER_SECRET?.trim());
}

function sessionToken(): string | null {
  const secret =
    process.env.AUTH_SECRET?.trim() || process.env.PLANNER_SECRET?.trim();
  if (!secret) return null;
  return createHmac("sha256", secret).update(SESSION_SALT).digest("hex");
}

export function verifyPlannerPassword(password: string): boolean {
  const expected = process.env.PLANNER_SECRET?.trim();
  if (!expected || !password) return false;

  const hash = (value: string) => createHash("sha256").update(value).digest();
  try {
    return timingSafeEqual(hash(password), hash(expected));
  } catch {
    return false;
  }
}

export async function isPlannerAuthenticated(): Promise<boolean> {
  const token = sessionToken();
  if (!token) return false;

  const cookie = (await cookies()).get(COOKIE_NAME);
  if (!cookie?.value) return false;

  try {
    return timingSafeEqual(Buffer.from(cookie.value), Buffer.from(token));
  } catch {
    return false;
  }
}

export async function setPlannerSession(): Promise<void> {
  const token = sessionToken();
  if (!token) {
    throw new Error("PLANNER_SECRET or AUTH_SECRET must be set");
  }

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/planner",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearPlannerSession(): Promise<void> {
  (await cookies()).set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/planner",
    maxAge: 0,
  });
}
