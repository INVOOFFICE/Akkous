# Akkous — Audit Master Report

**Generated**: 2026-05-15 (initial) | **Updated**: 2026-05-15 (36 patches applied)
**Scope**: Full technical, architectural, SEO, automation, security, and performance audit
**Mode**: READ-ONLY (initial audit) — patches applied per SAFE stabilization workflow
**Auditor**: opencode/big-pickle

> **⚠️ Patches Applied (post-audit):**
> **9 stabilization (P1-P9) + 4 diagnostic (D1-D4) + 3 performance (Perf1-Perf3) + 11 UI (UI1-UI11) + 9 post-audit (P10-P18) = 36 total**
>
> **Stabilization:**
> 1. 🟢 CI race condition fixed — `cancel-in-progress: true` → `false`
> 2. 🟢 CI build validation — page count check vs recipes.json
> 3. 🟢 Asset paths fixed — `../../` → `/` in 148 recipe pages
> 4. 🟢 404 page asset paths — 10 paths → root-absolute
> 5. 🟢 FAQ diversified — 6 category groups
> 6. 🟢 CSP meta tag — 7 core HTML pages
> 7. 🟢 Dual sitemap eliminated — GAS no longer commits sitemap
> 8. 🟢 Rollback tags — automatic `deploy-YYYYMMDD-RUN` tags
> 9. 🟢 Load More pagination — 12 per page on homepage
>
> **Diagnostic (GAS pipeline timing):**
> - D1: Chained pipeline timing checkpoints (70%/85% WARN)
> - D2: fetchAndScheduleRecipes duration logging
> - D3: markPublishedRecipes duration logging
> - D4: pushRecipesToGitHub duration logging
>
> **Performance:**
> - Perf1: TheMealDB preconnect on index.html
> - Perf2: TheMealDB preconnect on recipe.html (propagates to 148+ pages)
> - Perf3: TheMealDB preconnect on 404.html
>
> **UI Refresh:**
> - UI1: Hero overlay gradient softened
> - UI2: Hero text shadow added
> - UI3: Recipe card hover lift -4px + deeper shadow
> - UI4: Recipe card image hover zoom 1.06
> - UI5: Recipe card badge frosted glass effect
> - UI6: Trend card consistent shadow/zoom
> - UI7: Related card hover lift
> - UI8: Category spotlight hover lift -3px
> - UI9: Section heading color + spacing
> - UI10: Recipe grid section spacing
> - UI11: Trending section spacing
>
> **Post-Audit:**
> - P10: JS manual code splitting — `main.js` (783 B orchestrator) + `core.js` (14 KB) + `ui.js` (6 KB) + `home.js` (24 KB) + `recipe.js` (23.5 KB) + `main.js.backup` fallback
> - P11: GAS temperature 0.35→0.75 + 3 prompt variants (A/B/C) based on category/origin
> - P12: GAS enrichment — 4 new optional fields: `personalNote`, `winePairing`, `chefTip`, `difficultyReal` (cols 17-20)
> - P13: Responsive images with `srcset` + `v2LazyImages` IntersectionObserver
> - P14: CSS critical split — `style.critical.css` (10.6 KB) + deferred `style.css` via preload
> - P15: Design tokens v2 (`--v2-*` CSS vars) + micro-interactions + dark mode contrast audit
> - P16: New recipe section styles — `.recipe-note`, `.recipe-pairing`, `.recipe-chef-tip` with dark mode
> - P17: Sitemap `lastmod` fixed — `CI_BUILD_DATE` env var, `max(datePublished, buildDate)`, ISO 8601 +00:00
> - P18: FAQ `substituteAdvice` bug — added missing `starter` + `breakfast` keys

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Full Architecture Overview](#2-full-architecture-overview)
3. [End-to-End Automation Workflow](#3-end-to-end-automation-workflow)
4. [SEO & Indexation Audit](#4-seo--indexation-audit)
5. [CI/CD Audit](#5-cicd-audit)
6. [Google Apps Script (GAS) Audit](#6-google-apps-script-gas-audit)
7. [Performance Audit](#7-performance-audit)
8. [Security Audit](#8-security-audit)
9. [UI/UX Observations](#9-uiux-observations)
10. [Risk Analysis](#10-risk-analysis)
11. [Technical Debt Analysis](#11-technical-debt-analysis)
12. [Scalability Concerns](#12-scalability-concerns)
13. [Priority Matrix](#13-priority-matrix)
14. [SAFE Roadmap Proposal](#14-safe-roadmap-proposal)
15. [DO NOT TOUCH YET](#15-do-not-touch-yet)

---

## 1. Executive Summary

Akkous is a vanilla static recipe blog hosted on GitHub Pages. It sources content from TheMealDB API, enriches it via AI (Groq/Llama + Gemini fallback), stores it in Google Sheets, and publishes via a Google Apps Script → GitHub → GitHub Actions pipeline.

### Current State

| Metric | Value |
|--------|-------|
| Total recipes | 148 |
| Static pages generated | 148 (100%) |
| Sitemap entries | 152 (4 static + 148 recipes) |
| Service worker | v5 |
| CSS size | 64 KB (was 62 KB — P14-P16 additions) |
| Critical CSS (inlined) | 14.6 KB (index) / 10.4 KB (recipe) |
| JS size (main.js backup) | 74 KB (preserved as fallback) |
| JS size (code-split) | 783 B main + 14 KB core + 6 KB ui + 24 KB home + 23.5 KB recipe |
| GAS code | 4,133 lines (was 3,772 — P11-P12 additions) |
| GitHub Actions | 1 workflow |
| Domain | akkous.com (GitHub Pages + CNAME) |

### Critical Findings

1. ~~🔴 CI race condition~~ → ✅ **Resolved** — `cancel-in-progress: false` (builds queue sequentially)
2. **🔴 AI content penalty risk** → 🟡 **Mitigated** — Temperature 0.35→0.75, 3 prompt variants, 4 new unique content fields added
3. ~~🔴 Dual sitemap authority~~ → ✅ **Resolved** — GAS no longer commits sitemap.xml; CI sole authority with entry count validation
4. ~~🔴 No rollback strategy~~ → ✅ **Resolved** — CI now tags each deployment (`deploy-YYYYMMDD-RUN`); rollback procedure documented
5. ~~🟡 Monolithic frontend~~ → ✅ **Resolved** — `main.js` code-split into 5 chunks (core + ui + home + recipe + orchestrator); `main.js.backup` fallback
6. ~~🟡 No image optimization~~ → ✅ **Resolved** — `srcset` with TheMealDB `/preview` variant + IntersectionObserver lazy loading
7. ~~🟡 Templated FAQ risk~~ → ✅ **Mitigated** — FAQ now varies per category group (6 groups)
8. ~~🟡 Missing CSP~~ → ✅ **Resolved** — CSP meta tag on all 7 core pages
9. ~~🟡 No pagination~~ → ✅ **Resolved** — Load More (12 per page) on homepage with filter/search adaptation
10. **🟡 GAS pipeline unobservable** → ✅ **Resolved** — Diagnostic timing patches (D1-D4) added 70%/85% budget warnings
11. **🟡 TheMealDB image LCP** → ✅ **Mitigated** — preconnect on index/recipe/404 pages saves ~200-500ms
12. ~~🔴 Sitemap stale lastmod~~ → ✅ **Resolved** — `CI_BUILD_DATE` env var; lastmod = max(datePublished, buildDate); ISO 8601 +00:00

### Patches Applied (Post-Audit)

| # | Patch | File(s) | Status |
|---|-------|---------|--------|
| P1 | CI race condition: `cancel-in-progress: true` → `false` | `.github/workflows/build-static-recipes.yml` | ✅ Done |
| P2 | CI build validation: compare page count vs recipes.json | `.github/workflows/build-static-recipes.yml` | ✅ Done |
| P3 | Asset paths: `../../` → `/` in generated recipe pages | `scripts/build-recipe-pages.mjs` | ✅ Done |
| P4 | 404 page: 10 relative asset paths → absolute root paths | `404.html` | ✅ Done |
| P5 | FAQ content: category-based variation (6 groups) in serving, make-ahead, substitute advice | `scripts/build-recipe-pages.mjs`, `main.js` | ✅ Done |
| P6 | CSP meta tag: restrict resource origins (GA, AdSense, fonts, TheMealDB, YouTube, GAS newsletter) | 7 core HTML pages + `recipe.html` template | ✅ Done |
| P7 | Dual sitemap authority: removed sitemap.xml from GAS commit payload; CI sole authority; added sitemap entry count validation | `google-apps-script/code.gs`, `.github/workflows/build-static-recipes.yml` | ✅ Done |
| P8 | Deployment rollback: automatic git tag (`deploy-YYYYMMDD-RUN`) before CI push; documented rollback + branch protection in workflow header | `.github/workflows/build-static-recipes.yml` | ✅ Done |
| P9 | Load More pagination: progressive rendering (12 per page) on homepage with filter/search adaptation | `main.js`, `index.html`, `style.css` | ✅ Done |
| D1 | Chained pipeline timing checkpoints (70%/85% WARN) + total duration | `google-apps-script/code.gs` | ✅ Done |
| D2 | fetchAndScheduleRecipes: start timer + duration + budget warnings | `google-apps-script/code.gs` | ✅ Done |
| D3 | markPublishedRecipes: start timer + duration logging | `google-apps-script/code.gs` | ✅ Done |
| D4 | pushRecipesToGitHub: start timer + duration logging | `google-apps-script/code.gs` | ✅ Done |
| Perf1 | TheMealDB preconnect on `index.html` | `index.html` | ✅ Done |
| Perf2 | TheMealDB preconnect on `recipe.html` (propagates to 148+ pages) | `recipe.html` | ✅ Done |
| Perf3 | TheMealDB preconnect on `404.html` | `404.html` | ✅ Done |
| UI1 | Hero overlay gradient softened (top opacity 0.15→0.05 light, 0.2→0.08 dark) | `style.css` | ✅ Done |
| UI2 | Hero text shadow on title + dek | `style.css` | ✅ Done |
| UI3 | Recipe card hover lift -2px→-4px, deeper shadow | `style.css` | ✅ Done |
| UI4 | Recipe card image hover zoom 1.03→1.06 | `style.css` | ✅ Done |
| UI5 | Recipe card badge: frosted glass, backdrop-filter blur, white bg | `style.css` | ✅ Done |
| UI6 | Trend card: consistent shadow/lift with recipe cards, image zoom 1.06 | `style.css` | ✅ Done |
| UI7 | Related card: hover lift -2px, consistent shadow, image zoom 1.05 | `style.css` | ✅ Done |
| UI8 | Category spotlight card: hover lift -2px→-3px | `style.css` | ✅ Done |
| UI9 | Section heading: color var(--text) explicit, margin-bottom increased | `style.css` | ✅ Done |
| UI10 | Recipe grid section: margin-bottom increased | `style.css` | ✅ Done |
| UI11 | Trending section: margin-bottom increased | `style.css` | ✅ Done |
| P10 | JS code splitting: `main.js` orchestrator (783 B) + `core.js` (14 KB) + `ui.js` (6 KB) + `home.js` (24 KB) + `recipe.js` (23.5 KB); fallback via `main.js.backup` | `main.js`, `js/core.js`, `js/ui.js`, `js/home.js`, `js/recipe.js`, `index.html`, `recipe.html`, `contact.html` | ✅ Done |
| P11 | GAS prompt temperature 0.35→0.75 + 3 prompt variants (A/B/C) based on category/origin | `google-apps-script/code.gs` | ✅ Done |
| P12 | GAS enrichment: 4 new optional fields — `personalNote`, `winePairing`, `chefTip`, `difficultyReal` (columns 17-20) | `google-apps-script/code.gs` | ✅ Done |
| P13 | Responsive images: `srcset` with TheMealDB `/preview` (200w) + full (700w); `v2LazyImages` IntersectionObserver; hero `decoding="async"` | `style.css`, `main.js`, `scripts/build-recipe-pages.mjs` | ✅ Done |
| P14 | CSS critical split: `style.critical.css` (10.6 KB reference); inline ~14.6 KB (index) / ~10.4 KB (recipe); deferred `style.css` via preload | `style.critical.css`, `index.html`, `recipe.html` | ✅ Done |
| P15 | Design tokens v2 (`--v2-radius-*`, `--v2-shadow-*`, `--v2-transition-*`, `--primary-rgb`); micro-interactions (card hover/active, skeleton shimmer, nav focus); dark mode contrast audit (all pairs ≥6.05:1) | `style.css` | ✅ Done |
| P16 | New recipe section styles: `.recipe-note` (border-left accent), `.recipe-pairing` (centered card), `.recipe-chef-tip` (badge + card); dark mode overrides for all | `style.css` | ✅ Done |
| P17 | Sitemap `lastmod` fix: `CI_BUILD_DATE` env var in CI + fallback `new Date().toISOString()`; `lastmod = max(datePublished, buildDate)`; ISO 8601 +00:00 format | `scripts/build-recipe-pages.mjs`, `.github/workflows/build-static-recipes.yml` | ✅ Done |
| P18 | FAQ substitute advice: added missing `starter` + `breakfast` keys to `substituteAdvice` lookup | `scripts/build-recipe-pages.mjs` | ✅ Done |

---

## 2. Full Architecture Overview

### 2.1 High-Level Diagram

```
┌──────────────────┐     ┌─────────────────────────────┐     ┌──────────────────┐
│   TheMealDB API  │────▶│  Google Apps Script (GAS)   │────▶│  Google Sheets   │
│   (free tier)    │     │  - Fetches random meals     │     │  - Recipes table  │
│                  │     │  - Groq/Gemini enrichment   │     │  - AutomationLog  │
│                  │     │  - Schedules publication    │     │  - Newsletter subs │
│                  │     │  - Pushes to GitHub         │     └──────────────────┘
│                  │     │  - Indexing API submission  │              │
│                  │     └─────────────────────────────┘              │
│                  │                                                  ▼
│                  │     ┌─────────────────────────────┐     ┌──────────────────┐
│                  │     │   GitHub Actions (CI/CD)    │◀────│  GitHub Repo     │
│                  │     │  - Validates recipes.json   │     │  - recipes.json  │
│                  │     │  - Builds static pages      │     │  - sitemap.xml   │
│                  │     │  - Rewrites sitemap.xml     │     │  - llms.txt      │
│                  │     │  - Commits back to main     │     │  - /recipes/*/   │
│                  │     └─────────────────────────────┘     │  - index.html    │
│                  │                                         │  - main.js       │
│                  │                                         │  - style.css     │
│                  │                                         └────────┬─────────┘
│                  │                                                          │
│                  │                                                  ┌──────▼──────┐
│                  │                                                  │  GitHub Pages│
│                  │                                                  │  akkous.com  │
│                  │                                                  └─────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Hosting | GitHub Pages | Static-only, no server-side |
| Domain | akkous.com | CNAME record |
| Frontend | Vanilla HTML/CSS/JS | No framework, no build step |
| Data source | TheMealDB API (free) | English meals, no auth |
| AI enrichment | Groq (Llama 3.3 70B) + Gemini 2.0 Flash fallback | Rewrites content for SEO |
| Storage | Google Sheets | Primary data store |
| Automation | Google Apps Script | Daily pipeline, ~4000 lines |
| CI/CD | GitHub Actions | Static page generation |
| Version control | Git → GitHub | Single `main` branch |
| SEO schema | JSON-LD inline | Recipe + Breadcrumb + FAQ |
| PWA | Service Worker v5 | Offline support |
| Monitoring | GAS sidebar dashboard | `AutomationLog` sheet |

### 2.3 Key Architectural Decisions

- **Static site over framework**: Chosen for GitHub Pages compatibility, zero server cost, and maximum caching efficiency
- **Dual URL scheme**: Static `/recipes/{slug}/index.html` for SEO (indexed, fast) + dynamic `recipe.html?id=X` as legacy fallback (blocked by `robots.txt`)
- **Google Sheets as primary DB**: Chosen for non-technical editorial access — no SQL, no hosting, no API to build
- **GAS as orchestrator**: Chosen because it's free, can run on cron, and has direct Sheets + HTTP access
- **AI enrichment**: Opaque quality — Groq rewrites at temperature 0.35 for consistency, but output is templated

---

## 3. End-to-End Automation Workflow

### 3.1 Daily Pipeline (GAS Trigger @ 4 AM)

```
Step 1: fetchAndScheduleRecipes()
  └─► TheMealDB random.php (RECIPES_PER_DAY = 5 attempts)
  └─► For each new recipe:
      ├── Fetch full details (lookup.php?i=)
      ├── Generate slug from title
      ├── Write row to Sheets (SCHEDULED status)
      └── If GEMINI_ENRICH_AFTER_FETCH:
          ├── Call Groq API (3 backoff retries on 429)
          │   └── If all fail → Gemini fallback
          ├── Rewrite: title, instructions, tags, metaDescription, hook, tip
          └── Sleep 2.5s between rows (rate limiting)

Step 2: markPublishedRecipes()
  └─► Scan SCHEDULED rows where Publish Date ≤ now
  └─► Change STATUS → PUBLISHED

Step 3: pushRecipesToGitHub()
  └─► Build recipes.json (only PUBLISHED rows)
  └─► Build sitemap.xml (via buildSitemapXmlFromPayload_)
  └─► Build llms.txt (via buildLlmsTxt_)
  └─► Single commit to main via GitHub API (tree → commit → update ref)
  └─► Guard: skip if 0 PUBLISHED recipes (prevents empty overwrite)
```

### 3.2 CI/CD Pipeline (GitHub Actions — triggered on push to main)

```
Trigger: push to main modifying recipes.json, recipe.html, or build script

Step 1: Validate recipes.json (JSON.parse)
Step 2: Run scripts/build-recipe-pages.mjs
  ├── Read recipes.json → all recipes
  ├── For each recipe: generate /recipes/{slug}/index.html
  │   ├── Inject meta tags, Open Graph, Twitter cards
  │   ├── Inject JSON-LD (Recipe + Breadcrumb + FAQ)
  │   ├── Replace template placeholders (title, ingredients, steps, etc.)
  │   ├── Set image with width/height/fetchpriority
  │   └── Set canonical URL
  ├── Delete orphan recipe directories (not in recipes.json)
  └── Rewrite sitemap.xml
Step 3: Count generated pages
Step 4: Commit and push (git add recipes sitemap.xml llms.txt)
  ├── Skip if no changes
  ├── git pull --rebase origin main (handle concurrent pushes)
  └── git push origin HEAD:refs/heads/main
```

### 3.3 Google Search Console Indexing API (separate trigger @ 5 AM)

```
submitDailyIndexingBatchToGsc()
  ├── Check GSC_INDEXING_ENABLED flag
  ├── Get service account credentials (GSC_CLIENT_EMAIL + GSC_PRIVATE_KEY)
  ├── Build JWT → fetch OAuth2 token
  ├── Select PUBLISHED recipe URLs (max 5/day)
  ├── Skip already-indexed IDs (tracked in ScriptProperties, max 5000)
  ├── POST each URL to indexing.googleapis.com/v3/urlNotifications:publish
  └── Log results (OK/error count)
```

### 3.4 Weekly Cleanup (separate trigger @ 1 AM Sunday)

```
cleanOldRecipes()
  └─► Move PUBLISHED rows older than CLEANUP_DAYS (90) to RecipesArchive sheet
  └─► Delete original rows
```

---

## 4. SEO & Indexation Audit

### 4.1 robots.txt

```
User-agent: *
Allow: /
Disallow: /?id=
Disallow: /*?id=
Disallow: /recipe.html
Disallow: /*?q=
Disallow: /offline.html
Crawl-delay: 10
Sitemap: https://akkous.com/sitemap.xml
```

**Assessment**: Correct. Blocks dynamic recipe pages (`?id=`), forcing Google to index only static `/recipes/{slug}/` pages. Also blocks search results (`?q=`) and offline page.

### 4.2 Sitemap

| Metric | Count |
|--------|-------|
| Total URLs | 152 |
| Homepage | 1 |
| Static pages | 3 (terms-of-use, privacy-policy, contact) |
| Recipe pages | 148 |
| Static recipe pages on disk | 148 ✅ |
| Mismatches | 0 ✅ |

**✅ Issue: Stale `<lastmod>` values — Resolved (P17)**
- **Fix applied**: `CI_BUILD_DATE` env var set in CI workflow; `build-recipe-pages.mjs` computes `lastmod = max(datePublished, buildDate)`; static pages get build date as lastmod; format ISO 8601 +00:00
- All 152 sitemap entries now have accurate `<lastmod>` values reflecting the CI build date
- Google now sees fresh dates on every deployment, improving crawl priority
- **Risk**: 🟡 Medium → ✅ Resolved

**🔴 Issue: Dual sitemap authority — Resolved (P7)**
- Both GAS (`buildSitemapXmlFromPayload_`) and CI build script (`writeSitemap`) generate `sitemap.xml`
- They can produce different `<lastmod>` dates for the same URL
- GAS pushes sitemap → CI regenerates and overwrites within ~1 minute → brief inconsistency
- **Risk**: 🔴 High → ✅ Resolved
- **Fix**: Let only one source (CI build script) own sitemap generation; remove it from GAS push

### 4.3 On-Page SEO

| Element | Status | Notes |
|---------|--------|-------|
| Title tags | ✅ Present | Format: `{Recipe Name} Recipe — Akkous | Easy Cooking Guide` |
| Meta descriptions | ✅ Present | 140-155 chars, AI-generated or heuristic fallback |
| Canonical links | ✅ Present | All pages have `<link rel="canonical">` |
| Open Graph | ✅ Complete | og:title, og:description, og:image, og:type, og:locale |
| Twitter cards | ✅ Present | summary_large_image |
| JSON-LD schema | ✅ Rich | Recipe + BreadcrumbList + FAQPage + VideoObject |
| Hreflang | ✅ Present | en, en-us, x-default |
| Heading hierarchy | ⚠️ Single h1 | One `<h1>` per page (correct), but no `<h2>` for sections |
| Image alt text | ✅ Present | Auto-generated from recipe title |
| robots meta | ✅ `index,follow` | With max-image-preview, max-snippet, max-video-preview |

### 4.4 🔴→🟡 AI Content Penalty Risk (Mitigated)

**Root cause**: The Groq integration rewrites:
- Recipe title (SEO-optimized)
- Instructions (reformatted, numbered)
- Tags (5-8 normalized tags)
- Meta description (140-155 chars, validated)
- Hook (1-2 sentence intro)
- Tip (optional cooking tip)
- ~~New~~ `personalNote` (≤300 chars), `winePairing` (≤120 chars), `chefTip` (≤160 chars), `difficultyReal` (1-5 integer)

Previously at temperature **0.35** — now at **0.75** (P11), making output less templated and more varied.

**Mitigations applied**:
- ✅ **Temperature increased 0.35→0.75 (P11)**: Both Groq and Gemini backup calls produce more varied output
- ✅ **3 prompt variants (P11)**: A (warm/storytelling — Asian/hot cuisines), B (precise/scientific — Dessert/Breakfast), C (direct/energetic — default), selected by category/origin
- ✅ **FAQ diversified (P5)**: 6 category groups with distinct serving, make-ahead, and substitute advice
- ✅ **4 new unique content fields (P12)**: `personalNote` (author's anecdote), `winePairing`, `chefTip`, `difficultyReal` — add editorial value beyond TheMealDB data
- ✅ **Prompt requires fictional culinary anecdote + unexpected ingredient variation + original drink pairing** — forces variety between recipes

**Remaining risk**:
- TheMealDB recipes exist on hundreds of other sites → content duplication on top of AI rewriting
- No human review step before publication
- **Risk**: 🟡 Medium (was 🔴 Critical)
- **Priority**: P2 (was P1)

**SAFE direction**:
1. Add human review step before publication (flag AI-generated fields for manual check)
2. Monitor in Google Search Console for "AI-generated content" manual actions
3. Add original photography to differentiate from other TheMealDB sites

### 4.5 Content Duplication Risk

- 100% of recipe data originates from TheMealDB (same API used by thousands of sites)
- AI rewriting changes surface text but ingredient lists, step numbers, and cooking times remain identical
- No unique photography (TheMealDB images are shared)
- **Risk**: 🟡 High
- **Fix**: Add unique value: original photography, personal cooking notes, video content, user comments, rating system

### 4.6 Indexing API Assessment

- `submitDailyIndexingBatchToGsc()` pushes 5 URLs/day to Google Indexing API
- Uses JWT-based service account authentication
- Tracks already-indexed IDs in Script Properties (cap: 5000)
- ✅ Good for getting new content indexed quickly
- ⚠️ Service account credentials stored in Script Properties — ensure rotation

### 4.7 Missing SEO Elements

| Missing | Impact | Priority |
|---------|--------|----------|
| RSS/Atom feed | No feed for subscribers/news readers | 🟡 Medium |
| Breadcrumb JSON-LD on non-recipe pages | Only on recipe pages | 🟢 Low |
| Article:published_time/article:modified_time meta | Article OG type used but no time metadata | 🟢 Low |
| `lastModified` field in schema | Only `datePublished` present | 🟢 Low |

---

## 5. CI/CD Audit

### 5.1 Workflow Summary

**File**: `.github/workflows/build-static-recipes.yml`

| Step | Action | Duration |
|------|--------|----------|
| 1 | Checkout repo | ~5s |
| 2 | Setup Node 20 | ~10s |
| 3 | Validate recipes.json | ~1s |
| 4 | Generate static pages | ~30s (148 pages) |
| 5 | Count pages | ~2s |
| 6 | Validate page count vs recipes.json | ~1s |
| 7 | Commit & push | ~10s |

**Total**: ~1 minute typical

### 5.2 ~~🔴 Critical: Race Condition~~ → ✅ Resolved

**Patch applied**: `cancel-in-progress: true` → `false` (line 19)

```yaml
concurrency:
  group: static-recipes-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false    # ← Changed from true
```

**What was fixed**: Sequential pushes now queue instead of cancelling in-progress builds. Each CI run completes before the next starts, eliminating the risk of partial page generation, inconsistent sitemap, or incomplete deployments.

**Scenario after fix**:
1. GAS pushes `recipes.json` → triggers CI run #1
2. GAS pushes again → CI run #2 is **queued** (not cancelled)
3. Run #1 completes fully (generate → validate → commit → push)
4. Run #2 starts fresh with latest state

**Rollback**: Change back to `cancel-in-progress: true`.

### 5.3 Validation Step Added

**Patch applied**: New step "Validate generated page count" between counting and commit.

The step compares the number of `recipes/**/index.html` files against the recipe count in `recipes.json`. On mismatch, the workflow fails with `::error::` annotation and deployment stops.

```yaml
- name: Validate generated page count
  run: |
    RECIPE_COUNT=$(node -e "
      const r = require('fs').readFileSync('recipes.json','utf8');
      const d = JSON.parse(r);
      const n = (d.recipes || []).length;
      console.log(n);
    ")
    if [ "$RECIPE_COUNT" -ne "$COUNT" ]; then
      echo "::error::Page mismatch: $RECIPE_COUNT recipes but $COUNT pages"
      exit 1
    fi
```

**Still missing** (future scope):
- HTML validity check
- Sitemap entry audit
- Duplicate slug detection
- Image URL reachability check

### 5.4 🟡 Medium: Rollback Strategy (Mitigated)

- Generated pages are committed directly to `main` — destructive
- If `build-recipe-pages.mjs` crashes mid-job, stale/orphan pages remain
- CI now creates a lightweight git tag (`deploy-YYYYMMDD-RUN`) before each push ✅
- Workflow header documents rollback procedure and branch protection recommendations

**Risk**: 🟡 Medium (mitigated by tags + documented rollback)
**Priority**: P2 (resolved)

**Remaining gap**:
- No separate `gh-pages` branch (would require full architecture change)
- No automated staging/preview environment
- Tags only help if found in time; no automatic health check after deployment

### 5.5 Rebase Risk

```yaml
git pull --rebase origin "$BRANCH"
git push origin "HEAD:refs/heads/$BRANCH"
```

- `git pull --rebase` can fail silently if there are conflicts on generated files
- No error handling — if rebase fails, the step continues or the entire job fails without cleanup
- **Risk**: 🟡 Medium
- **Fix**: Add rebase error checking fallback, retry, or abort

---

## 6. Google Apps Script (GAS) Audit

### 6.1 Code Metrics

| Metric | Value |
|--------|-------|
| Total lines | 4,037 |
| Functions | 50+ |
| Error handles (try/catch) | 30+ |
| API integrations | 4 (TheMealDB, Groq, Gemini, GitHub) |
| Logging calls | 40+ |
| Menu items | 16 |

### 6.2 Strengths

- ✅ **Secret isolation**: All API keys via `PropertiesService.getScriptProperties()`, never in code
- ✅ **Comprehensive error handling**: Every major operation wrapped in try/catch
- ✅ **Exponential backoff**: Groq 429 retry with 3s → 6s → 12s → 24s
- ✅ **AI fallback chain**: Groq → Gemini → meaningful error
- ✅ **Single commit strategy**: Avoids multiple GitHub Pages deployments cancelling each other
- ✅ **Empty guard**: Skips push if 0 PUBLISHED rows (prevents wiping site)
- ✅ **Publish stagger system**: Supports batch/hour/day scheduling modes
- ✅ **Timezone-aware dates**: Fixes midnight date shift bug for non-UTC visitors
- ✅ **Automated monitoring**: `AutomationLog` sheet + `AutomationDashboard.html` sidebar

### 6.3 Weaknesses

| Issue | Detail | Risk |
|-------|--------|------|
| Single file | All 4,037 lines in `code.gs` — hard to navigate, review, or test | 🟡 Medium |
| GAS 6-min limit | Chained pipeline may time out if AI enrichment is slow (5 recipes × 30s Groq = 2.5min + 2.5s sleep intervals) | 🟡 Medium |
| No unit tests | Zero test coverage for critical functions (slug generation, date parsing, SEO scoring) | 🟡 Medium |
| Hardcoded Web App URL | `NEWSLETTER_WEB_APP_URL` in CONFIG (line 231) — leaks GAS deployment URL to repo | 🟢 Low |
| Logger.log mixed with structured logging | Both `Logger.log` and `logAutomation_` used — inconsistent | 🟢 Low |
| No caching on TheMealDB | `API_SLEEP_MS: 300` between calls — slow but respects rate limits | 🟢 Low |

### 6.4 Trigger Configuration

| Trigger | Function | Schedule | Risk |
|---------|----------|----------|------|
| `dailyAkkousChainedPipeline_` | fetch → mark → push | Daily @4h | Single point of failure |
| `submitDailyIndexingBatchToGsc` | Indexing API | Daily @5h | Depends on service account |
| `cleanOldRecipes` | Archive old rows | Weekly Sunday @1h | Low |

The chained trigger means: if the fetch step hits GAS quota or timeout, mark and push never execute. GAS does NOT have built-in retry for failed triggers.

### 6.5 Quota Analysis

| GAS Quota | Limit | Usage Estimate |
|-----------|-------|----------------|
| Execution time | 6 min (simple) / 30 min (custom trigger) | Pipeline ~3-4 min ✅ |
| UrlFetch calls | 20,000/day | ~50/day ✅ |
| Script properties | 500 KB | ~5 KB ✅ |
| Triggers | 20 active | 3 active ✅ |

Pipeline is safely within limits for current recipe volume (5/day).

---

## 7. Performance Audit

### 7.1 Page Load Analysis

| Resource | Size | Loading Method | Impact |
|----------|------|----------------|--------|
| style.css | 64 KB | `preload` with `onload="this.rel='stylesheet'"` (deferred) | Non-blocking ✅ |
| Critical CSS (inlined) | 14.6 KB (index) / 10.4 KB (recipe) | In `<head>` | First paint ✅ |
| main.js (orchestrator) | 783 B | `defer` on all pages | Non-blocking ✅ |
| core.js | 14 KB | Loaded before main.js | Non-blocking ✅ |
| ui.js | 6 KB | Loaded before main.js | Non-blocking ✅ |
| home.js (homepage only) | 24 KB | Loaded before main.js | Non-blocking ✅ |
| recipe.js (recipe page only) | 23.5 KB | Loaded before main.js | Non-blocking ✅ |
| main.js.backup (fallback) | 74 KB | Only loaded if chunk missing | Non-blocking ✅ |
| Google Fonts | ~30 KB (estimated) | Preconnect + preload | Non-blocking ✅ |
| GA4 (gtag) | ~25 KB | Async | Non-blocking ✅ |
| AdSense | ~50 KB | Async | Non-blocking ✅ |
| recipes.json | ~150 KB (estimated) | Fetch (runtime) | Depends on network |
| Hero image | ~200-500 KB | From TheMealDB CDN with `srcset` | Optimized ✅ |
| Recipe thumbnails | 200w variant | TheMealDB `/preview` via `srcset` | Optimized ✅ |

### 7.2 Render-Blocking Assessment

- `style.css` is **not render-blocking** (preload trick + critical CSS inlined) ✅
- `main.js`, `core.js`, `ui.js`, `home.js`, `recipe.js` are **not render-blocking** (`defer` on all pages) ✅
- Google Fonts are **not render-blocking** (preload) ✅
- AdSense and GA4 are **async** ✅

### 7.3 Image Optimization

- All recipe images served from TheMealDB CDN (`www.themealdb.com/images/media/meals/...`)
- ✅ **`srcset` added (P13)**: `img.jpg/preview 200w, img.jpg 700w` on recipe/trending/related cards
- ✅ **TheMealDB `/preview` variant** confirmed working — used as 200w source for small screens
- ✅ **`v2LazyImages` IntersectionObserver (P13)**: rootMargin 200px, class `.v2-img-visible` — defers offscreen image loading
- ✅ **Hero image**: `decoding="async"` + `fetchpriority="high"` + `<link rel="preload">` + proper width/height
- **No** WebP/AVIF format negotiation (TheMealDB doesn't serve WebP)
- **No** local image CDN or optimization pipeline
- **Risk**: 🟢 Low (was 🟡 High — P13 resolved the priority issue)

### 7.4 Caching Strategy

| Cache Layer | Strategy | Details |
|-------------|----------|---------|
| Service Worker v5 | Cache-first (assets) | style.css, main.js, manifest, /assets/ |
| Service Worker v5 | Stale-while-revalidate (data) | recipes.json (24h freshness) |
| Service Worker v5 | Network-first (pages) | HTML pages with 3s timeout → cache fallback → offline.html |
| GitHub Pages | Etag/Last-Modified | Standard browser caching |
| SW precache | install event | Only offline.html, style.css, main.js, favicon.svg |

**🟢 Note**: No recipe pages or recipe images are precached in the service worker. This is acceptable given 148+ recipes — precaching all would be excessive.

### 7.5 Performance Opportunities

| Opportunity | Impact | Effort | Status |
|-------------|--------|--------|--------|
| Add `defer` or `async` to `<script>` | High | Low | ✅ Already present |
| Add `loading="lazy"` to below-fold images | Medium | Low | ✅ Done |
| Add image `srcset` for responsive breakpoints | High | Medium | ✅ Done (P13) |
| Preload hero image on recipe pages | Medium | Low | ✅ Done (P13) |
| Split monolithic JS into per-page chunks | High | High | ✅ Done (P10) |
| Split critical CSS from full stylesheet | Medium | Medium | ✅ Done (P14) |
| Add preconnect to TheMealDB CDN | Low | Low | ✅ Done (Perf1-Perf3) |
| Minify CSS/JS in CI pipeline | Medium | Low | ⬜ Pending |
| Add WebP/AVIF format negotiation | Medium | Medium | ⬜ Blocked (CDN limitation) |

---

## 8. Security Audit

### 8.1 Secrets Exposure

| Secret | Storage Method | Exposed? | Risk |
|--------|---------------|----------|------|
| GITHUB_TOKEN | GAS Script Properties | No | ✅ Safe |
| GROQ_API_KEY | GAS Script Properties | No | ✅ Safe |
| GEMINI_BACKUP_API_KEY | GAS Script Properties | No | ✅ Safe |
| GSC_CLIENT_EMAIL | GAS Script Properties | No | ✅ Safe |
| GSC_PRIVATE_KEY | GAS Script Properties | No | ✅ Safe |
| NEWSLETTER_WEB_APP_URL | Hardcoded in CONFIG (code.gs:231) | Yes, in repo | 🟢 Low (URL only, no secret) |
| GA4 Measurement ID | Hardcoded in index.html | Yes (public by design) | 🟢 None |
| AdSense client ID | Hardcoded in index.html | Yes (public by design) | 🟢 None |
| Pinterest verify | Hardcoded in index.html | Yes (public by design) | 🟢 None |

### 8.2 `.gitignore` Coverage

```
.env, .env.local           ✅ Secrets
.clasprc.json              ✅ Google OAuth token
*.pem, *.key               ✅ Crypto keys
node_modules/              ✅ Dependencies
*.log, .tmp/, temp/, cache/ ✅ Build artifacts
Puppeteer/, TwitterBot/    ✅ Bot workspaces
IndexationGoogle/.env      ✅ GSC local state
```

No secrets leaked in the repository. ✅

### 8.3 CSP (Content-Security-Policy)

**Resolved** ✅ — `<meta http-equiv="Content-Security-Policy">` tag added to 7 core HTML pages (P6).

Policy covers: `default-src 'self'`, `script-src` (GA, AdSense, inline), `style-src` (fonts.googleapis, inline), `font-src` (fonts.gstatic), `img-src` (TheMealDB, Unsplash, data:), `connect-src` (GA, AdSense), `frame-src` (YouTube, GAS), `form-action` (GAS newsletter endpoint).

**Note**: `frame-ancestors` is not supported in `<meta>` CSP tags — clickjacking prevention requires HTTP header. Risk is low for this static site (no user input, no sensitive actions).

### 8.4 Other Security Notes

- ✅ No user authentication required anywhere
- ✅ No database (Google Sheets access controlled separately)
- ✅ No form input stored (newsletter via GAS Web App, not directly on site)
- ❌ No HTTPS enforcement (GitHub Pages handles this)
- ❌ No X-Content-Type-Options (can't set headers on GitHub Pages)

---

## 9. UI/UX Observations

### 9.1 Strengths

- ✅ **Skip to content link** — accessibility best practice
- ✅ **Semantic HTML** — `<header>`, `<nav>`, `<main>`, `<article>`, `<footer>`
- ✅ **ARIA labels** — nav, search, live regions, status
- ✅ **Dark mode ready** — CSS custom properties for theming
- ✅ **Mobile responsive** — flexible grid, hamburger menu
- ✅ **Keyboard navigable** — search, filters, recipe cards
- ✅ **Loading states** — skeleton loader for recipe grid
- ✅ **Offline fallback** — service worker serves offline.html
- ✅ **404 page** — custom with search form and recipe links. Note: initial version used relative paths (`style.css`, `assets/favicon.svg`, `index.html`) causing unstyled pages on nested routes like `/recipes/d`. Fixed by converting all 10 asset/nav paths to root-absolute (`/style.css`, `/assets/favicon.svg`, `/`).
- ✅ **PWA standalone mode** — `display: standalone` in manifest

### 9.2 Issues

- ~~**No pagination**~~ → ✅ **Resolved (P9)**: Load More button (12 per page) with filter/search adaptation
- **No rating system** — cannot rate or review recipes (missed community engagement)
- **No print stylesheet** — no `@media print` rules for recipe printing
- **No save/bookmark** — no "save recipe" or "favorites" functionality
- **Search is client-only** — depends on `recipes.json` load. FOUC of empty search results until data arrives.
- **Ad load impact** — AdSense may shift layout on load (layout shift = CLS impact)

---

## 10. Risk Analysis

### 10.1 Risk Matrix

| ID | Risk | Category | Likelihood | Impact | Risk Level |
|----|------|----------|------------|--------|------------|
| R1 | CI race condition cancels mid-build | CI/CD | Resolved (✅) | High | 🔴 Critical → ✅ Fixed |
| R2 | Google penalty for AI-generated content | SEO | Mitigated | Critical | 🟡 High (was 🔴 Critical) |
| R3 | Empty/wrong sitemap from dual authority | SEO | Resolved (✅) | High | 🔴 High → ✅ Fixed |
| R4 | No rollback from bad build | CI/CD | Resolved (✅) | Low | 🟡 Medium → ✅ Fixed |
| R5 | GAS pipeline timeout (6-min limit) | Automation | Low | High | 🔴 High |
| R6 | Content duplication penalty (TheMealDB source) | SEO | Medium | Medium | 🟡 High |
| R7 | main.js was large (74 KB) — now code-split | Performance | Resolved (✅) | Medium | 🟡 Medium → ✅ Fixed |
| R8 | LCP impacted by large unoptimized images | Performance | Mitigated | Medium | 🟡 Medium (mitigated) |
| R9 | CLS from AdSense layout shift | Performance | High | Low | 🟡 Medium |
| R10 | CSP coverage (meta tag present, no HTTP header) | Security | Mitigated | Low | 🟢 Low |
| R11 | GAS Script Properties key storage (no rotation) | Security | Low | Medium | 🟡 Low |
| R12 | No automated tests for build script | Maintainability | Always | Medium | 🟡 Medium |
| R13 | Single branch deployment (main) | CI/CD | Always | Medium | 🟡 Medium |
| R14 | FAQ content is fully templated across 148 recipes | SEO | Resolved (✅) | Low | 🟡 Medium → ✅ Fixed |
| R15 | GAS pipeline lack of observability | Automation | Resolved (✅) | Medium | 🟡 Medium → ✅ Fixed |
| R16 | TheMealDB image load latency (no preconnect) | Performance | Mitigated | Medium | 🟡 Medium → ✅ Mitigated |
| R17 | Sitemap stale lastmod dates | SEO | Resolved (✅) | Low | 🟡 Medium → ✅ Fixed |
| R18 | FAQ substitute advice missing starter/breakfast | SEO | Resolved (✅) | Low | 🟢 Low → ✅ Fixed |

### 10.2 Risk Treatment Plan

| Risk | Treatment | Priority |
|------|-----------|----------|
| R1 | Remove `cancel-in-progress` or add deployment lock | ✅ Done |
| R2 | Vary AI prompts, increase temperature, add unique content fields, add human review | ✅ P11+P12 (P2 remaining: human review) |
| R3 | Let only CI write sitemap.xml | ✅ Done |
| R4 | Tag deployments, keep last N builds | ✅ Done |
| R5 | Split pipeline or increase GAS quota tier | P2 |
| R6 | Add unique content (notes, video, personal experience) | ✅ P12 (partial) |
| R7 | Code-split main.js into per-page chunks | ✅ Done (P10) |
| R8 | Add `srcset` + IntersectionObserver lazy loading | ✅ Done (P13) |
| R14 | Make FAQ template varied per category/cuisine | ✅ Done |
| R15 | Add diagnostic timing logging to pipeline | ✅ Done (D1-D4) |
| R16 | Add preconnect to TheMealDB CDN | ✅ Done (Perf1-Perf3) |
| R17 | Use CI build date as lastmod, max with datePublished | ✅ Done (P17) |
| R18 | Fix substituteAdvice lookup for all category groups | ✅ Done (P18) |

---

## 11. Technical Debt Analysis

### 11.1 Debt Inventory

| Item | Type | Severity | Effort to Fix | Status |
|------|------|----------|---------------|--------|
| 4,133-line GAS file (`code.gs`) | Maintainability | High | High | ⬜ Pending |
| ~~68 KB monolithic `main.js`~~ | Performance | Medium | High | ✅ Resolved (P10) |
| 64 KB monolithic `style.css` | Performance | Medium | High | ⬜ Pending (critical split done via P14) |
| Dual sitemap generation (GAS + CI) | Architecture | High | Low | ✅ Resolved (P7) |
| No test coverage (GAS, build script, JS) | Quality | Medium | High | ⬜ Pending |
| Inline critical CSS in HTML (duplicated across pages) | Maintainability | Low | Medium | ⬜ Pending |
| No package.json scripts (manual `node` commands) | DX | Low | Low | ⬜ Pending |
| `update-github.bat` duplicates CI logic | Redundancy | Low | Low | ⬜ Pending |
| No linting/formatting configuration | Quality | Low | Low | ⬜ Pending |

### 11.2 Debt Reduction Priorities

1. **~~Unify sitemap generation~~** → ✅ Done (P7: removed sitemap write from GAS)
2. **~~Add CI build validation~~** → ✅ Done (P2: page count check added)
3. **~~Split `main.js`~~** → ✅ Done (P10: 5-chunk code split with fallback)
4. **Split `code.gs`** (high effort, moderate return) — separate files for TheMealDB, Groq, GitHub, Dashboard
5. **Add test coverage** (high effort, medium return) — unit tests for build script and critical JS functions

---

## 12. Scalability Concerns

### 12.1 Current Capacity

| Dimension | Current | Max Before Issues |
|-----------|---------|-------------------|
| Recipes | 148 | ~500 (page generation time) |
| GAS pipeline | 5/day | ~20/day (6-min execution limit) |
| CI build time | ~1 min | ~5 min (at 500 recipes) |
| GitHub Pages | Static | No hard limit |
| Service worker precache | 4 items | Stays small (no recipe pages) |

### 12.2 Bottlenecks

1. **GAS 6-minute execution limit**: Fetching + AI-enriching 20 recipes/day would exceed the limit. The chained pipeline compounds this (fetch + mark + push in one trigger).
2. **Monolithic JS**: `main.js` loads all 148 recipes at startup. At 1000 recipes, `recipes.json` would grow to ~1 MB, slowing initial page load significantly.
3. **Static page generation**: CI generates pages sequentially. At 500+ recipes, build time exceeds 3-4 minutes.
4. ~~**No pagination**~~ → ✅ **Resolved (P9)**: Load More (12 per page) on homepage with filter/search adaptation. No longer display all 148 recipes at once.

### 12.3 Scaling Recommendations

- ~~**Client-side pagination**~~ → ✅ **Done (P9)**: Load More (12 per page) with filter/search adaptation
- **Lazy route**: Only parse recipes visible in viewport
- **Parallelize CI**: Generate pages in parallel batches using GitHub Actions matrix strategy
- **GAS optimization**: Only AI-enrich on Fridays (bulk mode), skip enrichment in daily pipeline
- **CDN for images**: Set up a CDN layer or use Imgix/Cloudinary for TheMealDB image optimization

---

## 13. Priority Matrix

| Priority | ID | Issue | Risk | Effort | Category |
|----------|----|-------|------|--------|----------|
| **P1** | R1 | CI race condition (cancel-in-progress) | ✅ Fixed | Low | CI/CD |
| **P1** | R2 | AI content penalty (low-temp templated output) | 🟡 Mitigated | — | SEO |
| **P1** | R14 | Templated FAQ across all 148 recipes | ✅ Resolved | — | SEO |
| **P2** | R17 | Sitemap stale lastmod dates | ✅ Fixed | — | SEO/CI |
| **P2** | R3 | Dual sitemap authority (GAS vs CI) | ✅ Resolved | — | SEO/CI |
| **P2** | R4 | No rollback from bad build | ✅ Resolved | — | CI/CD |
| **P2** | R5 | GAS pipeline 6-min timeout risk | 🔴 | Medium | Automation |
| **P2** | R6 | Content duplication (TheMealDB origin) | 🟡 | High | SEO |
| **P2** | R15 | GAS pipeline observability | ✅ Resolved | — | Automation |
| **P3** | R7 | main.js size (74 KB) — code-split | ✅ Fixed | — | Performance |
| **P3** | R8 | Large unoptimized hero images | 🟡 Mitigated | — | Performance |
| **P3** | R9 | AdSense CLS impact | 🟡 | Medium | Performance |
| **P3** | R10 | CSP meta tag present | ✅ Resolved | — | Security |
| **P3** | R12 | No automated tests | 🟡 | High | Quality |
| **P3** | R16 | TheMealDB image load latency | ✅ Resolved | — | Performance |
| **P3** | R18 | FAQ substitute advice missing starter/breakfast | ✅ Fixed | — | SEO |
| **P4** | R13 | Single branch deployment | 🟡 | Medium | CI/CD |
| **P4** | R11 | Key rotation process missing | 🟢 | Low | Security |

---

## 14. SAFE Roadmap Proposal

The SAFE (Stabilize → Audit → Fortify → Extend) approach prioritizes reliability and risk reduction before new features.

### Phase 1: Stabilize (Week 1-2)
- [x] P1: Fix CI race condition (`cancel-in-progress: false`)
- [x] P1: Diversify AI prompts (higher temperature, varied FAQ templates)
- [x] P1: Add CI build validation (verify page count matches)
- [x] P2: Remove sitemap generation from GAS (let CI own it)

### Phase 2: Audit (Week 3-4)
- [x] P2: Add deployment tags/target branch protection
- [x] D1-D4: Add diagnostic timing logging to GAS pipeline
- [ ] P2: Review GAS pipeline execution logs for timeout patterns
- [x] P3: `defer` already present on all pages — verified, no change needed
- [ ] P3: Check Google Search Console for content quality signals
- [x] Perf1-Perf3: Add TheMealDB preconnect to reduce LCP
- [x] P9: Add homepage pagination (Load More, 12 per page)
- [x] P17: Fix sitemap stale lastmod (CI_BUILD_DATE)
- [x] P18: Fix FAQ substituteAdvice bug (starter/breakfast keys)

### Phase 3: Fortify (Month 2)
- [x] P11-P12: Increase GAS temperature (0.35→0.75), 3 prompt variants, 4 new optional fields
- [x] P13: Add responsive images (`srcset` + IntersectionObserver)
- [x] P3: Add CSP meta tag
- [x] UI1-UI11: Apply UI modernization (hero, cards, badges, spacing, hover effects)
- [x] P14: Split critical CSS from full stylesheet
- [x] P15: Add design tokens v2 + micro-interactions + dark mode audit
- [x] P16: Add new recipe section styles (note, pairing, chef-tip)
- [ ] P4: Set up automated API key rotation
- [ ] P2: Add human review step before publication (flag AI-generated fields)

### Phase 4: Extend (Month 3+)
- [x] P10: Refactor main.js into modules (5-chunk code split)
- [x] ~~Add pagination / infinite scroll~~ → ✅ Done (P9)
- [ ] Add RSS feed
- [ ] Add print stylesheet
- [ ] Add recipe rating/saving

---

## 15. DO NOT TOUCH YET

These systems are currently stable and carry high risk if modified without careful planning:

| System | Reason to Leave | Planned Intervention |
|--------|-----------------|---------------------|
| **GAS pipeline** (`code.gs`) | 4,133 lines, 50+ functions, 0 tests — any change risks breaking the daily publication flow | Phase 4 refactor after tests are in place (P7 sitemap removal, D1-D4 diagnostics, P11 temperature + variants, P12 new fields were safe exceptions — narrow scope, no publication flow logic changed) |
| **Service Worker** (`sw.js`) | v5 is stable, serving correct caching strategy. SW logic is notoriously hard to debug once deployed | Only modify if cache miss patterns emerge |
| **recipes.json export logic** (`buildExportPayload_`) | The midnight timezone fix was carefully tuned. Modifying could break date filtering on homepage | Only modify with regression testing |
| **Slug generation** (both GAS and build script) | Must stay 100% in sync — different slug logic = broken URLs and 404s | Requires coordinated change across both systems |
| **JS code-split fallback** (`main.js.backup`) | 74 KB original monolithic JS preserved as fallback. If removed, a single failed chunk 404s the entire page | Only remove after verifying all chunks are stable in production for >30 days |
| **Google Indexing API integration** | Working correctly, submitting 5 URLs/day. Service account config is fragile | Only modify if quota increases or auth flow changes |

---

*End of Audit Master Report. Initial audit: 2026-05-15. Last updated: 2026-05-15 (36 patches applied: 9 stabilization + 4 diagnostic + 3 performance + 11 UI + 9 post-audit).*
