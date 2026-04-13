# Akkous

Static recipe blog (HTML, CSS, JavaScript) built for **[GitHub Pages](https://pages.github.com/)**.  
Public site: **https://akkous.com** (with a root `CNAME` file).

This project is now documented and maintained as **English-only**.

---

## Table of contents

- [Overview](#overview)
- [Repository structure](#repository-structure)
- [Language policy (English only)](#language-policy-english-only)
- [Local development](#local-development)
- [`recipes.json` format](#recipesjson-format)
- [Build static recipe pages + sitemap](#build-static-recipe-pages--sitemap)
- [GitHub Actions](#github-actions)
- [Google Apps Script automation](#google-apps-script-automation)
- [Git workflow with Apps Script](#git-workflow-with-apps-script)
- [GitHub Pages deployment](#github-pages-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

| Layer | Role |
|------|------|
| `index.html` + `main.js` + `style.css` | English homepage: hero, spotlight, latest slider, dynamic categories, filters, search, grid. |
| `recipe.html` + `main.js` | Dynamic recipe page (`?id=...`) and fallback template. |
| `recipes.json` | Source of truth: `{ site, recipes[] }`, including optional `site.recipeCategoryTaxonomy`. |
| `recipes/<slug>/index.html` | Generated static pages for SEO/social previews. |
| `sitemap.xml` | Rebuilt from the static page generator. |
| `google-apps-script/code.gs` | Fetches TheMealDB data, schedules/publishes recipes, enriches SEO fields, pushes `recipes.json` and `sitemap.xml`. |

---

## Repository structure

| Path | Description |
|------|-------------|
| `index.html` | Homepage (`lang="en"`, English metadata, English labels). |
| `recipe.html` | Recipe template page. |
| `main.js` | Rendering logic, navigation, category handling, SEO helpers, newsletter logic. |
| `style.css` | Site styles and responsive behavior. |
| `recipes.json` | Editorial/data payload used by the frontend and static generation. |
| `recipes/` | Generated static recipe pages; versioned in Git. |
| `scripts/build-recipe-pages.mjs` | Generates `recipes/<slug>/index.html` and updates `sitemap.xml`. |
| `.github/workflows/build-static-recipes.yml` | CI workflow for static page rebuilds when `recipes.json` changes. |
| `google-apps-script/` | Apps Script source and documentation. |
| `conditions-utilisation.html`, `politique-confidentialite.html`, `contact.html` | Legal/contact pages in English content. |

---

## Language policy (English only)

- All public pages must use English content.
- HTML language attributes should be `lang="en"` where applicable.
- SEO metadata should stay English (`og:locale` as `en_US`, JSON-LD `inLanguage` as `en`).
- Recipe enrichment in Apps Script must keep `RECIPE_CONTENT_LANGUAGE: 'en'`.
- Category names are based on TheMealDB taxonomy and displayed in English.

---

## Local development

Run the site through an HTTP server (not `file://`):

```bash
python -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

---

## `recipes.json` format

```json
{
  "site": {
    "name": "Akkous",
    "canonicalOrigin": "https://akkous.com",
    "recipeCategoryTaxonomy": ["Beef", "Chicken", "Dessert"]
  },
  "recipes": []
}
```

Notes:
- `site.recipeCategoryTaxonomy` controls category display order (recommended).
- `category` values are stored as names (for example `Chicken`), while filters use slugs (for example `chicken`).

---

## Build static recipe pages + sitemap

From the repository root:

```bash
node scripts/build-recipe-pages.mjs
```

This command:
- creates/updates `recipes/<slug>/index.html`;
- rewrites `sitemap.xml`;
- removes stale recipe folders not present in `recipes.json`.

---

## GitHub Actions

Workflow: `.github/workflows/build-static-recipes.yml`

- Trigger: push to `main` when `recipes.json` changes, or manual run.
- Steps: checkout -> Node -> static build -> commit/push generated changes.

Keep `recipes/` tracked in Git (do not ignore it).

---

## Google Apps Script automation

Detailed guide: [`google-apps-script/README.md`](google-apps-script/README.md)

High-level flow:
1. Fetch from TheMealDB (English source).
2. Write/update `Recipes` sheet rows.
3. Mark scheduled rows as published by date.
4. Export `recipes.json` and `sitemap.xml`.
5. Push to GitHub.

Key setting for language:
- `RECIPE_CONTENT_LANGUAGE: 'en'`

---

## Git workflow with Apps Script

If Apps Script and local Git both update `main`, sync before pushing:

```bash
git pull --rebase origin main
git push origin main
```

If conflicts occur (usually in `recipes/` or `recipes.json`), resolve and continue rebase.

---

## GitHub Pages deployment

1. Push repository to GitHub.
2. In repository settings -> Pages:
   - Source: Deploy from branch
   - Branch: `main`
   - Folder: `/` (root)
3. Keep `.nojekyll` in place.

---

## Troubleshooting

| Problem | Check |
|---------|-------|
| No recipes in local view | Serve via HTTP, not `file://`. |
| Empty `recipes.json` export | Ensure rows are `PUBLISHED` and publication dates are reached. |
| Push rejected (`fetch first`) | Run `git pull --rebase origin main` before pushing. |
| CI cannot add `recipes/` | Ensure `recipes/` is not ignored. |
| Missing category pills/menu | Validate `recipes.json` and optional `site.recipeCategoryTaxonomy`. |
| Non-English text appears | Check content source + keep `RECIPE_CONTENT_LANGUAGE: 'en'`. |
