import type { PlannerElement, SquadPlayer } from "@/planner/types";

export interface ScreenshotSquadSuggestion {
  players: SquadPlayer[];
  bankTenths: number | null;
  freeTransfers: number | null;
  unmatchedNames: string[];
  notes: string;
}

export interface VisionParseResult {
  ok: boolean;
  suggestion?: ScreenshotSquadSuggestion;
  rawResponse?: string;
  error?: string;
}

function visionConfigured(): boolean {
  return Boolean(process.env.PLANNER_VISION_API_URL?.trim());
}

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

export function matchPlayerName(
  name: string,
  catalog: ReadonlyArray<PlannerElement>,
): PlannerElement | null {
  const norm = normalizeName(name);
  if (!norm) return null;

  const exact = catalog.find((p) => normalizeName(p.webName) === norm);
  if (exact) return exact;

  const partial = catalog.filter(
    (p) => normalizeName(p.webName).includes(norm) || norm.includes(normalizeName(p.webName)),
  );
  if (partial.length === 1) return partial[0]!;
  return null;
}

interface ParsedVisionJson {
  starters?: string[];
  bench?: string[];
  captain?: string;
  viceCaptain?: string;
  bank?: number | null;
  freeTransfers?: number | null;
}

function extractJson(text: string): ParsedVisionJson | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence?.[1]?.trim() ?? text.trim();
  try {
    return JSON.parse(candidate) as ParsedVisionJson;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1)) as ParsedVisionJson;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function buildSquadFromVisionJson(
  parsed: ParsedVisionJson,
  catalog: ReadonlyArray<PlannerElement>,
): ScreenshotSquadSuggestion {
  const starterNames = parsed.starters ?? [];
  const benchNames = parsed.bench ?? [];
  const allNames = [...starterNames, ...benchNames];
  const unmatchedNames: string[] = [];
  const matched: Array<{ element: PlannerElement; isStarter: boolean }> = [];

  for (const name of starterNames) {
    const el = matchPlayerName(name, catalog);
    if (el) matched.push({ element: el, isStarter: true });
    else unmatchedNames.push(name);
  }
  for (const name of benchNames) {
    const el = matchPlayerName(name, catalog);
    if (el) matched.push({ element: el, isStarter: false });
    else unmatchedNames.push(name);
  }

  const captainEl = parsed.captain ? matchPlayerName(parsed.captain, catalog) : null;
  const viceEl = parsed.viceCaptain ? matchPlayerName(parsed.viceCaptain, catalog) : null;
  if (parsed.captain && !captainEl) unmatchedNames.push(parsed.captain);
  if (parsed.viceCaptain && !viceEl) unmatchedNames.push(parsed.viceCaptain);

  const seen = new Set<number>();
  const players: SquadPlayer[] = [];
  matched.forEach(({ element, isStarter }, index) => {
    if (seen.has(element.id)) return;
    seen.add(element.id);
    players.push({
      elementId: element.id,
      slot: index + 1,
      isStarter,
      isCaptain: captainEl?.id === element.id,
      isViceCaptain: viceEl?.id === element.id,
      sellPriceTenths: null,
    });
  });

  const bankTenths =
    parsed.bank != null && !Number.isNaN(parsed.bank)
      ? Math.round(parsed.bank * 10)
      : null;
  const freeTransfers =
    parsed.freeTransfers != null && !Number.isNaN(parsed.freeTransfers)
      ? Math.round(parsed.freeTransfers)
      : null;

  return {
    players,
    bankTenths,
    freeTransfers,
    unmatchedNames: [...new Set(unmatchedNames)],
    notes:
      players.length === 0
        ? "No players matched — use the manual builder while referring to your screenshot."
        : players.length < 15
          ? `Matched ${players.length}/15 players — add the rest manually.`
          : "Review starters, captain, and bench order before saving.",
  };
}

export async function suggestSquadFromScreenshot(args: {
  base64: string;
  mime: string;
  catalog: ReadonlyArray<PlannerElement>;
}): Promise<VisionParseResult> {
  if (!visionConfigured()) {
    return {
      ok: false,
      error:
        "Automatic read is not configured. Upload saved — build your squad manually using the screenshot as reference.",
    };
  }

  const baseUrl = process.env.PLANNER_VISION_API_URL!.trim().replace(/\/$/, "");
  const apiKey = process.env.PLANNER_VISION_API_KEY?.trim() || "local";
  const model = process.env.PLANNER_VISION_MODEL?.trim() || "local-8b";
  const dataUrl = `data:${args.mime};base64,${args.base64}`;

  const systemPrompt = `You extract Fantasy Premier League squad data from screenshots.
Return ONLY valid JSON with this shape:
{
  "starters": ["Player A", ...11 names],
  "bench": ["Player B", ...4 names in bench order],
  "captain": "Name",
  "viceCaptain": "Name",
  "bank": 1.5,
  "freeTransfers": 1
}
Use short FPL web names when visible. Use null for bank/freeTransfers if not shown.`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the 15-player FPL squad from this screenshot.",
              },
              {
                type: "image_url",
                image_url: { url: dataUrl },
              },
            ],
          },
        ],
        temperature: 0,
      }),
    });

    if (!res.ok) {
      return {
        ok: false,
        error: `Vision API returned ${res.status}. Build your squad manually using the screenshot.`,
      };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const rawResponse = data.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(rawResponse);
    if (!parsed) {
      return {
        ok: false,
        rawResponse,
        error: "Could not parse squad from screenshot — add players manually.",
      };
    }

    const suggestion = buildSquadFromVisionJson(parsed, args.catalog);
    return { ok: true, suggestion, rawResponse };
  } catch {
    return {
      ok: false,
      error: "Vision API unavailable. Build your squad manually using the screenshot.",
    };
  }
}

export function isVisionParseAvailable(): boolean {
  return visionConfigured();
}
