import { describe, expect, it } from "vitest";

import { isValidStartingFormation, positionFromId } from "./squadValidation";

describe("squadValidation", () => {
  it("maps FPL element types to positions", () => {
    expect(positionFromId(1)).toBe("GK");
    expect(positionFromId(2)).toBe("DEF");
    expect(positionFromId(3)).toBe("MID");
    expect(positionFromId(4)).toBe("FWD");
  });

  it("accepts a valid 4-4-2 style XI", () => {
    const starters = [
      { element: { position: "GK" as const } },
      ...Array.from({ length: 4 }, () => ({ element: { position: "DEF" as const } })),
      ...Array.from({ length: 4 }, () => ({ element: { position: "MID" as const } })),
      ...Array.from({ length: 2 }, () => ({ element: { position: "FWD" as const } })),
    ];
    expect(isValidStartingFormation(starters)).toBe(true);
  });

  it("rejects XIs without a goalkeeper", () => {
    const starters = Array.from({ length: 11 }, () => ({ element: { position: "DEF" as const } }));
    expect(isValidStartingFormation(starters)).toBe(false);
  });
});
