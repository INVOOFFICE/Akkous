# Akkous — static recipe blog

A mobile-first food blog built with **HTML, CSS, and vanilla JavaScript**, ready for [GitHub Pages](https://pages.github.com/). The homepage and `recipe.html` work **without** a build: push the repo and enable Pages from the root (or `/docs` if you move files—this project expects `index.html` at the site root).

**SEO (optional but recommended):** run `node scripts/build-recipe-pages.mjs` after changing `recipes.json` to generate **`recipes/<slug>/index.html`** for each recipe (Open Graph + JSON-LD in the initial HTML) and refresh **`sitemap.xml`**. Commit the `recipes/` folder with the rest. This complements Pinterest and search engines: each pin or crawler hits a **real URL** with **`og:title`**, **`og:description`**, and **`og:image`** already in the document.

## Run locally

Because the site loads `recipes.json` with `fetch()`, open it through a local server (not as a `file://` URL):

```bash
# Python 3
python -m http.server 8080

# Node (npx)
npx serve .
```

Then visit `http://localhost:8080` (or the port shown).

## Deploy on GitHub Pages

1. Push this folder to a GitHub repository.
2. **Settings → Pages → Build and deployment**: Source **Deploy from a branch**, branch **main** (or **master**), folder **`/` (root)**.
3. The root file **`.nojekyll`** tells GitHub not to process the site with Jekyll (so files like `recipes.json` are served as-is).

Asset links are **relative** (`style.css`, `assets/…`). Recipe links from the UI point to **`/recipes/<slug>/`** when static pages exist; **`recipe.html?id=<id>`** remains supported as a fallback. Relative paths resolve for both `username.github.io/repo-name/` project sites and custom domains.

## Content: `recipes.json`

**`recipes.json` is the single source of truth.** The homepage and every recipe page read from it at runtime.

### Top-level shape

| Field | Purpose |
|--------|---------|
| `site` | Blog name, tagline, newsletter copy. |
| `recipes` | Array of recipe objects. |

### `site` object

| Field | Required | Description |
|--------|----------|-------------|
| `name` | Recommended | Shown in the header, footer, and titles. |
| `tagline` | Optional | Not rendered by default; available for future use. |
| `logoText` | Optional | Same as `name` unless you want a shorter logo label. |
| `newsletterHeading` | Optional | Heading above the signup form. |
| `newsletterSubtext` | Optional | Subtext under the heading. |

### Each recipe object

| Field | Required | Description |
|--------|----------|-------------|
| `id` | **Yes** | Stable slug (lowercase, hyphens). Canonical recipe URLs: **`/recipes/your-id/`** after the static build; legacy **`recipe.html?id=your-id`** still works. |
| `title` | **Yes** | Display name. |
| `description` | **Yes** | Short summary (SEO, cards, intro). |
| `author` | **Yes** | Object: `name` (string), `avatar` (image URL). |
| `cookTime` | Recommended | Label shown on cards, e.g. `"28 min"`. Used for Schema.org `cookTime` when it matches `… min`. |
| `prepTime` | Optional | Same format; maps to Schema.org `prepTime` when parseable. |
| `totalTime` | Optional | Fallback label if `cookTime` is missing. |
| `servings` | Recommended | Number; shown on the recipe page and in JSON-LD `recipeYield`. |
| `difficulty` | Recommended | e.g. `"Easy"`, `"Medium"`, `"Hard"` (badge on grid cards). |
| `category` | **Yes** | One of: `breakfast`, `lunch`, `dinner`, `desserts`, `drinks` (lowercase). Drives filters and navigation. |
| `tags` | Optional | String array; first tag can appear on trending cards; all feed search. |
| `featured` | Optional | If `true`, pinned first in the homepage hero carousel when present. |
| `trending` | Optional | Legacy flag (homepage now shows latest recipes by publish date). |
| `image` | **Yes** | Full-width hero URL. |
| `imageCard` | Optional | Taller/card crop; falls back to `image`. |
| `ingredients` | **Yes** | Array of strings (one line each). |
| `steps` | **Yes** | Array of strings (one paragraph per step). |
| `relatedRecipeIds` | Optional | Array of other recipes’ `id` values for the “Related recipes” section (up to three are shown). |
| `datePublished` | Optional | ISO date string for Schema.org (default in code is `2026-01-01` if omitted). |

### Adding a new recipe

1. Copy an existing entry in the `recipes` array.
2. Assign a **unique** `id`.
3. Set `category` to one of the six values above.
4. Use **absolute** image URLs (e.g. from your repo under `assets/` as `assets/my-photo.jpg`, or a CDN).
5. Optionally set `featured: true` to pin one recipe first in the hero carousel.
6. List `relatedRecipeIds` pointing at real `id` values.

After you commit and push, GitHub Pages will serve the updated JSON on the next deploy. If you use the SEO build, run **`node scripts/build-recipe-pages.mjs`** before pushing so new or changed recipes get matching **`recipes/<slug>/index.html`** files (important for Pinterest previews and Google).

## Files

| File | Role |
|------|------|
| `index.html` | Homepage layout and sections. |
| `recipe.html` | Recipe template; content filled by `main.js`. |
| `style.css` | Layout, theme (light/dark), components. |
| `main.js` | Data load, filters, search, recipe view, SEO helpers, UI behavior. |
| `recipes.json` | All editorial content. |
| `recipes/<slug>/index.html` | Generated by `scripts/build-recipe-pages.mjs` (SEO + social previews in HTML). |
| `scripts/build-recipe-pages.mjs` | Builds static recipe pages and rewrites `sitemap.xml`. |
| `assets/` | Static files (e.g. `favicon.svg`). |
| `.nojekyll` | Disables Jekyll on GitHub Pages. |

## Social previews (Open Graph) and Pinterest

- **Static recipe URLs** (`/recipes/<slug>/`): meta tags are **in the HTML** from the build—best for **Pinterest Rich Pins**, messaging apps, and Google.
- **`recipe.html`**: tags are **updated in JavaScript** after `recipes.json` loads; fine for the live site, weaker for bots that do not execute JS.

Pin the **canonical recipe URL** (the `/recipes/.../` page) so previews use the baked-in `og:image` and title.

## Project status (updated)

The blog is currently in a production-ready state with active SEO and automation hardening:

- Homepage upgraded to a modern layout (hero carousel, latest slider, category spotlight, trust strip, polished mobile UI).
- Recipe pages include dynamic SEO meta updates, Recipe + Breadcrumb JSON-LD, and a visible FAQ block with FAQPage JSON-LD.
- Core SEO files are in place at root: `robots.txt`, `sitemap.xml`, `ads.txt`, Search Console verification file.
- Legal/contact pages are available and linked in footers:
  - `conditions-utilisation.html`
  - `politique-confidentialite.html`
  - `contact.html` (contact form opens WhatsApp to `+212630230803`)
- Card imagery now uses descriptive `alt` text generated from recipe data.
- Canonical and social tags are set on home and updated dynamically on recipe pages.

## Google Apps Script automation (sheet → site)

`google-apps-script/code.gs` handles:

- Daily fetch/schedule/publish workflow for recipes.
- GitHub push for both `recipes.json` and `sitemap.xml` in one run (HTML under `recipes/<slug>/` is **not** generated in Apps Script—run `node scripts/build-recipe-pages.mjs` locally after pulling or editing JSON, then push again if you want static pages on Pages).
- SEO quality gate during export (minimum content checks, auto-enrichment, auto-related recipes).
- Daily GSC indexing batch trigger (`submitDailyIndexingBatchToGsc`) using service-account credentials from Script Properties.
- Weekly SEO monitoring report data (`getSeoMonitoringReport`) used by the dashboard.

`google-apps-script/AutomationDashboard.html` now includes:

- Automation log table (INFO/WARN/ERROR).
- SEO monitoring cards for 7-day KPIs (errors, warnings, index submissions, success rate).
- Top SEO errors and prioritized “pages to improve” list.

## Script properties required (recommended)

- `GITHUB_TOKEN`
- `GITHUB_REPO`
- `NEWSLETTER_WEB_APP_URL`
- `GSC_CLIENT_EMAIL`
- `GSC_PRIVATE_KEY`
- `SPREADSHEET_ID` (required for Web App dashboard mode if not bound to an active sheet)

## License

Use and modify freely for your own blog.
