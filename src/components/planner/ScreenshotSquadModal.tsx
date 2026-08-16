"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  clearReferenceScreenshotAction,
  saveDraftSquadAction,
  uploadReferenceScreenshotAction,
} from "@/app/planner/plannerActions";
import { Card } from "@/components/ui/Card";
import type { PlannerElement, SquadPlayer } from "@/planner/types";
import { validateSquad } from "@/planner/squadValidation";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface ManualSquadBuilderProps {
  catalog: PlannerElement[];
  initialPlayers: SquadPlayer[];
  initialBankTenths: number | null;
  initialFreeTransfers: number | null;
  onSaved: () => void;
}

export function ManualSquadBuilder({
  catalog,
  initialPlayers,
  initialBankTenths,
  initialFreeTransfers,
  onSaved,
}: ManualSquadBuilderProps) {
  const [players, setPlayers] = useState<SquadPlayer[]>(initialPlayers);
  const [bank, setBank] = useState(
    initialBankTenths != null ? String(initialBankTenths / 10) : "",
  );
  const [freeTransfers, setFreeTransfers] = useState(
    initialFreeTransfers != null ? String(initialFreeTransfers) : "",
  );
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const elementMap = useMemo(() => new Map(catalog.map((e) => [e.id, e])), [catalog]);

  const validation = useMemo(
    () =>
      validateSquad({
        players,
        elements: elementMap,
        bankTenths: bank ? Math.round(parseFloat(bank) * 10) : null,
      }),
    [players, elementMap, bank],
  );

  const owned = new Set(players.map((p) => p.elementId));

  const filteredCatalog = catalog.filter((p) => {
    if (owned.has(p.id)) return false;
    if (!search.trim()) return false;
    return p.webName.toLowerCase().includes(search.toLowerCase());
  });

  function addPlayer(element: PlannerElement) {
    if (players.length >= 15) return;
    setPlayers((prev) => [
      ...prev,
      {
        elementId: element.id,
        slot: prev.length + 1,
        isStarter: prev.filter((x) => x.isStarter).length < 11,
        isCaptain: false,
        isViceCaptain: false,
        sellPriceTenths: null,
      },
    ]);
    setSearch("");
  }

  function removePlayer(elementId: number) {
    setPlayers((prev) =>
      prev
        .filter((p) => p.elementId !== elementId)
        .map((p, i) => ({ ...p, slot: i + 1 })),
    );
  }

  function updatePlayer(elementId: number, patch: Partial<SquadPlayer>) {
    setPlayers((prev) =>
      prev.map((p) => {
        if (p.elementId !== elementId) {
          if (patch.isCaptain) return { ...p, isCaptain: false };
          if (patch.isViceCaptain) return { ...p, isViceCaptain: false };
          return p;
        }
        return { ...p, ...patch };
      }),
    );
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveDraftSquadAction({
        players,
        bankOverrideTenths: bank ? Math.round(parseFloat(bank) * 10) : null,
        freeTransfersOverride: freeTransfers ? parseInt(freeTransfers, 10) : null,
      });
      if (result.ok) onSaved();
      else {
        setError(
          result.errors?.map((e) => e.message).join(" ") ?? result.error ?? "Save failed",
        );
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Bank (£m)</span>
          <input
            type="number"
            step="0.1"
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="From screenshot"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Free transfers</span>
          <input
            type="number"
            value={freeTransfers}
            onChange={(e) => setFreeTransfers(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="If known"
          />
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium">Add player</label>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search FPL player name…"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        {search.trim() && (
          <ul className="mt-2 max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white text-sm">
            {filteredCatalog.slice(0, 12).map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => addPlayer(p)}
                  className="flex w-full justify-between px-3 py-2 hover:bg-slate-50"
                >
                  <span>
                    {p.webName} · {p.position}
                  </span>
                  <span className="text-slate-500">£{(p.priceTenths / 10).toFixed(1)}m</span>
                </button>
              </li>
            ))}
            {filteredCatalog.length === 0 && (
              <li className="px-3 py-2 text-slate-500">No matches</li>
            )}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-slate-200">
        <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-500">
          Squad ({players.length}/15)
        </div>
        {players.length === 0 ? (
          <p className="px-3 py-4 text-sm text-slate-500">
            Add players while looking at your screenshot.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {players.map((p) => {
              const el = elementMap.get(p.elementId);
              return (
                <li key={p.elementId} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <span className="min-w-[6rem] font-medium">{el?.webName ?? `#${p.elementId}`}</span>
                  <span className="text-slate-500">{el?.position}</span>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={p.isStarter}
                      onChange={(e) => updatePlayer(p.elementId, { isStarter: e.target.checked })}
                    />
                    XI
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="captain"
                      checked={p.isCaptain}
                      onChange={() =>
                        setPlayers((prev) =>
                          prev.map((x) => ({
                            ...x,
                            isCaptain: x.elementId === p.elementId,
                          })),
                        )
                      }
                    />
                    C
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name="vice"
                      checked={p.isViceCaptain}
                      onChange={() =>
                        setPlayers((prev) =>
                          prev.map((x) => ({
                            ...x,
                            isViceCaptain: x.elementId === p.elementId,
                          })),
                        )
                      }
                    />
                    V
                  </label>
                  <button
                    type="button"
                    onClick={() => removePlayer(p.elementId)}
                    className="ml-auto text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!validation.valid && validation.errors.length > 0 && (
        <p className="text-sm text-amber-700">
          {validation.errors.map((e) => e.message).join(" ")}
        </p>
      )}

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="button"
        disabled={pending || !validation.valid}
        onClick={handleSave}
        className="w-full rounded-full bg-swiss-700 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {pending ? "Saving private draft…" : "Save private draft"}
      </button>
    </div>
  );
}

interface ScreenshotSquadModalProps {
  workspace: PlannerWorkspace;
  onClose: () => void;
}

export function ScreenshotSquadModal({ workspace, onClose }: ScreenshotSquadModalProps) {
  const router = useRouter();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [visionNote, setVisionNote] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [suggestion, setSuggestion] = useState<{
    players: SquadPlayer[];
    bankTenths: number | null;
    freeTransfers: number | null;
    notes: string;
  } | null>(null);

  const initialPlayers =
    suggestion?.players ??
    workspace.squad.map((p) => ({
      elementId: p.elementId,
      slot: p.slot,
      isStarter: p.isStarter,
      isCaptain: p.isCaptain,
      isViceCaptain: p.isViceCaptain,
      sellPriceTenths: p.sellPriceTenths,
    }));

  const initialBank = suggestion?.bankTenths ?? workspace.summary.bankTenths;
  const initialFt = suggestion?.freeTransfers ?? workspace.summary.freeTransfers;

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setVisionNote(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("screenshot", file);
      formData.set("tryVision", workspace.visionParseAvailable ? "true" : "false");
      const result = await uploadReferenceScreenshotAction(formData);
      if (!result.ok) {
        setUploadError(result.error ?? "Upload failed");
        return;
      }
      if (result.suggestion) {
        setSuggestion(result.suggestion);
        setVisionNote(result.suggestion.notes);
      } else if (result.visionError) {
        setVisionNote(result.visionError);
      }
      router.refresh();
    });
  }

  function handleClearScreenshot() {
    startTransition(async () => {
      await clearReferenceScreenshotAction();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-2 sm:items-center sm:p-4">
      <Card className="flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Import squad from screenshot</h2>
            <p className="mt-1 text-xs text-amber-800">
              Private only — stored in your planner database, never sent to FPL.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-3 py-1 text-sm text-slate-500 ring-1 ring-slate-200"
          >
            Close
          </button>
        </div>

        <div className="grid flex-1 gap-6 overflow-y-auto py-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Upload screenshot</label>
              <p className="text-xs text-slate-500">
                Pick Team or squad view · JPEG/PNG/WebP · max 4 MB
              </p>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={pending}
                onChange={handleUpload}
                className="mt-2 block w-full text-sm"
              />
              {uploadError && <p className="mt-2 text-sm text-red-700">{uploadError}</p>}
              {visionNote && <p className="mt-2 text-sm text-slate-600">{visionNote}</p>}
              {!workspace.visionParseAvailable && (
                <p className="mt-2 text-xs text-slate-500">
                  Auto-read is off — add players manually using your screenshot as reference. Optional: set{" "}
                  <code className="rounded bg-slate-100 px-1">PLANNER_VISION_API_URL</code> for suggestions.
                </p>
              )}
            </div>

            {workspace.referenceScreenshot.hasScreenshot && workspace.referenceScreenshot.imagePath && (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-700">Your screenshot</p>
                  <button
                    type="button"
                    onClick={handleClearScreenshot}
                    disabled={pending}
                    className="text-xs text-slate-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={workspace.referenceScreenshot.imagePath}
                  alt="Uploaded FPL squad screenshot"
                  className="max-h-[420px] w-full rounded-lg border border-slate-200 object-contain bg-slate-50"
                />
                {workspace.referenceScreenshot.uploadedAt && (
                  <p className="mt-1 text-xs text-slate-500">
                    Uploaded{" "}
                    {new Date(workspace.referenceScreenshot.uploadedAt).toLocaleString("en-GB")}
                  </p>
                )}
              </div>
            )}
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-slate-800">Build your private draft</p>
            {workspace.players.catalog.length === 0 ? (
              <p className="text-sm text-slate-600">
                Player catalog unavailable — FPL bootstrap could not be loaded. Try again shortly.
              </p>
            ) : (
              <ManualSquadBuilder
                catalog={workspace.players.catalog}
                initialPlayers={initialPlayers}
                initialBankTenths={initialBank}
                initialFreeTransfers={initialFt}
                onSaved={() => {
                  onClose();
                  router.refresh();
                }}
              />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}
