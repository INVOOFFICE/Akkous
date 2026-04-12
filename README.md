# Akkous

Blog de recettes **statique** (HTML, CSS, JavaScript), pensé pour **[GitHub Pages](https://pages.github.com/)**.  
Site public : **https://akkous.com** (fichier `CNAME` à la racine).

**Langue du site : anglais** (`lang="en"` sur l’accueil, métadonnées `og:locale`, JSON-LD `inLanguage`). Les recettes proviennent de **TheMealDB** (anglais) et l’enrichissement **Groq** dans Apps Script est configuré pour produire titre / instructions / tags en **anglais** (`RECIPE_CONTENT_LANGUAGE`).

Les données éditoriales vivent dans **`recipes.json`**. Le front charge ce fichier en **`fetch()`** ; un script Node génère des **pages HTML par recette** (`recipes/<slug>/index.html`) pour le SEO et les aperçus sociaux (Open Graph, JSON-LD).

---

## Sommaire

- [Architecture](#architecture)
- [Structure du dépôt](#structure-du-dépôt)
- [Langue du site et catégories](#langue-du-site-et-catégories)
- [Prérequis](#prérequis)
- [Développement local](#développement-local)
- [Contenu : `recipes.json`](#contenu--recipesjson)
- [Build des pages recette + sitemap](#build-des-pages-recette--sitemap)
- [GitHub Actions](#github-actions)
- [Automatisation Google (Sheets + Apps Script)](#automatisation-google-sheets--apps-script)
- [Git local et Apps Script](#git-local-et-apps-script)
- [Déploiement GitHub Pages](#déploiement-github-pages)
- [Dépannage](#dépannage)
- [Licence](#licence)

---

## Architecture

| Couche | Rôle |
|--------|------|
| **`index.html` + `main.js` + `style.css`** | Accueil en **anglais** : hero, carrousel, **catégories dynamiques** (taxonomie TheMealDB + recettes présentes), filtres, recherche, grille. |
| **`recipe.html` + `main.js`** | Page recette dynamique (`?id=…` ou URL `/recipes/<slug>/`). |
| **`recipes.json`** | Source de vérité : `{ site, recipes[] }` — dont le champ optionnel **`site.recipeCategoryTaxonomy`**. |
| **`recipes/<slug>/index.html`** | Généré par Node : même gabarit que `recipe.html`, métadonnées déjà dans le HTML. |
| **`sitemap.xml`** | Régénéré par le script Node (URLs canoniques `/recipes/<slug>/`). |
| **Apps Script** (`google-apps-script/code.gs`) | TheMealDB → feuille **Recipes** → export **PUBLISHED** → push **`recipes.json`** + **`sitemap.xml`** sur GitHub. |

---

## Structure du dépôt

| Chemin | Description |
|--------|-------------|
| `index.html` | Page d’accueil (`lang="en"`, signaux hreflang / `content-language`, descriptions SEO en anglais). |
| `recipe.html` | Modèle recette (utilisé en SPA et comme base du build statique). |
| `main.js` | Données, navigation, catégories (spotlight, pills, menu Browse), SEO dynamique, newsletter. |
| `style.css` | Thème et composants. |
| `recipes.json` | Contenu du blog (souvent mis à jour par Apps Script). |
| `recipes/` | Dossiers `recipes/<slug>/index.html` générés — **à versionner** avec Git. |
| `scripts/build-recipe-pages.mjs` | Générateur de pages statiques + `sitemap.xml` (slugs de **catégorie** alignés sur `main.js` / TheMealDB). |
| `.github/workflows/build-static-recipes.yml` | CI : régénère `recipes/` après un push sur `recipes.json`. |
| `google-apps-script/` | **`code.gs`**, **`AutomationDashboard.html`**, **[`README.md`](google-apps-script/README.md)** (guide détaillé Apps Script). |
| `assets/` | Favicon et fichiers statiques. |
| `conditions-utilisation.html`, `politique-confidentialite.html` | Pages légales en **français** (`lang="fr"`) ; l’accueil affiche des libellés EN avec `hreflang="fr"` vers ces URLs. |
| `contact.html` | Contact. |
| `robots.txt`, `ads.txt`, `.nojekyll` | SEO / annonces / désactivation Jekyll sur Pages. |

---

## Langue du site et catégories

- **HTML** : `<html lang="en" dir="ltr">`, meta `content-language`, `og:locale` (`en_US`), `hreflang` (`en`, `en-us`, `x-default`).
- **JSON-LD** (accueil) : `WebSite` avec `"inLanguage": "en"`.
- **Catégories** : plus de filtres figés « Breakfast / Lunch / Dinner ». Le script lit les catégories des recettes et, si présent, **`site.recipeCategoryTaxonomy`** (liste officielle **TheMealDB**, poussée par Apps Script après sync `categories.php`) pour l’ordre d’affichage **Browse by category**, les pills et le menu **Browse**.
- Les clés de filtre / `?cat=` sont des **slugs** dérivés du nom de catégorie (ex. `chicken`, `beef`).

---

## Prérequis

- **Navigateur** pour consulter le site.
- **Serveur HTTP local** pour développer (le `fetch` de `recipes.json` ne fonctionne pas en `file://`).
- **Node.js 18+** (recommandé 20) pour le générateur de pages ou la CI en local.

---

## Développement local

```bash
# Exemple avec Python
python -m http.server 8080

# Ou avec npx
npx serve .
```

Ouvre `http://localhost:8080` (ou le port indiqué).

---

## Contenu : `recipes.json`

Format racine :

```json
{
  "site": {
    "name": "Akkous",
    "canonicalOrigin": "https://akkous.com",
    "tagline": "…",
    "newsletterWebAppUrl": "…",
    "recipeCategoryTaxonomy": ["Beef", "Chicken", "Dessert", "…"]
  },
  "recipes": []
}
```

- **`recipeCategoryTaxonomy`** (optionnel mais recommandé) : ordre d’affichage des catégories sur l’accueil ; rempli par **Apps Script** à partir de l’API TheMealDB (`categories.php`, avec cache). Si absent, seules les catégories présentes dans les recettes sont listées.
- Chaque recette contient notamment : `id` / `slug`, `title`, `description`, **`category`** (nom TheMealDB, ex. `Chicken`), `ingredients`, `steps` (ou `instructions`), `image`, `author`, temps, `tags`, `datePublished`, etc.
- Côté **`main.js`** et **`build-recipe-pages.mjs`**, la **clé** de filtre / tri est un **slug** (ex. `chicken`) dérivé de `category`.

---

## Build des pages recette + sitemap

À la racine du dépôt :

```bash
node scripts/build-recipe-pages.mjs
```

Effets :

- crée ou met à jour **`recipes/<slug>/index.html`** pour chaque entrée valide ;
- réécrit **`sitemap.xml`** (home, pages statiques, une URL par recette) ;
- supprime les dossiers **`recipes/<slug>/`** qui ne sont plus dans `recipes.json`.

Ensuite : **commit** `recipes/`, `sitemap.xml`, et éventuellement `recipes.json`.

> **Attention :** si `recipes.json` est vide ou sans slugs valides, le script efface les pages générées précédemment. Garde un export correct avant un build en production.

---

## GitHub Actions

Workflow : **`.github/workflows/build-static-recipes.yml`**

- **Déclencheurs :** push sur `main` qui modifie **`recipes.json`**, ou exécution manuelle (**Run workflow**).
- **Étapes :** `checkout` → Node 20 → `node scripts/build-recipe-pages.mjs` → commit + push de `recipes/` et `sitemap.xml` si changements (bot `github-actions`).

**Important :** le dossier **`recipes/`** à la racine **ne doit pas** être dans **`.gitignore`** (sinon `git add recipes` échoue dans la CI).

---

## Automatisation Google (Sheets + Apps Script)

Guide détaillé : **[`google-apps-script/README.md`](google-apps-script/README.md)** (menu ①–⑰, `CONFIG`, déclencheurs, secrets, dépannage).

| Fichier | Usage |
|---------|--------|
| **`code.gs`** | **TheMealDB** (données **anglais**) → feuille **Recipes** (`SCHEDULED` / `PUBLISHED`), planification (`PUBLISH_STAGGER` : `batch` / `day` / `hour`), sync **catégories** via `categories.php`, **Groq** (SEO, sortie alignée sur `RECIPE_CONTENT_LANGUAGE`, défaut `en`), découpe **étapes** sans invention, export **PUBLISHED**, push GitHub, GSC, newsletter (`doPost`). |
| **`AutomationDashboard.html`** | Dans le même projet Apps Script, nom **`AutomationDashboard`** — menu **⑦** (panneau latéral). |

**Propriétés du script** (recommandé pour les secrets) : `GITHUB_TOKEN`, `GITHUB_REPO`, `GROQ_API_KEY`, `GSC_CLIENT_EMAIL`, `GSC_PRIVATE_KEY`, `NEWSLETTER_WEB_APP_URL`, etc.

**Points clés :**

- **Pipeline quotidien** (défaut) : un trigger enchaîne **fetch** → **mark PUBLISHED** → **push GitHub** (`USE_CHAINED_PIPELINE_TRIGGER`).
- **Export** : uniquement les lignes **PUBLISHED** ; le push est **annulé** s’il n’y a **aucune** recette à exporter (évite d’écraser avec `recipes: []`).
- **SEO quality gate** : journalise des **WARN** ; il **ne bloque plus** l’inclusion des recettes dans `recipes.json`.
- Les pages **`recipes/<slug>/`** sont générées par **GitHub Actions** ou **`node scripts/build-recipe-pages.mjs`**, pas par Apps Script.

---

## Git local et Apps Script

Si **Apps Script** pousse aussi sur **`main`**, ton clone local peut être en retard. Avant un **`git push`** :

```bash
git pull --rebase origin main
git push origin main
```

En cas de conflit (souvent sur `recipes/` ou `recipes.json`), résoudre puis `git rebase --continue`, ou régénérer les pages avec `node scripts/build-recipe-pages.mjs` après fusion.

---

## Déploiement GitHub Pages

1. Pousser ce dépôt sur GitHub.
2. **Réglages → Pages** : source **Deploy from a branch**, branche **`main`**, dossier **`/` (root)**.
3. Le fichier **`.nojekyll`** évite que Jekyll ignore des fichiers nécessaires.

Les liens relatifs fonctionnent pour un site projet (`username.github.io/repo/`) ou un domaine custom (`CNAME`).

---

## Dépannage

| Problème | Piste |
|----------|--------|
| Page blanche ou pas de recettes en local | Servir le site via **http://**, pas `file://`. |
| `recipes.json` vide sur GitHub | Lignes **PUBLISHED** + dates passées ; push annulé si **0** recette exportée. |
| `git push` refusé (`fetch first`) | **`git pull --rebase origin main`** puis pousser (voir [Git local et Apps Script](#git-local-et-apps-script)). |
| Workflow Actions en échec sur `git add recipes` | Ne pas ignorer **`recipes/`** dans `.gitignore`. |
| Sitemap sans URLs recettes | Relancer le build Node ; vérifier que `recipes[]` n’est pas vide. |
| Catégories vides sur l’accueil | Vérifier `recipes.json` et **`site.recipeCategoryTaxonomy`** après un push Apps Script. |
| Texte recettes en français | Apps Script : **`RECIPE_CONTENT_LANGUAGE: 'en'`** et re-enrichir avec Groq si besoin. |

---

## Licence

Utilisation et modification libres pour ton propre blog.
