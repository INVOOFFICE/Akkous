# Audit — Akkous (May 2026)

## Project Overview

**Akkous** is an English static recipe blog hosted on GitHub Pages at `https://akkous.com/`. Built with vanilla HTML, CSS, and JavaScript (no framework). Uses a Google Sheets + Apps Script backend for content management with TheMealDB integration.

---

## 1. Structure

```
Akkous-main/
├── index.html              # Homepage (hero, trending, grid, newsletter)
├── recipe.html             # Dynamic recipe page (?id=...)
├── main.js                 # ~2900 lines — all rendering, nav, SEO, newsletter logic
├── style.css               # ~2800 lines — full site styles + responsive + PWA
├── sw.js                   # Service worker (v5)
├── manifest.webmanifest    # PWA manifest
├── recipes.json            # Data source (site config + recipes array)
├── recipes/                # Generated static <slug>/index.html pages for SEO
├── google-apps-script/     # Apps Script code.gs + README
├── scripts/                # Build scripts (static page generation)
├── .github/workflows/      # CI: rebuild static pages on recipes.json change
├── assets/                 # favicon.svg, robots.txt, llms.txt
├── offline.html            # Offline fallback page
├── contact.html            # Contact page
├── privacy-policy.html     # Privacy policy
├── terms-of-use.html       # Terms of use
├── conditions-utilisation.html  # French terms (legacy?)
├── politique-confidentialite.html # French privacy (legacy?)
├── sitemap.xml             # SEO sitemap
├── robots.txt              # SEO robots
└── CNAME                   # Custom domain: akkous.com
```

---

## 2. Architecture Assessment

| Layer | Stack | Notes |
|-------|-------|-------|
| Frontend | Vanilla JS, CSS, HTML | No build step for JS/CSS |
| Data | `recipes.json` | Fetched at runtime, also used for static page generation |
| Backend | Google Apps Script | Fetches TheMealDB, manages sheets, publishes recipes, pushes JSON |
| Hosting | GitHub Pages | Static site, custom domain |
| CI | GitHub Actions | Rebuilds `recipes/` when `recipes.json` changes |
| PWA | Service Worker (v5) | Cache-first static assets, stale-while-revalidate data, network-first pages with offline fallback |

---

## 3. Key Features

### Homepage (`index.html`)
- **Hero carousel** — features up to 7 recipes, auto-rotates every 7s, respects `prefers-reduced-motion`
- **Category spotlight grid** — emoji + label + count per category
- **Trending/latest slider** — horizontal scroll with nav buttons
- **Category filter pills** — filters the grid below
- **Search** — real-time filtering with URL query param sync
- **Newsletter** — posts to Google Apps Script web app via iframe
- **Masonry recipe grid** — 1/2/3 columns responsive
- **Dark mode toggle** — respects system preference, persisted in localStorage
- **Mobile navigation** — hamburger menu under 960px
- **Back to top button**

### Recipe Page (`recipe.html`)
- Dynamic by `?id=` parameter or URL path `/recipes/<slug>/`
- JSON-LD structured data (Recipe, BreadcrumbList, FAQPage, VideoObject)
- Open Graph / Twitter Card meta injection
- Ingredient checklist with strikethrough
- Step-by-step instructions with numbered circles
- YouTube video embed
- Tags display
- FAQ accordion
- Chef's tip box
- Sticky jump nav

### Service Worker
- Precaches: `/offline.html`, `/style.css`, `/main.js`, `/assets/favicon.svg`
- Cache strategies:
  - Static assets → cache-first
  - `recipes.json` → stale-while-revalidate (24h TTL)
  - HTML pages → network-first (3s timeout) with offline fallback
- Versioned caching (v5), cleans old caches on activate

### PWA
- `manifest.webmanifest` with standalone display, shortcuts, SVG icon
- `beforeinstallprompt` handled with custom dismissable banner (7-day cooldown)

### SEO
- Canonical URLs, hreflang (`en`, `en-us`, `x-default`)
- JSON-LD Organization, WebSite, SearchAction
- Open Graph + Twitter Cards
- Robots meta with `max-image-preview:large`
- Pinterest Rich Pin + domain verify
- Google AdSense + Analytics (GA4)

---

## 4. Files Detail

### `index.html` (399 lines)
- Inline critical CSS for hero/nav above-the-fold
- Preloads `recipes.json`, Google Fonts
- Deferred `main.js` loading
- Full semantic HTML with ARIA labels
- Skip-to-content link
- Structured data in `<script type="application/ld+json">`

### `main.js` (~2900 lines)
- IIFE pattern with `"use strict"`
- State object for data, recipes, site config, active category, search
- All rendering functions, carousel logic, event handlers
- Newsletter iframe-based submission with timeout
- JSON-LD schema generation (Recipe, BreadcrumbList, FAQPage)
- Dynamic category derivation from taxonomy vs recipe data
- Recipe ID resolution by id/slug/mealId
- No imports, no modules — everything in one file

### `style.css` (~2800 lines)
- CSS custom properties for theming (light + dark)
- Responsive breakpoints at 420px, 480px, 560px, 768px, 860px, 900px, 960px
- `content-visibility: auto` on sections for performance
- `scroll-margin-top` for anchor navigation
- PWA install banner styling
- Recipe page specific styles (hero, ingredients, steps, FAQ, share, sidebar)

### `sw.js` (154 lines)
- Clean, well-structured service worker
- Proper cache versioning and cleanup
- 3 cache stores: static, data, pages

---

## 5. Data Flow

1. Apps Script fetches recipes from TheMealDB API
2. Data written to Google Sheets (Recipes sheet)
3. On publish, scripts generate `recipes.json` + commit/push to GitHub
4. GitHub Actions builds static `recipes/<slug>/index.html` pages
5. Browser fetches `recipes.json` and renders dynamically
6. Search engines get pre-rendered static pages from `recipes/`

---

## 6. Issues & Recommendations

### Critical
- **French pages still present**: `conditions-utilisation.html`, `politique-confidentialite.html` — these violate the English-only policy stated in README, remove or redirect
- **No favicon for non-SVG browsers**: Only `favicon.svg` exists, add `.ico` fallback
- **No social share image on recipe pages**: `og:image` only set if `recipe.image` exists, should have a fallback
- **`main.js` is monolithic**: ~2900 lines single file, consider splitting into modules

### Medium
- **No CSP headers**: Content-Security-Policy not set in HTML meta or server headers
- **Inline critical CSS in `index.html`**: Good for performance, but duplicates selectors in `style.css`
- **No npm package.json**: Hard to track dependencies or add dev tooling
- **No ESLint config**: Code style not enforced
- **No alt text on hero images for non-recipe images**: The `.hero__media img` alt is set dynamically but generic

### Low
- **Mixed naming conventions**: Some `snake_case`, some `camelCase`, some `BEM` in CSS
- **Console logs in production**: `console.log("SW registered")` in main.js
- **No semantic release / changelog**: Hard to track breaking changes
- **No image optimization pipeline**: Images served as-is from source URLs
- **No accessibility audit results**: ARIA labels present but actual screen reader testing unknown

---

## 7. Recent Changes (Last Commit: `cba204b`)

**"stabilize modular docs architecture"** — May 10, 2026

- Merged INVO-main project files into a `Desktop/INVO-main/` path within the repo (later deleted)
- Added `audit_rapport.md` for INVO project
- Refactored INVO's `docs.js` into modular sub-modules (`client-form.js`, `dgi-checker.js`, `history-export.js`, etc.)
- Added new Streamlit-based PDF converter app (`app.py`, `converters/`, `components/`, `utils/`)
- Updated multiple CSS files for INVO's layout shell and responsive behavior
- Added `.devcontainer/devcontainer.json`, `packages.txt`, `requirements.txt`

---

## 8. Summary

| Metric | Value |
|--------|-------|
| Total HTML pages | 10 (including generated recipe pages) |
| JS lines | ~2900 |
| CSS lines | ~2800 |
| Service worker | v5 |
| Dependencies | None (vanilla) |
| CI workflows | 1 (GitHub Actions) |
| Domain | akkous.com |
| Language | English-only policy |
