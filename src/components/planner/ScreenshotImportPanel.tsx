import { Card } from "@/components/ui/Card";
import type { PlannerWorkspace } from "@/server/plannerWorkspace";

interface ScreenshotImportPanelProps {
  workspace: PlannerWorkspace;
  onOpenImport: () => void;
}

export function ScreenshotImportPanel({ workspace, onOpenImport }: ScreenshotImportPanelProps) {
  const showProminent =
    workspace.setupRequired ||
    workspace.header.dataState === "preseason" ||
    !workspace.header.samuelEntryId;

  if (!showProminent && workspace.referenceScreenshot.hasScreenshot) {
    return null;
  }

  return (
    <Card
      padding="md"
      className="border-swiss-200 bg-gradient-to-br from-swiss-50/60 to-white"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Pre-season squad import</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Upload a screenshot of your FPL team and build a private draft squad — ideal before the
            season is live or when you don&apos;t have an entry ID yet. Nothing is submitted to FPL.
          </p>
          {workspace.referenceScreenshot.hasScreenshot && (
            <p className="mt-2 text-xs font-medium text-pitch-700">
              Screenshot saved — continue editing your draft or upload a new one.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onOpenImport}
          className="rounded-full bg-swiss-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-swiss-800"
        >
          {workspace.referenceScreenshot.hasScreenshot ? "Edit from screenshot" : "Upload screenshot"}
        </button>
      </div>
    </Card>
  );
}
