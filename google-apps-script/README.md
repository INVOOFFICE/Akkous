# Apps Script — `code.gs` (Akkous)

Ce dossier versionne le script **Google Apps Script** à coller dans le projet lié à ton classeur Google Sheets. Il automatise : import des recettes **TheMealDB**, planification, enrichissement SEO (**Groq**), export **`recipes.json`** + **`sitemap.xml`** vers **GitHub**, newsletter, indexation GSC, journalisation.

---

## Installation

1. Ouvre ton classeur Google → **Extensions** → **Apps Script**.
2. Crée ou remplace le contenu du fichier principal par **`code.gs`** (copier-coller depuis ce dépôt).
3. **Enregistre** le projet (`Ctrl+S`).
4. Exécute une fois **`testFetch`** depuis l’éditeur (liste des fonctions) et **accepte les autorisations** (accès réseau vers TheMealDB, Sheets, et éventuellement GitHub / Groq).
5. Reviens sur la feuille : menu **🍳 Akkous (tests)** (recharge la page `F5` si le menu n’apparaît pas).

**Script autonome** (sans classeur lié) : renseigne `CONFIG.SHEET_ID` avec l’ID du classeur (segment de l’URL `.../spreadsheets/d/ICI/...`).

---

## Fichiers du dossier

| Fichier | Rôle |
|---------|------|
| **`code.gs`** | Toute la logique (CONFIG, menu, API, export, triggers). |
| **`AutomationDashboard.html`** | À ajouter dans le **même** projet Apps Script sous le nom exact **`AutomationDashboard`** (fichier HTML) pour le menu **⑦ Rapport** — copie depuis `automation-dashboard.html` à la racine du dépôt si besoin. |

---

## Feuille `Recipes`

Colonnes (créées automatiquement si besoin) : **ID**, **Title**, **Category**, **Origin**, **Image URL**, **Ingredients**, **Instructions**, **Tags**, **Publish Date**, **Status**, **Slug**, **YouTube**, **Added Date**.

- **Status** : `SCHEDULED` (import) → `PUBLISHED` quand la **Publish Date** est passée (menu **③** ou pipeline).
- L’**export GitHub** n’inclut en principe que les lignes **PUBLISHED**.

---

## Menu du classeur (🍳 Akkous)

| Entrée | Fonction |
|--------|----------|
| **①** | Une recette aléatoire TheMealDB → journal (test API). |
| **②** | Récupère jusqu’à **`RECIPES_PER_DAY`** recettes, les planifie (`SCHEDULED`), applique **Groq** sur les nouvelles lignes si clé + option activés. |
| **③** | Passe en **PUBLISHED** les `SCHEDULED` dont la date/heure de publication est déjà dépassée. |
| **④** | Construit le JSON et pousse **`recipes.json`** + **`sitemap.xml`** sur GitHub (un commit). |
| **⑤** | Archive puis supprime les recettes **PUBLISHED** trop anciennes (`CLEANUP_DAYS`). |
| **▶ ②+③** | Chaîne test fetch + marquage (sans push). |
| **▶ ②→③→④** | Même chaîne que le déclencheur quotidien (fetch → mark → push). |
| **⑦** | Panneau rapport (nécessite `AutomationDashboard.html`). |
| **⑧** | Ouvre l’onglet **AutomationLog**. |
| **⑨** | Installe les **déclencheurs** (voir ci-dessous). |
| **⑩** | Supprime les déclencheurs créés par **⑨**. |
| **⑪–⑫** | Newsletter : feuille inscrits + aide Web App. |
| **⑬** | Indexation Google Search Console (batch manuel). |
| **⑭** | Aperçu audit SEO export. |
| **⑮** | Export Pinterest. |
| **⑯ / ⑰** | Enrichissement Groq (sélection ou toutes les `SCHEDULED` si autorisé en CONFIG). |

---

## Déclencheurs (automatisation quotidienne)

- Par défaut **`USE_CHAINED_PIPELINE_TRIGGER: true`** : **un seul** trigger quotidien appelle **`dailyAkkousChainedPipeline_`** à **`TRIGGER_PIPELINE_HOUR`** — enchaîne **fetch** → **markPublished** → **push GitHub** (chaque étape isolée en `try/catch`).
- Si tu passes à **`false`**, **⑨** recrée **trois** triggers aux heures **`TRIGGER_FETCH_HOUR`**, **`TRIGGER_MARK_PUBLISHED_HOUR`**, **`TRIGGER_PUSH_GITHUB_HOUR`** (l’ordre le même jour n’est pas garanti par Google).

Autres triggers possibles après **⑨** : indexation GSC, nettoyage hebdomadaire (`TRIGGER_CLEAN_*`).

Après une mise à jour du code : **⑩** puis **⑨** pour recréer les bons handlers.

---

## `CONFIG` (principaux réglages)

Tout est dans l’objet **`CONFIG`** en tête de `code.gs` :

| Clé | Rôle |
|-----|------|
| `SHEET_ID` | `''` si script lié au classeur. |
| `RECIPES_PER_DAY` | Nombre de recettes ajoutées par run **②**. |
| `PUBLISH_STAGGER` | `batch` (même date pour le lot), `day`, ou `hour`. |
| `PUBLISH_HOUR` | Heure locale du script pour les dates de publication. |
| `API_BASE` | API TheMealDB **v1** (données en **anglais**). |
| `RECIPE_CONTENT_LANGUAGE` | `en` : consigne Groq pour titres / instructions / tags en anglais. |
| `CATEGORIES` | Liste de secours ; la liste réelle est synchronisée via **`categories.php`** (cache propriétés, TTL `CATEGORIES_API_CACHE_HOURS`). |
| `GITHUB_*` | Dépôt, branche, chemins `recipes.json` / `sitemap.xml`. Secrets → **propriétés du script**. |
| `GEMINI_ENRICH_AFTER_FETCH` | Groq après chaque **②** sur les nouvelles lignes. |
| `SEO_QUALITY_GATE_ENABLED` | Contrôle qualité SEO en **WARN** uniquement — **ne bloque plus** l’export. |

Les **secrets** (token GitHub, clé Groq, clés GSC, URL newsletter) doivent idéalement vivre dans **Projet → Paramètres → Propriétés du script**, pas en dur dans `CONFIG`.

---

## Propriétés du script (recommandé)

| Clé | Usage |
|-----|--------|
| `GITHUB_TOKEN` | PAT GitHub (scope **repo** / contenu). |
| `GITHUB_REPO` | `propriétaire/nom` (ex. `INVOOFFICE/Akkous`). |
| `GROQ_API_KEY` | Console Groq — enrichissement SEO. |
| `GSC_CLIENT_EMAIL` / `GSC_PRIVATE_KEY` | Indexing API (optionnel). |
| `NEWSLETTER_WEB_APP_URL` | URL `/exec` de la Web App newsletter. |
| `SPREADSHEET_ID` | Si besoin pour `doGet` / Web App hors contexte classeur. |

Le cache des catégories TheMealDB est stocké automatiquement (`THE_MEALDB_CATEGORIES_*`).

---

## Chaîne de données

1. **TheMealDB** (`filter.php`, `lookup.php`, `random.php`, `categories.php`) → objets repas en anglais.
2. **`mealToRow_`** → ligne **Recipes** (ingrédients concaténés, instructions nettoyées, slug).
3. **Groq** (optionnel) → réécrit **Title**, **Instructions**, **Tags** selon `RECIPE_CONTENT_LANGUAGE`.
4. **`markPublishedRecipes`** → bascule **SCHEDULED** → **PUBLISHED** selon la date.
5. **`buildExportPayload_`** → `{ site, recipes[] }` avec `site.recipeCategoryTaxonomy`, auteur blog, étapes validées, etc.
6. **`pushRecipesToGitHub`** → commit API GitHub ; le site statique et/ou **GitHub Actions** régénèrent les pages HTML.

---

## Dépannage rapide

| Symptôme | Piste |
|----------|--------|
| Menu absent | Recharger la feuille ; script doit être **lié** au classeur. |
| **③** ne publie rien | **Publish Date** encore dans le futur ; ou statut ≠ `SCHEDULED`. |
| **④** annulé | Aucune ligne **PUBLISHED** à exporter (pas lié au SEO gate). |
| Push refusé | Vérifier token, repo, branche ; **pull** sur la machine locale si tu commits aussi à la main. |
| Recettes en français | Vérifier **`RECIPE_CONTENT_LANGUAGE: 'en'`** et re-lancer Groq (**⑯**) sur les lignes concernées. |
| Erreur **⑦** | Ajouter le fichier HTML **`AutomationDashboard`** dans le projet Apps Script. |

---

## Voir aussi

- README à la racine du dépôt : architecture site, **`recipes.json`**, build Node, GitHub Actions.
- Commentaires en tête de **`code.gs`** : setup détaillé, permissions, comportement publication.
