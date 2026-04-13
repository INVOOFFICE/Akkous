# Apps Script — `code.gs` (Akkous)

This folder contains the Google Apps Script code used with your Google Sheets workflow.  
It automates TheMealDB import, scheduling, Groq SEO enrichment, GitHub export (`recipes.json` + `sitemap.xml`), newsletter handling, and optional indexing tasks.

---

## Installation

1. Open your Google Sheet -> **Extensions** -> **Apps Script**.
2. Replace the main script content with `code.gs` from this repository.
3. Save the project.
4. Run `testFetch` once from the Apps Script editor and grant permissions.
5. Return to the sheet and refresh (`F5`) to load the custom menu.

If the script is standalone (not bound to the sheet), set `CONFIG.SHEET_ID`.

---

## Files in this folder

| File | Role |
|------|------|
| `code.gs` | Core logic (`CONFIG`, menu actions, API calls, export pipeline, triggers). |
| `AutomationDashboard.html` | Optional sidebar/report UI file for the Apps Script project. |
| `llms.txt` | Generated file listing all published recipes for AI search engines (ChatGPT, Perplexity, Google AI Overviews). Pushed automatically with each GitHub commit. |

---

## `Recipes` sheet schema

Expected columns (auto-created if needed):

`ID`, `Title`, `Category`, `Origin`, `Image URL`, `Ingredients`, `Instructions`, `Tags`, `Publish Date`, `Status`, `Slug`, `YouTube`, `Added Date`, `MetaDescription`.

- `Status` flow: `SCHEDULED` -> `PUBLISHED` when publish date/time is reached.
- GitHub export typically includes `PUBLISHED` rows only.

---

## Spreadsheet menu (Akkous)

Main actions include:
- fetch/import recipes;
- mark scheduled rows as published;
- export and push `recipes.json` + `sitemap.xml` + `llms.txt`;
- install/remove triggers;
- run optional SEO/newsletter/indexing helpers;
- run Groq enrichment on selected or scheduled rows.

---

## Daily automation (triggers)

- Default mode uses one chained trigger (`USE_CHAINED_PIPELINE_TRIGGER: true`) to run:
  `fetch -> markPublished -> pushGitHub`.
- Alternative mode uses separate triggers for each step.

After major script edits, reinstall triggers to refresh handlers.

---

## Important `CONFIG` keys

| Key | Purpose |
|-----|---------|
| `SHEET_ID` | Required for standalone script mode. |
| `RECIPES_PER_DAY` | Number of imported recipes per run. |
| `PUBLISH_STAGGER` | `batch`, `day`, or `hour`. |
| `PUBLISH_HOUR` | Local publish hour for scheduled rows. |
| `API_BASE` | TheMealDB API endpoint. |
| `RECIPE_CONTENT_LANGUAGE` | Must stay `en` for English-only output. |
| `CATEGORIES` | Fallback category list; API taxonomy cache is also supported. |
| `GITHUB_*` | Repository/branch/file paths for export commits. |
| `GITHUB_LLMS_FILE` | Path in repo for the llms.txt file (AI search engines). |
| `SEO_QUALITY_GATE_ENABLED` | SEO warnings gate (non-blocking mode currently). |

Store secrets in Script Properties instead of hardcoding.

---

## Groq SEO output contract

Groq enrichment uses strict English output and valid JSON only.

Expected JSON keys from `callGroqForRecipeSeo_()`:
- `title` (45-60 chars target)
- `metaDescription` (140-155 chars target)
- `instructions` (numbered steps)
- `tags` (5-8 tags)
- `hook` (1-2 sentences, max 180 chars)
- `tip` (1 pro tip, max 160 chars)

If optional fields are missing, the script falls back safely:
- missing/invalid `metaDescription` -> heuristic `buildSeoDescription_()`
- missing `hook`/`tip` -> ignored (no pipeline break)

---

## Recommended Script Properties

| Key | Usage |
|-----|-------|
| `GITHUB_TOKEN` | GitHub PAT for content updates. |
| `GITHUB_REPO` | `owner/repo` format. |
| `GROQ_API_KEY` | Groq API key for enrichment. |
| `GSC_CLIENT_EMAIL` / `GSC_PRIVATE_KEY` | Optional indexing API credentials. |
| `NEWSLETTER_WEB_APP_URL` | Newsletter Web App `/exec` endpoint. |

---

## Data flow

1. Fetch meal data from TheMealDB (English source).
2. Convert meal payloads into rows (`mealToRow_`).
3. Optionally enrich title/instructions/tags/metaDescription with Groq (`RECIPE_CONTENT_LANGUAGE: 'en'`).
4. Mark scheduled rows as published based on publish date.
5. Build export payload with site metadata + recipes.
6. Push `recipes.json` and `sitemap.xml` to GitHub.
6b. Build `llms.txt` (AI search engines index) from published recipes list.

During export, `description` in `recipes.json` uses:
1) `MetaDescription` sheet value if valid (140-155 chars), else
2) heuristic fallback description.

---

## SEO scoring model

`evaluateSeoQuality_()` returns `ok`, `reasons`, and `score` (0-100).

Weighted score:
- Title quality: 20 pts
- Description quality: 20 pts
- Ingredients/steps quality: 20 pts
- Tags quality: 15 pts
- Image quality: 15 pts
- Related links: 10 pts

`runSeoAuditPreview()` now reports:
- average SEO score,
- number of pages below 70/100,
- plus existing quality counters.

`rankPagesToImprove_()` uses this score while preserving `issues/reasons` compatibility.

---

## Language rule (English only)

- Keep `RECIPE_CONTENT_LANGUAGE` set to `en`.
- Keep generated/public text in English.
- If non-English rows appear, re-run enrichment for affected rows before export.

---

## Quick troubleshooting

| Symptom | Check |
|---------|-------|
| Menu not visible | Refresh sheet and ensure script is bound correctly. |
| Nothing gets published | Check publish dates and `SCHEDULED` status. |
| Export cancelled | Verify at least one `PUBLISHED` row is available. |
| Push fails | Validate GitHub token/repo/branch settings. |
| Non-English output | Confirm `RECIPE_CONTENT_LANGUAGE: 'en'` and rerun enrichment. |

---

## Related docs

- Root guide: [`../README.md`](../README.md)
