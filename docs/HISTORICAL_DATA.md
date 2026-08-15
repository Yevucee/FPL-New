# Historical season data (official FPL)

Past Swiss Expert League tables come from two sources (best first):

## 1. Official past league IDs (authoritative)

FPL creates a **new private league ID each season**. Add each past ID:

```bash
LEAGUE_HISTORY_PROVIDER_IDS={"2025/26":"PAST_ID_HERE","2024/25":"..."}
```

Find IDs from old FPL links (WhatsApp, email, bookmarks):

`https://fantasy.premierleague.com/leagues/<PAST_ID>/standings/c`

Validate a candidate ID:

```bash
npx tsx scripts/validate-fpl-league-id.ts <PAST_ID> 2024/25
```

## 2. Reconstructed tables (automatic fallback)

When no past league ID is configured, the app **rebuilds final tables** from current
league members' official FPL season totals. For classic-scoring private leagues, this
matches the real league ranking when membership was stable.

Each import is **validated against `data/sel-champions.json`** (recorded from league chat).
If the top scorer doesn't match the recorded winner, that season is skipped.

Limitations:
- Managers who **left** the league won't appear
- Managers who **joined later** may appear with their global FPL totals even if they weren't in SEL that year
- Use official past league IDs when you have them

When **new players join** the current league, reconstructed archives refresh automatically
on the next cron sync (member count / roster change detected).

## Import / refresh

```bash
FPL_FORCE_HISTORY_IMPORT=1 FPL_SYNC_FORCE=1 npm run job:automated-sync
```

## Archive types

| Type | Source | GW scrolling |
|------|--------|--------------|
| **Full archive** | Live sync during the season | Yes |
| **Official summary** | Past FPL league ID standings | Final table only |
| **Reconstructed summary** | Current members' FPL totals | Final table only |

## Hall of champions

`data/sel-champions.json` — season winners (manager first names). Team names are filled
from imported FPL season archives on `/history`.

## URLs

| Path | Purpose |
|------|---------|
| `/history` | Champions hall + season tables |
| `/history/2024-25` | Season view |
