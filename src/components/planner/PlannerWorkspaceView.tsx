"use client";

import { useState } from "react";

import { PlannerHeader } from "@/components/planner/PlannerHeader";
import { PlannerTabs, type PlannerTabId } from "@/components/planner/PlannerTabs";
import { Badge } from "@/components/ui/Badge";
import { Card, CardLabel } from "@/components/ui/Card";
import { formatChipName, SEASON_CHIP_TYPES } from "@/lib/chipLabels";
import { PLANNER_SCORE_FORMULA } from "@/planner/plannerScore";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

import { OverviewTab } from "./tabs/OverviewTab";
import { TransfersTab } from "./tabs/TransfersTab";
import { SelectionTab } from "./tabs/SelectionTab";
import { RivalsTab } from "./tabs/RivalsTab";
import { ChipsTab } from "./tabs/ChipsTab";
import { PlayersTab } from "./tabs/PlayersTab";
import { SquadEditModal } from "./SquadEditModal";
import { ScreenshotSquadModal } from "./ScreenshotSquadModal";
import { ScreenshotImportPanel } from "./ScreenshotImportPanel";

interface PlannerWorkspaceViewProps {
  workspace: PlannerWorkspace;
  activeTab: PlannerTabId;
  lockForm?: React.ReactNode;
}

export function PlannerWorkspaceView({
  workspace,
  activeTab,
  lockForm,
}: PlannerWorkspaceViewProps) {
  const [editOpen, setEditOpen] = useState(false);
  const [screenshotOpen, setScreenshotOpen] = useState(false);

  return (
    <div className="space-y-6">
      <PlannerHeader
        workspace={workspace}
        lockForm={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setScreenshotOpen(true)}
              className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-swiss-800 ring-1 ring-swiss-200 hover:bg-swiss-50"
            >
              Import screenshot
            </button>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="rounded-full bg-swiss-700 px-4 py-2 text-sm font-semibold text-white hover:bg-swiss-800"
            >
              Edit squad
            </button>
            {lockForm}
          </div>
        }
      />

      <ScreenshotImportPanel workspace={workspace} onOpenImport={() => setScreenshotOpen(true)} />

      <PlannerTabs active={activeTab} />

      {activeTab === "overview" && <OverviewTab workspace={workspace} />}
      {activeTab === "transfers" && <TransfersTab workspace={workspace} />}
      {activeTab === "selection" && <SelectionTab workspace={workspace} />}
      {activeTab === "rivals" && <RivalsTab workspace={workspace} />}
      {activeTab === "chips" && <ChipsTab workspace={workspace} />}
      {activeTab === "players" && <PlayersTab workspace={workspace} />}

      {editOpen && (
        <SquadEditModal workspace={workspace} onClose={() => setEditOpen(false)} />
      )}

      {screenshotOpen && (
        <ScreenshotSquadModal workspace={workspace} onClose={() => setScreenshotOpen(false)} />
      )}
    </div>
  );
}

/** Legacy chips/ownership block preserved inside Chips tab — re-export for tests */
export { formatChipName, SEASON_CHIP_TYPES, PLANNER_SCORE_FORMULA };
