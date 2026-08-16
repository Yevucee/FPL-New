"use client";

import { useState, useTransition } from "react";

import { saveDraftSquadAction } from "@/app/planner/plannerActions";
import { Card } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface SquadEditModalProps {
  workspace: PlannerWorkspace;
  onClose: () => void;
}

export function SquadEditModal({ workspace, onClose }: SquadEditModalProps) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [bank, setBank] = useState(
    workspace.summary.bankTenths != null ? String(workspace.summary.bankTenths / 10) : "",
  );
  const [freeTransfers, setFreeTransfers] = useState(
    workspace.summary.freeTransfers != null ? String(workspace.summary.freeTransfers) : "",
  );

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveDraftSquadAction({
        players: workspace.squad.map((p) => ({
          elementId: p.elementId,
          slot: p.slot,
          isStarter: p.isStarter,
          isCaptain: p.isCaptain,
          isViceCaptain: p.isViceCaptain,
          sellPriceTenths: p.sellPriceTenths,
        })),
        bankOverrideTenths: bank ? Math.round(parseFloat(bank) * 10) : null,
        freeTransfersOverride: freeTransfers ? parseInt(freeTransfers, 10) : null,
      });
      if (result.ok) {
        onClose();
        window.location.reload();
      } else {
        setError(result.errors?.map((e) => e.message).join(" ") ?? result.error ?? "Save failed");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <Card className="max-h-[90vh] w-full max-w-lg overflow-y-auto">
        <h2 className="text-lg font-bold text-slate-900">Edit private draft</h2>
        <p className="mt-1 text-xs text-amber-800">
          Changes are saved locally in PostgreSQL — never submitted to FPL.
        </p>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="font-medium">Bank override (£m)</span>
            <input
              type="number"
              step="0.1"
              value={bank}
              onChange={(e) => setBank(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Unknown"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Free transfers override</span>
            <input
              type="number"
              value={freeTransfers}
              onChange={(e) => setFreeTransfers(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="Unknown"
            />
          </label>
        </div>

        {!workspace.squadValidation.valid && (
          <p className="mt-3 text-sm text-amber-700">
            Validation: {workspace.squadValidation.errors.map((e) => e.message).join("; ")}
          </p>
        )}

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={handleSave}
            className="rounded-full bg-swiss-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save draft"}
          </button>
        </div>
      </Card>
    </div>
  );
}
