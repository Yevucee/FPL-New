import { readFile } from "node:fs/promises";
import path from "node:path";

import { leagueSnapshotSchema, type LeagueSnapshot } from "@/contracts/snapshot";

import type { FantasyDataProvider } from "./types";

/**
 * FixtureProvider — recorded/synthetic sample data for tests and local
 * development (specification section 2). It never contacts FPL, so the whole
 * application can be built and demonstrated without touching a live source.
 */
export class FixtureProvider implements FantasyDataProvider {
  readonly name = "fixtures";

  private readonly file: string;

  constructor(file?: string) {
    this.file =
      file ??
      path.join(process.cwd(), "src/providers/fixtures/data/league-2026-27.json");
  }

  async getLeagueSnapshot(): Promise<LeagueSnapshot> {
    const raw = await readFile(this.file, "utf8");
    const json: unknown = JSON.parse(raw);
    // Validate at the boundary: required fields enforced, unknown fields kept.
    return leagueSnapshotSchema.parse(json);
  }
}
