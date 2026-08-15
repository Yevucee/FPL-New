import { readFile } from "node:fs/promises";
import path from "node:path";

import { leagueSnapshotSchema, type LeagueSnapshot } from "@/contracts/snapshot";

import type { FantasyDataProvider } from "./types";

/**
 * ManualProvider — reads a league snapshot JSON written by scripts/fetch-fpl-league.ts
 * or uploaded by hand. Used for live-season refresh without coupling the web app to FPL.
 */
export class ManualProvider implements FantasyDataProvider {
  readonly name = "manual";

  private readonly file: string;

  constructor(file?: string) {
    this.file =
      file ??
      process.env.SNAPSHOT_PATH ??
      path.join(process.cwd(), "data/league-snapshot.json");
  }

  async getLeagueSnapshot(): Promise<LeagueSnapshot> {
    const raw = await readFile(this.file, "utf8");
    const json: unknown = JSON.parse(raw);
    return leagueSnapshotSchema.parse(json);
  }
}
