# Akkous — Audit Master Report

**Generated**: 2026-05-15
**Scope**: Full technical, architectural, SEO, automation, security, and performance audit
**Mode**: READ-ONLY — no modifications performed
**Auditor**: opencode/big-pickle

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
| CSS size | 59.7 KB |
| JS size (main.js) | 68 KB |
| GAS code | 4,037 lines |
| GitHub Actions | 1 workflow |
| Domain | akkous.com (GitHub Pages + CNAME) |

### Critical Findings

1. **🔴 CI race condition** — `cancel-in-progress: true` can abort static page generation mid-flight
2. **🔴 AI content penalty risk** — Groq rewrites all recipe content with low-temperature templated prompts; Google may penalize
3. **🔴 Dual sitemap authority** — Both GAS and CI write `sitemap.xml` with potentially different dates
4. **🔴 No rollback strategy** — CI commits directly to `main`; one bad build corrupts all pages
5. **🟡 Monolithic frontend** — `main.js` (68 KB) and `style.css` (59.7 KB) are render-heavy single files
6. **🟡 No image optimization** — No `srcset`, WebP, or responsive images from TheMealDB CDN

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

**🔴 Issue: Stale `<lastmod>` values**
- All recipe entries use `datePublished` (publish date from GAS) rather than actual last-modified date
- Google uses `<lastmod>` to determine crawl priority — stale dates signal "never updated"
- **Root cause**: Both GAS and build script use `datePublished` or `publishDate` fields, not git history or file mtime
- **Impact**: Google may crawl less frequently, deprioritize in search
- **Risk**: 🟡 Medium
- **Fix**: Use `git log -1 --format=%cI recipes/{slug}/index.html` or `dateModified` field if available

**🔴 Issue: Dual sitemap authority**
- Both GAS (`buildSitemapXmlFromPayload_`) and CI build script (`writeSitemap`) generate `sitemap.xml`
- They can produce different `<lastmod>` dates for the same URL
- GAS pushes sitemap → CI regenerates and overwrites within ~1 minute → brief inconsistency
- **Risk**: 🔴 High
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

### 4.4 🔴 AI Content Penalty Risk

**Root cause**: The Groq integration at `code.gs:1063-1104` rewrites:
- Recipe title (SEO-optimized)
- Instructions (reformatted, numbered)
- Tags (5-8 normalized tags)
- Meta description (140-155 chars, validated)
- Hook (1-2 sentence intro)
- Tip (optional cooking tip)

All at temperature **0.35** — very low creativity, highly templated output.

**Impact**:
- Google's March 2024 and September 2024 algorithm updates target low-quality/automated content
- The FAQ section (`buildRecipeFaqItems` in build script) is entirely templated — identical structure across all 148 recipes with only recipe name/ingredient substitution
- TheMealDB recipes exist on hundreds of other sites → content duplication on top of AI rewriting
- **Potential outcome**: Manual action, ranking depression, or de-indexation

**Risk**: 🔴 Critical
**Priority**: P1

**SAFE direction**:
1. Increase temperature to 0.7-0.8 for less templated output
2. Vary FAQ prompts per category/cuisine (not one-size-fits-all)
3. Add human review step before publication (flag AI-generated fields for manual check)
4. Add unique editorial content per recipe (personal notes, variation suggestions, wine pairings)
5. Monitor in Google Search Console for "AI-generated content" manual actions

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
| 6 | Commit & push | ~10s |

**Total**: ~1 minute typical

### 5.2 🔴 Critical: Race Condition

```yaml
concurrency:
  group: static-recipes-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Scenario**:
1. GAS pushes `recipes.json` → triggers CI run #1
2. CI run #1 starts generating pages (step 4, ~30s)
3. GAS pushes again (another pipeline run, new recipes) → triggers CI run #2
4. CI run #1 is **cancelled** (`cancel-in-progress: true`)
5. Run #2 starts from scratch
6. **Problem**: If run #1 was mid-write to `recipes/` directory, files may be in inconsistent state

**Worse scenario**:
1. CI run #1 completes steps 1-4 (generated pages)
2. CI run #1 is at step 6 (`git push`)
3. CI run #2 cancels run #1 mid-push
4. Partial push → incomplete deployment

**Risk**: 🔴 Critical
**Priority**: P1

**SAFE direction**:
- Set `cancel-in-progress: false` to let runs complete sequentially
- Or use a GitHub deployment queue / branch protection rule
- Add a "deployment in progress" lock in ScriptProperties that GAS checks before pushing

### 5.3 🔴 High: No Build Validation

After generation, the workflow only counts pages:
```yaml
COUNT=$(find recipes -name "index.html" | wc -l)
```

It does NOT:
- Validate generated HTML (missing tags, broken links)
- Verify sitemap entries match generated files
- Check for duplicate slugs
- Verify image URLs are reachable

**Risk**: 🔴 High (a corrupted recipe entry can silently produce broken pages)
**Priority**: P2

### 5.4 🔴 High: No Rollback Strategy

- Generated pages are committed directly to `main` — destructive
- If `build-recipe-pages.mjs` crashes mid-job, stale/orphan pages remain
- No staging branch, no PR review, no approval step
- No automated way to revert to previous working state

**Risk**: 🔴 High
**Priority**: P2

**SAFE direction**:
- Deploy to a `gh-pages` branch (separate from source)
- Keep last N successful builds as git tags
- Add manual approval gate for workflow runs

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
| style.css | 59.7 KB | `preload` with `onload="this.rel='stylesheet'"` | Non-blocking ✅ |
| Critical CSS (inlined) | ~1.5 KB | In `<head>` | Prevents FOUC ✅ |
| main.js | 68 KB | Script tag (no async/defer) | **Blocks parsing** ⚠️ |
| Google Fonts | ~30 KB (estimated) | Preconnect + preload | Non-blocking ✅ |
| GA4 (gtag) | ~25 KB | Async | Non-blocking ✅ |
| AdSense | ~50 KB | Async | Non-blocking ✅ |
| recipes.json | ~150 KB (estimated) | Fetch (runtime) | Depends on network |
| Hero image | ~200-500 KB | From TheMealDB CDN | No optimization 🔴 |

### 7.2 Render-Blocking Assessment

- `style.css` is **not render-blocking** (preload trick) ✅
- `main.js` **is render-blocking** (no `async` or `defer` attribute) ❌
- Google Fonts are **not render-blocking** (preload) ✅
- AdSense and GA4 are **async** ✅

**🟡 Issue**: `main.js` at 68 KB without async/defer blocks HTML parsing and rendering. This is the single largest performance bottleneck.

### 7.3 Image Optimization

- All recipe images served from TheMealDB CDN (`www.themealdb.com/images/media/meals/...`)
- **No** `srcset` for responsive images
- **No** WebP/AVIF format negotiation
- **No** lazy loading below the fold (hero image has `fetchpriority="high"`)
- **No** local image CDN or optimization pipeline
- **Risk**: 🟡 High — Largest Contentful Paint (LCP) is dominated by hero image loading

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

| Opportunity | Impact | Effort |
|-------------|--------|--------|
| Add `defer` or `async` to `<script src="main.js">` | High | Low |
| Add `loading="lazy"` to below-fold images | Medium | Low |
| Add image `srcset` for responsive breakpoints | High | Medium |
| Preload hero image on recipe pages | Medium | Low |
| Minify CSS/JS in CI pipeline | Medium | Low |
| Add resource hints (`preconnect` to TheMealDB CDN) | Low | Low |

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

**Missing** — GitHub Pages cannot set HTTP headers, and no `<meta>` CSP tag is present. Risk profile:

| Missing CSP Directive | Impact |
|-----------------------|--------|
| `script-src` | Any script can execute (AdSense, GA4, Groq CDN all loaded) |
| `img-src` | Any image source allowed |
| `connect-src` | Any fetch target allowed |
| `frame-ancestors` | Clickjacking possible |

**Risk**: 🟡 Medium — mitigated by static site nature (no user input, no forms except newsletter)
**Fix**: Add `<meta http-equiv="Content-Security-Policy">` tag

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
- ✅ **404 page** — custom with search form and recipe links
- ✅ **PWA standalone mode** — `display: standalone` in manifest

### 9.2 Issues

- **No pagination** — scrolling ~150 recipes at once may overwhelm users. All 148 recipes load at page load (from `recipes.json`). No load-more or infinite scroll.
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
| R1 | CI race condition cancels mid-build | CI/CD | Medium | High | 🔴 Critical |
| R2 | Google penalty for AI-generated content | SEO | Medium | Critical | 🔴 Critical |
| R3 | Empty/wrong sitemap from dual authority | SEO | Low | High | 🔴 High |
| R4 | No rollback from bad build | CI/CD | Low | High | 🔴 High |
| R5 | GAS pipeline timeout (6-min limit) | Automation | Low | High | 🔴 High |
| R6 | Content duplication penalty (TheMealDB source) | SEO | Medium | Medium | 🟡 High |
| R7 | main.js blocks rendering (68 KB, no defer) | Performance | Always | Medium | 🟡 Medium |
| R8 | LCP impacted by large unoptimized images | Performance | Always | Medium | 🟡 Medium |
| R9 | CLS from AdSense layout shift | Performance | High | Low | 🟡 Medium |
| R10 | No CSP — XSS/clickjacking risk | Security | Low | Medium | 🟡 Medium |
| R11 | GAS Script Properties key storage (no rotation) | Security | Low | Medium | 🟡 Low |
| R12 | No automated tests for build script | Maintainability | Always | Medium | 🟡 Medium |
| R13 | Single branch deployment (main) | CI/CD | Always | Medium | 🟡 Medium |
| R14 | FAQ content is fully templated across 148 recipes | SEO | Certain | Medium | 🔴 High |

### 10.2 Risk Treatment Plan

| Risk | Treatment | Priority |
|------|-----------|----------|
| R1 | Remove `cancel-in-progress` or add deployment lock | P1 |
| R2 | Vary AI prompts, increase temperature, add human review | P1 |
| R3 | Let only CI write sitemap.xml | P2 |
| R4 | Tag deployments, keep last N builds | P2 |
| R5 | Split pipeline or increase GAS quota tier | P2 |
| R6 | Add unique content (notes, video, personal experience) | P3 |
| R7 | Add `defer` to main.js | P3 |
| R8 | Add `srcset` and WebP support | P3 |
| R14 | Make FAQ template varied per category/cuisine | P2 |

---

## 11. Technical Debt Analysis

### 11.1 Debt Inventory

| Item | Type | Severity | Effort to Fix |
|------|------|----------|---------------|
| 4,037-line GAS file (`code.gs`) | Maintainability | High | High |
| 68 KB monolithic `main.js` | Performance | Medium | High |
| 59.7 KB monolithic `style.css` | Performance | Medium | High |
| Dual sitemap generation (GAS + CI) | Architecture | High | Low |
| No test coverage (GAS, build script, JS) | Quality | Medium | High |
| Inline critical CSS in HTML (duplicated across pages) | Maintainability | Low | Medium |
| No package.json scripts (manual `node` commands) | DX | Low | Low |
| `update-github.bat` duplicates CI logic | Redundancy | Low | Low |
| No linting/formatting configuration | Quality | Low | Low |

### 11.2 Debt Reduction Priorities

1. **Unify sitemap generation** (low effort, high return) — remove sitemap write from GAS, let CI own it
2. **Add CI build validation** (low effort, prevents silent corruption)
3. **Split `main.js`** (high effort, high performance return) — separate data fetching, routing, rendering, SW, SEO
4. **Split `code.gs`** (high effort, moderate return) — separate files for TheMealDB, Groq, GitHub, Dashboard

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
4. **No pagination**: All 148 recipes displayed at once. Performance degrades with more cards in DOM.

### 12.3 Scaling Recommendations

- **Client-side pagination**: Add limit/offset to recipe rendering, load-more or pagination component
- **Lazy route**: Only parse recipes visible in viewport
- **Parallelize CI**: Generate pages in parallel batches using GitHub Actions matrix strategy
- **GAS optimization**: Only AI-enrich on Fridays (bulk mode), skip enrichment in daily pipeline
- **CDN for images**: Set up a CDN layer or use Imgix/Cloudinary for TheMealDB image optimization

---

## 13. Priority Matrix

| Priority | ID | Issue | Risk | Effort | Category |
|----------|----|-------|------|--------|----------|
| **P1** | R1 | CI race condition (cancel-in-progress) | 🔴 | Low | CI/CD |
| **P1** | R2 | AI content penalty (low-temp templated output) | 🔴 | Medium | SEO |
| **P1** | R14 | Templated FAQ across all 148 recipes | 🔴 | Low | SEO |
| **P2** | R3 | Dual sitemap authority (GAS vs CI) | 🔴 | Low | SEO/CI |
| **P2** | R4 | No rollback from bad build | 🔴 | Medium | CI/CD |
| **P2** | R5 | GAS pipeline 6-min timeout risk | 🔴 | Medium | Automation |
| **P2** | R6 | Content duplication (TheMealDB origin) | 🟡 | High | SEO |
| **P3** | R7 | main.js render-blocking (no defer) | 🟡 | Low | Performance |
| **P3** | R8 | Large unoptimized hero images | 🟡 | Medium | Performance |
| **P3** | R9 | AdSense CLS impact | 🟡 | Medium | Performance |
| **P3** | R10 | Missing CSP header | 🟡 | Low | Security |
| **P3** | R12 | No automated tests | 🟡 | High | Quality |
| **P4** | R13 | Single branch deployment | 🟡 | Medium | CI/CD |
| **P4** | R11 | Key rotation process missing | 🟢 | Low | Security |

---

## 14. SAFE Roadmap Proposal

The SAFE (Stabilize → Audit → Fortify → Extend) approach prioritizes reliability and risk reduction before new features.

### Phase 1: Stabilize (Week 1-2)
- [ ] P1: Fix CI race condition (`cancel-in-progress: false`)
- [ ] P1: Diversify AI prompts (higher temperature, varied FAQ templates)
- [ ] P1: Add CI build validation (verify page count, HTML validity)
- [ ] P2: Remove sitemap generation from GAS (let CI own it)

### Phase 2: Audit (Week 3-4)
- [ ] P2: Add deployment tags/target branch protection
- [ ] P2: Review GAS pipeline execution logs for timeout patterns
- [ ] P3: Add `defer` to main.js script tag
- [ ] P3: Check Google Search Console for content quality signals

### Phase 3: Fortify (Month 2)
- [ ] P2: Add unique editorial content to recipe pages
- [ ] P3: Add responsive images (`srcset`, WebP)
- [ ] P3: Add CSP meta tag
- [ ] P4: Set up automated API key rotation

### Phase 4: Extend (Month 3+)
- [ ] Refactor main.js into modules
- [ ] Add pagination / infinite scroll
- [ ] Add RSS feed
- [ ] Add print stylesheet
- [ ] Add recipe rating/saving

---

## 15. DO NOT TOUCH YET

These systems are currently stable and carry high risk if modified without careful planning:

| System | Reason to Leave | Planned Intervention |
|--------|-----------------|---------------------|
| **GAS pipeline** (`code.gs`) | 4,037 lines, 50+ functions, 0 tests — any change risks breaking the daily publication flow | Phase 4 refactor after tests are in place |
| **Service Worker** (`sw.js`) | v5 is stable, serving correct caching strategy. SW logic is notoriously hard to debug once deployed | Only modify if cache miss patterns emerge |
| **recipes.json export logic** (`buildExportPayload_`) | The midnight timezone fix (lines 3299-3316) was carefully tuned. Modifying could break date filtering on homepage | Only modify with regression testing |
| **Slug generation** (both GAS and build script) | Must stay 100% in sync — different slug logic = broken URLs and 404s | Requires coordinated change across both systems |
| **Google Indexing API integration** | Working correctly, submitting 5 URLs/day. Service account config is fragile | Only modify if quota increases or auth flow changes |

---

*End of Audit Master Report. Generated 2026-05-15. This document is READ-ONLY — no project files were modified.*
