import { describe, expect, it, vi } from "vitest";

import { formatRelativeTime, formatSyncLabel } from "./formatTime";

describe("formatRelativeTime", () => {
  it("returns just now for recent timestamps", () => {
    const now = new Date("2026-08-16T12:00:00Z");
    const date = new Date("2026-08-16T11:59:30Z");
    expect(formatRelativeTime(date, now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const now = new Date("2026-08-16T12:00:00Z");
    const date = new Date("2026-08-16T11:48:00Z");
    expect(formatRelativeTime(date, now)).toBe("12 min ago");
  });
});

describe("formatSyncLabel", () => {
  it("includes relative and absolute parts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-16T12:00:00Z"));
    const date = new Date("2026-08-16T11:50:00Z");
    const label = formatSyncLabel(date);
    expect(label).toContain("10 min ago");
    vi.useRealTimers();
  });
});
