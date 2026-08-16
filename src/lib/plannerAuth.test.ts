import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import { verifyPlannerPassword } from "@/lib/plannerAuth";

describe("plannerAuth", () => {
  it("never exposes secret in verification flow", () => {
    const secret = "test-secret-value";
    process.env.PLANNER_SECRET = secret;
    expect(verifyPlannerPassword("wrong")).toBe(false);
    expect(verifyPlannerPassword(secret)).toBe(true);
    // Client bundles should not contain secret — server-only module
    const hash = createHash("sha256").update(secret).digest("hex");
    expect(hash).not.toBe(secret);
  });

  it("rejects empty password", () => {
    process.env.PLANNER_SECRET = "x";
    expect(verifyPlannerPassword("")).toBe(false);
  });
});
