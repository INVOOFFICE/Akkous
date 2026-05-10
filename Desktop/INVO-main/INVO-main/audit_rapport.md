# Audit Complet — INVOOFFICE PWA Offline

**Date :** 2026-05-10  
**Application :** INVOOFFICE — Facturation DGI Maroc  
**Type :** PWA 100 % hors-ligne, usage personnel / TPE  
**Stack :** HTML + CSS modulaire + JavaScript vanilla, aucun framework  
**Stockage :** OPFS (Origin Private File System) + fallback localStorage  
**Score global :** 7,4 / 10

---

## Résumé Exécutif

**Points forts :** manifest solide, Service Worker bien conçu, DOMPurify intégré, CSP stricte, offline-first complet, design system cohérent.

**Axes d'amélioration :** modules monolithiques, pas de tests E2E, accessibilité partielle, données OPFS non chiffrées, pas de lazy loading.

---

## 1. Service Worker (sw.js)

**Cache :** `invo-v10`

**Stratégies :**
- **Cache First** → shell + assets statiques (JS, CSS, fonts, images, manifest)
- **Network First sans cache** → tout autre chemin (futur API, routes inconnues)
- **Offline Fallback** → retour index.html (navigation), JS vide, CSS vide, 503

**PRECACHE_ASSETS :** 71 fichiers listés explicitement (critiques + optionnels)

**Cycle de vie :**
| Événement | Comportement |
|-----------|-------------|
| `install` | précache critique, skipWaiting auto en cas de succès |
| `activate` | purge tous les anciens caches (≠ CACHE_NAME), `clients.claim()` |
| `fetch` | routing par URL, ignore `chrome-extension://` |
| `message` | SKIP_WAITING accepté depuis sw-register.js |

### Points Positifs
- Stratégie Cache First cohérente pour assets statiques
- Purge automatique des anciens caches à l'activation
- `clients.claim()` → prise de contrôle immédiate sans rechargement
- Offline fallback pour HTML, JS, CSS
- Broadcast postMessage vers les clients en cas d'échec critique
- Ressources optionnelles (screenshots) non bloquantes
- Ignorer `chrome-extension://` (bonne pratique)

### Problèmes Détectés

| ID | Sévérité | Description |
|----|----------|-------------|
| P1 | Mineur | sw.js lui-même est dans PRECACHE_ASSETS. Inutile car le navigateur gère son propre cycle. |
| P2 | Mineur | `isAppShellRequest()` inclut tout `.js/.css/.png/.svg/.woff2`. Fragile à l'évolution. |
| P3 | Info | `networkFirstNoCache` ignore silencieusement tous les échecs fetch (catch \_). |
| P4 | Info | CACHE_NAME à incrémenter manuellement avant chaque déploiement. Risque d'oubli. |

---

## 2. Manifest.json (Installabilité PWA)

### Champs Présents
`id`, `name`, `short_name`, `description`, `start_url`, `scope`, `display`, `display_override`, `background_color`, `theme_color`, `orientation`, `lang`, `icons` (4), `screenshots` (2), `categories`, `prefer_related_applications`

### Points Positifs
- Icônes : 4 variantes (192/512 standard + maskable) — minimal requis OK
- `display_override` : window-controls-overlay → standalone → minimal-ui
- Screenshots avec `form_factor` wide + narrow (améliore install prompt)
- `lang: "fr"` déclaré
- `prefer_related_applications: false` (ne redirige pas vers stores)
- `start_url` et `scope` cohérents avec déploiement relatif

### Problèmes Détectés

| ID | Sévérité | Description |
|----|----------|-------------|
| P5 | Mineur | `id: "./index.html"` — devrait être une URL absolue ou un chemin stable. |
| P6 | Mineur | Aucun champ "shortcuts" défini (Nouvelle facture, Nouveau client). |
| P7 | Info | Pas de `share_target` ni `file_handlers`. |
| P8 | Mineur | Icônes `.png` uniquement. SVG améliorerait la netteté. |

---

## 3. Stockage Local (OPFS + localStorage + sessionStorage)

**Fichier principal :** `js/storage.js` (896 lignes)

**Couches de stockage :**
- **OPFS (Origin Private File System)** : couche principale
  - Fichiers JSON versionnés : enveloppe `{ STORAGE_FORMAT_MARKER, data, ... }`
  - `STORAGE_FORMAT_VERSION = 2`
- **localStorage** : fallback (anciens navigateurs) + migration auto
- **sessionStorage** : session lock uniquement (`invoo_app_session_lock`)

**Clés OPFS :**
| Clé | Contenu |
|-----|---------|
| `invoo_settings` | Configuration société |
| `invoo_clients` | Clients |
| `invoo_stock` | Stock/produits |
| `invoo_docs` | Documents (factures, devis, etc.) |
| `invoo_fournisseurs` | Fournisseurs |
| `invoo_bons_commande` | Bons de commande |
| `invoo_stock_moves` | Mouvements de stock |
| `invoo_activation_v3` | Authentification |
| `invoo_db_version` | Version DB |

**DB_VERSION :** 1

**Chaîne d'écriture :** `_opfsWriteChain` (Promise.resolve()) — évite les écritures concurrentes.

### Points Positifs
- OPFS préféré à localStorage (meilleur isolement, pas de limite 5 MB)
- Fallback localStorage documenté pour compatibilité
- Migration automatique localStorage → OPFS
- Versionnement explicite (DB_VERSION, STORAGE_FORMAT_VERSION)
- Chaîne d'écriture séquentielle pour éviter la corruption
- Cache mémoire (`_opfsMemCache`) pour lectures rapides
- `window.APP.opfs` encapsulation partielle

### Problèmes Détectés

| ID | Sévérité | Description |
|----|----------|-------------|
| P9 | **Important** | Données OPFS non chiffrées. Lisibles via DevTools. |
| P10 | Moyen | `window.DB` est un objet global exposé, modifiable par tout script. |
| P11 | Mineur | Pas de schéma formel pour les entités. Migrations risquées. |
| P12 | Mineur | En cas d'échec OPFS ET localStorage, données perdues silencieusement. |
| P13 | Info | `invoo_device_seed_v1` reste en localStorage (pas migrée en OPFS). |

---

## 4. Performance et Chargement Offline

**Chargement JS (index.html) :** Tous les scripts utilisent `defer`.

**Ordre de chargement :**
1. Vendor (Chart.js, jsPDF, html2canvas, SheetJS, Flatpickr, DOMPurify, PapaParse)
2. Sanitize → Storage → Auth → UI → Métier → App → Events → sw-register

### Taille des Assets Vendors

| Bibliothèque | Taille (non gzippé) | GZIP estimé |
|-------------|--------------------|-------------|
| xlsx.full.min.js | 862 KB | ~220 KB |
| jspdf.umd.min.js | 356 KB | ~140 KB |
| chart.umd.min.js | 201 KB | ~60 KB |
| html2canvas.min.js | 195 KB | ~55 KB |
| flatpickr.min.js | 50 KB | — |
| purify.min.js | 22 KB | — |
| papaparse.min.js | 19 KB | — |
| **Total** | **~1,7 MB** | — |

### Points Positifs
- Tous les scripts en `defer` (pas de blocage rendu)
- JS vanilla, pas de framework (bundle léger côté logique applicative)
- Tous assets pré-cachés → chargement instantané hors-ligne au 2e visit
- CSS modulaire (pas un seul gros fichier)
- `DEBUG = false` en production

### Problèmes Détectés

| ID | Sévérité | Description |
|----|----------|-------------|
| P14 | Moyen | `xlsx.full.min.js` (862 KB) et `jspdf.umd.min.js` (356 KB) chargés au démarrage sans lazy loading. |
| P15 | Moyen | Pas de skeleton screen avant `checkAuth()`. Page blanche 2-3s sur mobile. |
| P16 | Mineur | 6 poids de police pré-cachés (300-800). Poids 300 et 800 peu utilisés. |
| P17 | Mineur | `page-templates.js` (865 lignes) fichier généré. Risque de dérive si non régénéré. |

---

## 5. Compatibilité Mobile

**Meta tags PWA (index.html) :**
- `apple-mobile-web-app-capable: yes`
- `apple-mobile-web-app-status-bar-style: black-translucent`
- `apple-mobile-web-app-title: INVOOFFICE`
- `theme-color: #09BC8A`

**Layout mobile :** Breakpoints à 1024px (tablet), 768px (mobile), 480px (small)

**Fonctionnalités mobiles :**
- Bottom tabbar, sidebar overlay, FAB (+), swipe-to-close sidebar
- Touch events passifs (`{ passive: true }`)
- Inputs : height = 40px (touch-friendly)

### Points Positifs
- Touch events passifs (performance scroll)
- Bottom tabbar mobile (navigation thumb-friendly)
- Swipe sidebar (UX native)
- FAB pour actions principales
- `apple-touch-icon` configuré
- Hint iOS personnalisé avec throttle 7 jours
- Responsive complet (3 breakpoints)

### Problèmes Détectés

| ID | Sévérité | Description |
|----|----------|-------------|
| P24 | Moyen | OPFS dispo seulement depuis iOS 16.4. Pas d'avertissement si fallback localStorage. |
| P25 | Mineur | `apple-touch-icon` pointe vers 512px. Apple recommande 180×180px. |
| P26 | Mineur | Banner iOS peut déborder sur petits écrans (iPhone SE). |
| P27 | Info | Firefox mobile non testé explicitement. |

---

## 6. Fichiers Manquants ou Cassés

**Vérification des références depuis sw.js et index.html :**

Trouvés et valides :
- ✅ `index.html`, `manifest.json`, `sw.js`, `sw-register.js`
- ✅ `icon.svg`, `privacy.html`
- ✅ `icons/icon-192.png`, `icon-512.png`, `icon-maskable-192.png`, `icon-maskable-512.png`
- ✅ `screenshots/screenshot-desktop.png`, `screenshot-mobile.png`
- ✅ Tous les fichiers CSS
- ✅ Tous les modules JS
- ✅ Tous les vendors
- ✅ Fonts WOFF2

### Problèmes Détectés

| ID | Sévérité | Description |
|----|----------|-------------|
| P28 | Mineur | `assets/fonts/plus-jakarta-sans/index.css` absent du précache. |
| P29 | Mineur | Vérifier la casse du chemin `flatpickr.min.css` (compatible Linux). |
| P30 | Info | Fichiers vides "cd", "git", "main" à la racine (artéfacts git). |
| P31 | Important | `js/price-mode.js` absent de PRECACHE_ASSETS. Offline cassé. |

---

## 7. Accessibilité (a11y)

### Points Positifs
- `role="dialog"` + `aria-modal="true"` sur les modales
- `aria-hidden="true"` sur les éléments décoratifs
- `.sr-only` pour labels screen readers
- `type="button"` sur tous les boutons
- Labels associés aux inputs (`for/id`)
- `fieldset` pour groupes de période

### Problèmes Détectés

| ID | Sévérité | Description |
|----|----------|-------------|
| P32 | Moyen | `ui.js` et `docs.js` non audités Lighthouse. Tableaux dynamiques et modales sans gestion de focus. |
| P33 | Mineur | Sidebar sans `aria-label` explicite. |
| P34 | Mineur | Toast (`#toast`) sans `aria-live`. Annonces non lues par lecteurs d'écran. |

---

## 8. Qualité de Code & Maintenabilité

| ID | Sévérité | Description |
|----|----------|-------------|
| P35 | Moyen | `docs.js` : 3051 lignes monolithiques (PDF, DGI, TVA, HTML, CRUD mélangés). |
| P36 | Moyen | `ui.js` : 1683 lignes fourre-tout (navigation, toasts, charts, spinners, modales). |
| P37 | Moyen | `page-templates.js` généré sans en-tête "NE PAS MODIFIER". |
| P38 | Mineur | `window.DB` et nombreuses fonctions globales. Risque de collision. |
| P39 | Info | Aucun test E2E (Playwright / Cypress). |

---

## 9. Structure du Projet

```
INVO-main/
├── .claude/                       # Claude Code settings
├── assets/fonts/plus-jakarta-sans/ # Police autohébergée
├── css/
│   ├── style.css                  # Point d'entrée CSS (aggregateur)
│   ├── tokens.css                 # Design tokens (CSS custom properties)
│   ├── components-core.css        # Composants UI de base
│   ├── fonts-plus-jakarta.css     # @font-face
│   ├── paiement-licence.css       # Page de paiement licence
│   └── pages/
│       ├── app-chrome.css         # Shell chrome (sidebar, topbar)
│       ├── auth.css               # Écrans d'authentification
│       ├── help-search-skeleton.css # Panneau recherche + skeleton
│       ├── layout-shell.css       # Grille layout principale
│       ├── panels-charts-domain.css # Dashboard, panels, graphiques
│       ├── pdf-preview.css        # Aperçu PDF
│       ├── responsive.css         # Styles responsives
│       ├── surfaces-doc.css       # Formulaire de génération document
│       ├── tables-widgets.css     # Tableaux, pagination, widgets
│       └── templates-mobile-static.css # Tabbar mobile, FAB, action sheet
├── icons/                         # Icônes PWA (192, 512, maskable)
├── js/
│   ├── app.js                     # Point d'entrée (boot, init)
│   ├── html-safe.js               # Échappement HTML + helpers DOM
│   ├── sanitize.js                # Wrapper DOMPurify
│   ├── storage.js                 # Couche DB (OPFS + localStorage)
│   ├── license-activation.js      # Device ID, SHA-256, clé licence
│   ├── auth-templates.js          # Templates HTML écran activation
│   ├── auth.js                    # Flux activation, session lock
│   ├── csv-parse.js               # Parsing CSV (PapaParse)
│   ├── price-mode.js              # Mode TTC/HT
│   ├── backup.js                  # Sauvegarde, reset, paramètres
│   ├── clients.js                 # CRUD clients, validation ICE/RIB
│   ├── fournisseurs.js            # CRUD fournisseurs, scoring
│   ├── products.js                # Gestion stock, mouvements
│   ├── bons-commande.js           # Bons de commande liés stock
│   ├── imports.js                 # Import CSV (clients, stock, fournisseurs)
│   ├── invoices.js                # Devis rapide, rapport PDF historique
│   ├── page-templates.js          # Templates HTML générés
│   ├── pdf.js                     # Génération PDF (4 templates)
│   ├── ui.js                      # Helpers UI, navigation, charts
│   ├── docs.js                    # Documents : CRUD, DGI, historique
│   ├── supabase-sync.js           # Synchronisation Supabase optionnelle
│   ├── events.js                  # Gestionnaires d'événements DOM
│   ├── docs/                      # Sous-modules ES pour docs.js
│   │   ├── totals.js              # Totaux, TVA, montant en lettres
│   │   ├── refs.js                # Numérotation séquentielle
│   │   ├── status.js              # Statuts par type de document
│   │   ├── source-links.js        # Liens avoir → facture source
│   │   ├── reports.js             # Rapports fiscaux, TVA par taux
│   │   └── history-filters.js     # Filtrage historique
│   └── vendor/                    # Bibliothèques tierces
│       ├── chart.umd.min.js       # Chart.js v4
│       ├── flatpickr.min.js       # Date picker
│       ├── flatpickr.min.css      # Styles date picker
│       ├── flatpickr-fr.js        # Locale française
│       ├── html2canvas.min.js     # HTML → canvas
│       ├── jspdf.umd.min.js       # jsPDF
│       ├── papaparse.min.js       # Papa Parse (CSV)
│       ├── purify.min.js          # DOMPurify
│       ├── supabase.umd.js        # Supabase client
│       └── xlsx.full.min.js       # SheetJS
├── scripts/
│   ├── vendor-copy.mjs            # Postinstall : copie vendors
│   ├── build-page-templates.mjs   # Génère page-templates.js
│   ├── patch-index-to-shell.mjs   # Réduit index.html en shell
│   └── check-no-merge-conflicts.mjs # Vérification conflits git
├── tests/
│   ├── run-tests.mjs              # Point d'entrée tests MJS
│   ├── tva-by-rate.test.mjs       # Tests calcul TVA
│   ├── pdf-sanitize.test.mjs      # Tests injection XSS PDF
│   ├── sw-pwa-banner.test.mjs     # Tests bannière PWA
│   └── jest/
│       ├── auth.authentication.test.js
│       ├── auth.localstorage.test.js
│       ├── backup-payload.test.js
│       ├── csv-parse.test.js
│       ├── db-migrations-behavior.test.js
│       ├── db-migrations-inventory.test.js
│       ├── fiscal-calculations.test.js
│       ├── imports-csv.test.js
│       ├── license-activation.test.js
│       ├── price-mode-conversions.test.js
│       └── storage-envelope.test.js
├── screenshots/                   # Captures PWA
├── index.html                     # Shell SPA principal
├── paiement.html                  # Page de paiement licence
├── privacy.html                   # Politique de confidentialité
├── sw.js                          # Service Worker
├── sw-register.js                 # Enregistrement SW + bannières
├── manifest.json                  # Manifeste PWA
├── package.json                   # Configuration npm
└── jest.config.cjs                # Configuration Jest
```

---

## 10. Modèle de Données

Le `DB` global contient les collections suivantes :

| Clé | Stockage | Contenu |
|-----|----------|---------|
| `settings` | `invoo_settings` | Infos société, TVA, devise, logo, séquences, thème, préférences |
| `clients` | `invoo_clients` | Tableau de clients (id, nom, type, email, ICE, RIB, etc.) |
| `stock` | `invoo_stock` | Produits (id, nom, code-barres, catégorie, prix, TVA, qty, seuil) |
| `docs` | `invoo_docs` | Documents (id, réf, type, date, client, lignes, totaux, statut) |
| `fournisseurs` | `invoo_fournisseurs` | Fournisseurs (id, nom, score A/B/C, ICE, IF, etc.) |
| `bonsCommande` | `invoo_bons_commande` | Bons de commande (id, réf, date, fournisseur, statut) |
| `stockMoves` | `invoo_stock_moves` | Mouvements de stock (id, date, produit, action, delta) |

---

## 11. Dépendances (package.json)

| Bibliothèque | Version | Statut |
|-------------|---------|--------|
| dompurify | 3.2.5 | À jour |
| jspdf | 2.5.1 | À jour |
| html2canvas | 1.4.1 | Dernière stable |
| xlsx | 0.18.5 | Version figée (SheetJS legacy) |
| chart.js | 4.4.1 | À jour |
| papaparse | 5.5.3 | À jour |
| flatpickr | 4.6.13 | Dernière version |

---

## 12. Scorecard Final

| Dimension | Score | Justification |
|-----------|:-----:|---------------|
| Service Worker & Cache | **8.5** | Stratégies correctes, lifecycle propre |
| Manifest PWA | **8.0** | Complet, manque shortcuts + SVG icon |
| Stockage local | **7.5** | OPFS bien, pas de chiffrement, DB globale |
| Performance offline | **7.0** | Vendors lourds chargés sans lazy load |
| Compatibilité mobile | **8.0** | Bon support iOS/Android, OPFS < iOS 16.4 |
| Fichiers & intégrité | **8.5** | Quasi complet, 2-3 refs manquantes |
| Accessibilité | **6.5** | Partielle, toasts et tableaux non audités |
| Qualité & maintenabilité | **6.5** | Modules trop gros, pas d'E2E |
| **GLOBAL** | **7.4** | |

---

## 13. Liste Consolidée des Problèmes par Priorité

### Important (à traiter avant mise en production élargie)

| ID | Problème | Fichier |
|----|----------|---------|
| P9 | Données OPFS non chiffrées (risque sur appareil partagé) | `js/storage.js` |
| P31 | `js/price-mode.js` absent de PRECACHE_ASSETS (mode offline) | `sw.js` |

### Moyen (amélioration recommandée)

| ID | Problème | Fichier(s) |
|----|----------|------------|
| P10 | `window.DB` global non protégé | `js/storage.js` |
| P14 | xlsx + jsPDF chargés au démarrage sans lazy loading | `index.html` |
| P15 | Pas de skeleton screen avant `checkAuth()` | `index.html`, `js/app.js` |
| P24 | Pas d'avertissement si OPFS indisponible (iOS < 16.4) | `js/storage.js` |
| P32 | `ui.js` / `docs.js` non audités Lighthouse (a11y tableaux, focus) | `js/ui.js`, `js/docs.js` |
| P35 | `docs.js` monolithique (3051 lignes) | `js/docs.js` |
| P36 | `ui.js` monolithique (1683 lignes) | `js/ui.js` |
| P37 | `page-templates.js` généré sans marqueur "NE PAS MODIFIER" | `scripts/build-page-templates.mjs` |

### Mineur (bonne pratique)

| ID | Problème | Fichier(s) |
|----|----------|------------|
| P1 | sw.js inutilement dans PRECACHE_ASSETS | `sw.js` |
| P2 | `isAppShellRequest` trop large (tout `.js/.css`) | `sw.js` |
| P5 | manifest `id` non stable | `manifest.json` |
| P6 | Pas de shortcuts dans manifest | `manifest.json` |
| P8 | Pas d'icône SVG dans manifest | `manifest.json` |
| P11 | Pas de schéma formel pour les entités | `js/storage.js` |
| P12 | Pas d'UI si stockage indisponible | `js/storage.js` |
| P13 | `invoo_device_seed_v1` dans localStorage (non OPFS) | `js/storage.js` |
| P16 | 6 poids de fonts pré-cachés (300+800 peu utilisés) | `sw.js` |
| P17 | `page-templates.js` risque de dérive si non régénéré | — |
| P25 | apple-touch-icon 512px (recommandé 180px) | `index.html` |
| P26 | Banner iOS peut déborder sur petits écrans | — |
| P28 | `assets/fonts/index.css` absent du précache | `sw.js` |
| P29 | Vérifier casse chemin `flatpickr.min.css` | `sw.js` |
| P33 | Sidebar sans `aria-label` explicite | `index.html` |
| P34 | `#toast` sans `aria-live` | `index.html` |

### Info

| ID | Problème |
|----|----------|
| P3 | `networkFirstNoCache` sans log de débogage |
| P4 | CACHE_NAME à incrémenter manuellement |
| P7 | Pas de `share_target` / `file_handlers` |
| P27 | Firefox mobile non testé explicitement |
| P30 | Fichiers vides "cd", "git", "main" à la racine |
| P38 | Nombreux globaux `window.*` |
| P39 | Aucun test E2E |

---

## 14. Tests

### Suite MJS (tests vanilla)
- `tests/tva-by-rate.test.mjs` — Calculs TVA (sans remise, avec remise, multi-taux, auto-entrepreneur, edge cases)
- `tests/pdf-sanitize.test.mjs` — Résistance XSS PDF (injection dans nom client, adresse, notes)
- `tests/sw-pwa-banner.test.mjs` — Bannière PWA, install prompt, hint iOS, debounce

### Suite Jest (CommonJS)
- `tests/jest/auth.authentication.test.js` — Activation licence (device ID, validation SHA-256)
- `tests/jest/backup-payload.test.js` — Validation payload backup (champs manquants, références circulaires)
- `tests/jest/csv-parse.test.js` — Parsing CSV (délimiteurs, guillemets, entrées vides)
- `tests/jest/db-migrations-behavior.test.js` — Comportement migrations DB
- `tests/jest/db-migrations-inventory.test.js` — Complétude migrations (tous les indices 1..DB_VERSION)
- `tests/jest/fiscal-calculations.test.js` — Moteur fiscal complet (totaux, remise, TVA, auto-entrepreneur)
- `tests/jest/imports-csv.test.js` — Import CSV (encodage, BOM, normalisation en-têtes, modes)
- `tests/jest/license-activation.test.js` — Génération/validation clés licence
- `tests/jest/price-mode-conversions.test.js` — Conversion TTC/HT (20%, 10%, 14%, 0%)
- `tests/jest/storage-envelope.test.js` — Format enveloppe stockage (encodage, décodage, rétrocompatibilité)

---

## 15. Architecture Technique

### Flux de Démarrage
```
index.html (shell)
  → defer scripts se chargent en parallèle
    → preloadOPFS() charge toutes les données depuis OPFS
      → checkAuth() vérifie l'activation / session
        → _removeBootSpinner() affiche l'interface
          → Event listeners attachés (events.js)
```

### Génération de Documents
```
Formulaire (events.js → docs.js)
  → calcTotals() (totaux, TVA, remise)
    → getNextRef() (numérotation séquentielle)
      → saveDoc() (persistance OPFS)
        → buildInvoiceHTML() (template PDF)
          → html2canvas + jsPDF (génération PDF rasterisé)
```

### Synchronisation Supabase (optionnelle)
```
supabase-sync.js
  → REST pull (GET) depuis Supabase
    → REST upsert (POST/PATCH) vers Supabase
      → Postgres Realtime (WebSocket) pour mises à jour en direct
        → Résolution conflits par updated_at
          → Debounce par table
```

---

## 16. Format des Références de Documents

| Type | Préfixe | Exemple |
|------|---------|---------|
| Facture | F | `F-2026-0001` |
| Devis | D | `D-2026-0001` |
| Bon de Livraison | BL | `BL-2026-0001` |
| Avoir | AV | `AV-2026-0001` |
| Bon de Commande | BCmd | `BCmd-2026-0001` |

---

## 17. Recommandations Clés

1. **Refactorer les modules monolithiques** : découper `docs.js` (3051 lignes) et `ui.js` (1683 lignes) en sous-modules spécialisés
2. **Ajouter le lazy loading** : `xlsx` et `jsPDF` ne devraient pas être chargés au démarrage
3. **Améliorer l'accessibilité** : auditer Lighthouse, ajouter `aria-live` sur les toasts, `aria-label` sur la sidebar
4. **Corriger le précache** : ajouter `price-mode.js` et `index.css` des fonts dans PRECACHE_ASSETS
5. **Supprimer les artéfacts** : fichiers vides "cd", "git", "main" à la racine
6. **Ajouter des tests E2E** : Playwright ou Cypress pour les parcours métier complets
7. **Améliorer l'expérience mobile** : icône apple-touch-icon 180×180px, avertissement OPFS indisponible
8. **Stabiliser le manifest PWA** : changer `id` en chemin absolu, ajouter shortcuts

---

*Rapport généré le 2026-05-10 pour INVOOFFICE — PWA de facturation DGI Maroc*
