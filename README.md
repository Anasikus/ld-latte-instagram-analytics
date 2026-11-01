# LD LATTE — Instagram Analytics Prototype

**Status: interactive offline demo (mock data), not a Meta API integration.**

A standalone static dashboard for the optional Instagram Analytics prototype. Built on top of the existing LD LATTE task-2 solution, which already contains the architecture, metric matrix, access prerequisites, implementation plan and testing plan.

## What works in the prototype

- Switch between **3 fictional Instagram professional accounts** (two active simulation profiles, one with a simulated expired token), or select all accounts.
- Pick **7 / 30 / 90 days**, see follower snapshots, account-level views, reach and sample posts.
- Switch the trends chart between **views and reach** and inspect the breakdown by account.
- Inspect **individual publications** and explicitly unavailable metrics (`—`, not zero).
- Run a **simulated sync**: store/upsert per-account daily snapshots in browser localStorage by `(connection_id, period_start, period)`. Re-running the sync updates existing keys rather than creating duplicates. Logs and demo snapshots persist across page reloads in the same browser.
- See a simulated `reconnect_required` error for a profile with an expired token.
- Export data to **CSV**, formatted with a BOM and semicolon delimiter for spreadsheet applications.
- Reset demo sync history and snapshots.
- View an architecture pipeline for the proposed real integration.

## Run

**Fastest:** unzip the archive and open `index.html` in your browser. No credentials, Node.js, database, hosting or npm packages are needed. The font will fall back to installed system fonts if Google Fonts is unreachable.

**Local server (optional):**

```powershell
cd ld-latte-instagram-analytics
python -m http.server 8765
```

Open `http://localhost:8765/`.

**Deploy separately from the existing LD LATTE website:** upload this directory (the folder containing `index.html`, `app.js`, `styles.css`) to [Netlify Drop](https://app.netlify.com/drop). **Do not run `npm run deploy` from the main React project**: that targets its existing GitHub Pages site.

## Demonstration (about 2 minutes)

1. Open the dashboard, change the period 30 → 7 → 90 days.
2. Change account **All → LATTE Design Studio → Nova Brand**. Note `—` for missing insights, not `0`.
3. Choose **All**, click **Update data**. The log records a successful upsert and a simulated expired-token warning.
4. Click **Update data** again. The log should show `+0` new snapshot keys for that period — idempotency.
5. Click **Export CSV**; open the report in Excel or LibreOffice.
6. Show the pipeline and explain which steps would be real Meta OAuth, n8n and Supabase.

## Real implementation (not included)

```
Professional IG account → official Meta OAuth → server-side token store
  → n8n Schedule Trigger → Instagram insights + media endpoints
  → normalize, record unavailable_reason, retry/backoff, pagination
  → Supabase upsert + RLS → dashboard / CSV / alerts
```

Official API access is limited to professional accounts and appropriate permissions. The final OAuth method, metric names and available periods must be validated for the chosen Meta Graph API version using authorized test accounts. The demo intentionally contains **no live Instagram OAuth, access tokens, Meta requests, Supabase database, real historical data or scraping**. The **Connect account** button shows a notice explaining this boundary.

See the [original LD LATTE Instagram Analytics design documentation](https://github.com/Anasikus/ld-latte-automation/tree/main/docs/instagram-analytics) for the complete architecture, permissions, metric matrix, implementation plan, and test plan.

## Demo data and semantics

- Every username includes `.demo` and is **fictional**.
- Followers: fictional latest-known snapshots, including the profile with a simulated token problem.
- Views: sum of available account views for the selected interval.
- Reach: sum of account reach values **not a deduplicated audience across accounts**.
- Missing insights: `null` / `—`; an error does not become a true zero.
- `localStorage` is **only a browser-side mock of an upsert store** — no data leaves the browser.

## Checklist

- [x] Source JS syntax checked with `node --check`.
- [x] Interactions, account switching, period filtering, simulated sync, empty insights and CSV tested in a headless Chromium browser.
- [x] Mobile viewport at 375px checked for overall horizontal overflow.
- [ ] Live Meta connection and OAuth — deliberately not implemented / not required by the original task.


## Repository structure

```text
index.html            # standalone static dashboard
styles.css            # responsive UI
app.js                # mock data, visualization, CSV, simulated sync
schema-proposal.sql   # proposed tables only — NOT an applied migration
README.md             # setup, limitations, demo steps
```

Deploy on GitHub Pages via **Settings → Pages → Deploy from a branch → main → /(root)**. No GitHub Actions, credentials, database, or build needed.
