import { describe, expect, it } from "vitest";

import { mapTransfersToMoves, transfersForEvent } from "./gwTransfers";

describe("gwTransfers", () => {
  it("filters transfers to one gameweek", () => {
    const rows = transfersForEvent(
      [
        { element_in: 1, element_out: 2, entry: 1, event: 1, time: "t" },
        { element_in: 3, element_out: 4, entry: 1, event: 2, time: "t" },
      ],
      2,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.element_in).toBe(3);
  });

  it("maps element ids to player names", () => {
    const names = new Map([
      [565, "M.Sangaré"],
      [481, "Anderson"],
    ]);
    expect(
      mapTransfersToMoves(
        [{ element_in: 565, element_out: 481, entry: 1, event: 2, time: "t" }],
        names,
      ),
    ).toEqual([{ playerIn: "M.Sangaré", playerOut: "Anderson" }]);
  });
});
