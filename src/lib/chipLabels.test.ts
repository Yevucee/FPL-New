import { describe, expect, it } from "vitest";

import { formatChipName } from "./chipLabels";

describe("formatChipName", () => {
  it("maps FPL chip codes to readable labels", () => {
    expect(formatChipName("bboost")).toBe("Bench Boost");
    expect(formatChipName("3xc")).toBe("Triple Captain");
    expect(formatChipName("wildcard")).toBe("Wildcard");
  });
});
