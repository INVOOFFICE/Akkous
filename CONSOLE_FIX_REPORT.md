# Console Fix Report — 2026-05-15

## Erreurs initiales
1. `core.js`, `ui.js`, `recipe.js` → 404 Not Found (pages recette)
2. `main.js.backup` → 404 Not Found (pages recette)
3. CSP bloque AdSense (frame-src, connect-src, img-src)
4. Preload `recipes.json` → warning (chemin relatif)
5. AdSense framing errors (lié au CSP)
6. Unsafe URL loading from chrome-error (lié au test local)

## Correctifs appliqués

### Fix 1 — main.js.backup path
- **Fichier**: `main.js`
- **Avant**: `s.src = "main.js.backup"` (relatif → 404 depuis `/recipes/<slug>/`)
- **Après**: `s.src = "/main.js.backup"` (absolu)
- **Aussi**: `querySelector('script[src="/main.js.backup"]')` (guard aligné)

### Fix 2 — Script paths dans recipe.html
- **Fichier**: `recipe.html`
- **Avant**: `src="js/core.js"`, `src="js/ui.js"`, `src="js/recipe.js"`, `src="main.js"` (relatifs)
- **Après**: `src="/js/core.js"`, `src="/js/ui.js"`, `src="/js/recipe.js"`, `src="/main.js"` (absolus)
- **Impact**: Les pages générées (`recipes/<slug>/index.html`) héritent des chemins absolus via le template

### Fix 3 — CSP AdSense
- **Fichiers**: index.html, recipe.html, 404.html, offline.html, contact.html, privacy-policy.html, terms-of-use.html
- **Modifications**:
  - `img-src` : ajout de `https://googleads.g.doubleclick.net`
  - `connect-src` : ajout de `https://ep1.adtrafficquality.google`
  - `frame-src` : ajout de `https://googleads.g.doubleclick.net` + `https://pagead2.googlesyndication.com`
- **Template recipe.html mis à jour** → pages générées recevront la CSP corrigée au prochain build

### Fix 4 — Preload recipes.json
- **Fichiers**: `index.html`, `recipe.html`
- **Avant**: `href="recipes.json"` (relatif)
- **Après**: `href="/recipes.json"` (absolu)
- **Pages générées déjà correctes** (build script utilise `/recipes.json`)

## État final
| Erreur | Statut |
|--------|--------|
| core.js / ui.js / recipe.js 404 | ✅ Résolu (chemins absolus) |
| main.js.backup 404 | ✅ Résolu (chemin absolu) |
| CSP bloque AdSense | ✅ Résolu (domaines ajoutés) |
| Preload recipes.json warning | ✅ Résolu (chemin absolu) |
| AdSense framing errors | ✅ Résolu (frame-src élargi) |
| Unsafe URL (chrome-error) | ⚠️ Lié au test local, pas de correctif nécessaire |

## Fichiers modifiés (avec backup .orig)
- `main.js` → `main.js.orig`
- `index.html` → `index.html.orig`
- `recipe.html` → `recipe.html.orig`
