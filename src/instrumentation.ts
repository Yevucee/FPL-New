/**
 * Next.js server bootstrap — start the in-process sync watcher on Railway web.
 * Background shell jobs (`&`) do not survive reliably; this runs in the main Node process.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NODE_ENV !== "production") return;
  if (process.env.DISABLE_SYNC_WATCH === "1") return;
  if (!process.env.LEAGUE_PROVIDER_ID?.trim()) return;

  const { startSyncWatch } = await import("./jobs/syncWatch");
  startSyncWatch();
}
