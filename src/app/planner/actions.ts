"use server";

import { redirect } from "next/navigation";

import {
  clearPlannerSession,
  plannerConfigured,
  setPlannerSession,
  verifyPlannerPassword,
} from "@/lib/plannerAuth";

export async function loginPlannerAction(formData: FormData): Promise<void> {
  if (!plannerConfigured()) {
    redirect("/planner/login?error=not-configured");
  }

  const password = String(formData.get("password") ?? "");
  if (!verifyPlannerPassword(password)) {
    redirect("/planner/login?error=invalid");
  }

  await setPlannerSession();
  redirect("/planner");
}

export async function logoutPlannerAction(): Promise<void> {
  await clearPlannerSession();
  redirect("/planner/login");
}
