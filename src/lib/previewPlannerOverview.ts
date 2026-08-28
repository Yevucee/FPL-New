import type { PlannerOverview } from "@/server/plannerData";

/** Sample planner data for /planner/preview during pre-season. */
export function previewPlannerOverview(): PlannerOverview {
  const managers = [
    { name: "Samuel Polley", team: "Yevu Athletic" },
    { name: "Marco Löffel Diaz", team: "Real Rapperswil" },
    { name: "Stephan Ruoss", team: "FLYING BURRITOS*" },
    { name: "David Nadig", team: "The Superstorms**" },
    { name: "Roland Christandl", team: "Anti Haaland Brigade" },
    { name: "Pascal Kaiser", team: "Kaiser Chiefs FC" },
    { name: "Chris Meier", team: "Meier's XI" },
  ] as const;

  return {
    seasonName: "2026/27",
    eventNumber: 12,
    managerCount: managers.length,
    mostOwned: [
      { elementId: 1, webName: "Haaland", ownerCount: 6, ownerPct: 86 },
      { elementId: 2, webName: "Salah", ownerCount: 5, ownerPct: 71 },
      { elementId: 3, webName: "Gabriel", ownerCount: 5, ownerPct: 71 },
      { elementId: 4, webName: "Palmer", ownerCount: 4, ownerPct: 57 },
      { elementId: 5, webName: "Watkins", ownerCount: 4, ownerPct: 57 },
      { elementId: 6, webName: "Saka", ownerCount: 3, ownerPct: 43 },
      { elementId: 7, webName: "Bruno F.", ownerCount: 3, ownerPct: 43 },
      { elementId: 8, webName: "Son", ownerCount: 2, ownerPct: 29 },
      { elementId: 9, webName: "Trippier", ownerCount: 2, ownerPct: 29 },
      { elementId: 10, webName: "Ederson", ownerCount: 2, ownerPct: 29 },
      { elementId: 11, webName: "Gordon", ownerCount: 1, ownerPct: 14 },
      { elementId: 12, webName: "Murillo", ownerCount: 1, ownerPct: 14 },
      { elementId: 13, webName: "Bowen", ownerCount: 1, ownerPct: 14 },
      { elementId: 14, webName: "Mbeumo", ownerCount: 1, ownerPct: 14 },
      { elementId: 15, webName: "Wissa", ownerCount: 1, ownerPct: 14 },
    ],
    differentials: [
      { elementId: 11, webName: "Gordon", ownerCount: 1, ownerPct: 14 },
      { elementId: 12, webName: "Murillo", ownerCount: 1, ownerPct: 14 },
      { elementId: 13, webName: "Bowen", ownerCount: 1, ownerPct: 14 },
      { elementId: 8, webName: "Son", ownerCount: 2, ownerPct: 29 },
    ],
    chipsPlayed: [
      {
        managerName: "Marco Löffel Diaz",
        teamName: "Real Rapperswil",
        eventNumber: 11,
        chip: "3xc",
        chipLabel: "Triple Captain",
      },
      {
        managerName: "Roland Christandl",
        teamName: "Anti Haaland Brigade",
        eventNumber: 8,
        chip: "bboost",
        chipLabel: "Bench Boost",
      },
      {
        managerName: "Samuel Polley",
        teamName: "Yevu Athletic",
        eventNumber: 5,
        chip: "wildcard",
        chipLabel: "Wildcard",
      },
    ],
    chipStatus: managers.map((manager, index) => ({
      managerName: manager.name,
      teamName: manager.team,
      used:
        index === 0
          ? { wildcard: 5 }
          : index === 1
            ? { "3xc": 11 }
            : index === 4
              ? { bboost: 8 }
              : {},
      remaining:
        index === 0
          ? (["bboost", "3xc", "freehit"] as const)
          : index === 1
            ? (["wildcard", "bboost", "freehit"] as const)
            : index === 4
              ? (["wildcard", "3xc", "freehit"] as const)
              : (["wildcard", "bboost", "3xc", "freehit"] as const),
    })),
    captainPicks: managers.map((manager, index) => ({
      managerName: manager.name,
      teamName: manager.team,
      captainName: ["Haaland", "Salah", "Palmer", "Son", "Saka", "Bruno F.", "Watkins"][index] ?? null,
      captainPoints: [24, 18, 14, 12, 8, 6, 2][index] ?? null,
    })),
    gwTransfers: [
      {
        managerName: "Roland Christandl",
        teamName: "Anti Haaland Brigade",
        transferCount: 1,
        hitPoints: 0,
        moves: [{ playerOut: "Anderson", playerIn: "M.Sangaré" }],
      },
      {
        managerName: "Marco Löffel Diaz",
        teamName: "Real Rapperswil",
        transferCount: 2,
        hitPoints: 4,
        moves: [
          { playerOut: "Son", playerIn: "Gordon" },
          { playerOut: "Murillo", playerIn: "Timber" },
        ],
      },
      {
        managerName: "Samuel Polley",
        teamName: "Yevu Athletic",
        transferCount: 1,
        hitPoints: 0,
        moves: [{ playerOut: "Watkins", playerIn: "Wissa" }],
      },
      ...managers
        .filter(
          (manager) =>
            !["Roland Christandl", "Marco Löffel Diaz", "Samuel Polley"].includes(
              manager.name,
            ),
        )
        .map((manager) => ({
          managerName: manager.name,
          teamName: manager.team,
          transferCount: 0,
          hitPoints: 0,
          moves: [],
        })),
    ],
  };
}
