import {
  fetchEntryTransfers,
  playerNameMap,
  sleep,
  type FplTransfer,
} from "./client";

export interface GwTransferMove {
  playerIn: string;
  playerOut: string;
}

export interface GwTransferRow {
  managerName: string;
  teamName: string;
  transferCount: number;
  hitPoints: number;
  moves: GwTransferMove[];
}

export function transfersForEvent(
  transfers: ReadonlyArray<FplTransfer>,
  eventNumber: number,
): FplTransfer[] {
  return transfers.filter((row) => row.event === eventNumber);
}

export function mapTransfersToMoves(
  transfers: ReadonlyArray<FplTransfer>,
  playerNames: ReadonlyMap<number, string>,
): GwTransferMove[] {
  return transfers.map((row) => ({
    playerIn: playerNames.get(row.element_in) ?? `#${row.element_in}`,
    playerOut: playerNames.get(row.element_out) ?? `#${row.element_out}`,
  }));
}

export async function loadGwTransfers(args: {
  eventNumber: number;
  members: ReadonlyArray<{
    providerEntryId: string;
    managerName: string;
    teamName: string;
    hitPoints?: number;
  }>;
  playerNames: ReadonlyMap<number, string>;
}): Promise<GwTransferRow[]> {
  const rows: GwTransferRow[] = [];

  for (const [index, member] of args.members.entries()) {
    if (index > 0) await sleep(120);
    let transfers: FplTransfer[] = [];
    try {
      transfers = await fetchEntryTransfers(member.providerEntryId);
    } catch {
      transfers = [];
    }

    const eventTransfers = transfersForEvent(transfers, args.eventNumber);
    rows.push({
      managerName: member.managerName,
      teamName: member.teamName,
      transferCount: eventTransfers.length,
      hitPoints: member.hitPoints ?? 0,
      moves: mapTransfersToMoves(eventTransfers, args.playerNames),
    });
  }

  return rows.sort((a, b) => {
    if (b.transferCount !== a.transferCount) return b.transferCount - a.transferCount;
    return a.managerName.localeCompare(b.managerName);
  });
}
