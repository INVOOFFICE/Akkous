# Akkous — SAFE Stabilization Roadmap

**Generated**: 2026-05-15
**Based on**: AUDIT_MASTER_REPORT.md
**Strategy**: Stabilize → Audit → Fortify → Extend

---

## Table of Contents

1. [Ordered Action Plan](#1-ordered-action-plan)
2. [Quick Wins (< 30 minutes each)](#2-quick-wins--30-minutes-each)
3. [Stabilization Priorities (Week 1-2)](#3-stabilization-priorities-week-1-2)
4. [SEO Priorities](#4-seo-priorities)
5. [CI/CD Priorities](#5-cicd-priorities)
6. [Performance Priorities](#6-performance-priorities)
7. [Security Priorities](#7-security-priorities)
8. [Long-Term Improvements (Month 2+)](#8-long-term-improvements-month-2)
9. [Low-Risk vs High-Risk Tasks](#9-low-risk-vs-high-risk-tasks)
10. [Dependency Graph](#10-dependency-graph)

---

## 1. Ordered Action Plan

The phases below are ordered by dependency — later tasks depend on earlier ones being completed. Each step lists the file(s) to modify, the risk level, and estimated effort.

### Phase 0: READ-ONLY — Verify Current State (Before Any Changes)

| # | Action | Verification Method | Done |
|---|--------|-------------------|------|
| 0.1 | Confirm 148 static pages / 148 sitemap entries match | `ls recipes/ | wc -l` vs `grep -c recipes/ sitemap.xml` | ✅ |
| 0.2 | Verify `recipes.json` is valid JSON | `node -e "JSON.parse(require('fs').readFileSync('recipes.json','utf8'))"` | ✅ |
| 0.3 | Check current CI workflow ran successfully | GitHub Actions → latest run status | ⬜ |
| 0.4 | Check GAS AutomationLog for recent errors | Google Sheets → AutomationLog tab | ⬜ |

---

### Phase 1: Stabilize (Week 1-2) — MUST DO BEFORE ANY OTHER CHANGE

These are the highest-priority items that address immediate risk of site breakage or SEO penalty.

| # | Task | File(s) | Risk Level | Effort | Dependencies |
|---|------|---------|------------|--------|-------------|
| 1.1 | Fix CI race condition | `.github/workflows/build-static-recipes.yml` | 🟢 Low | 5 min | None |
| 1.2 | Add CI build validation | `.github/workflows/build-static-recipes.yml` | 🟢 Low | 15 min | None |
| 1.3 | Stop GAS from writing sitemap | `google-apps-script/code.gs` | 🟡 Medium | 20 min | None |
| 1.4 | Increase AI temperature to 0.7 | `google-apps-script/code.gs` | 🟡 Medium | 5 min | None |
| 1.5 | Vary FAQ prompt per category | `scripts/build-recipe-pages.mjs` | 🟡 Medium | 1 hr | None |
| 1.6 | Add deployment rollback tags | `.github/workflows/build-static-recipes.yml` | 🟢 Low | 10 min | None |

---

### Phase 2: Audit (Week 3-4)

| # | Task | File(s) | Risk Level | Effort | Dependencies |
|---|------|---------|------------|--------|-------------|
| 2.1 | Add `defer` to main.js | `index.html`, `recipe.html` | 🟢 Low | 5 min | None |
| 2.2 | Review GAS logs for timeout patterns | Google Sheets → AutomationLog | 🟢 Low | 30 min | None |
| 2.3 | Check Google Search Console signals | GSC website | 🟢 Low | 30 min | None |
| 2.4 | Add CSP meta tag | `index.html`, `recipe.html` | 🟢 Low | 10 min | None |
| 2.5 | Audit image sizes in recipes | Manual spot-check | 🟢 Low | 15 min | None |

---

### Phase 3: Fortify (Month 2)

| # | Task | File(s) | Risk Level | Effort | Dependencies |
|---|------|---------|------------|--------|-------------|
| 3.1 | Add responsive images with `srcset` | `scripts/build-recipe-pages.mjs`, `main.js` | 🟡 Medium | 2 hr | 2.5 |
| 3.2 | Add `loading="lazy"` for below-fold images | `scripts/build-recipe-pages.mjs` | 🟢 Low | 15 min | None |
| 3.3 | Add unique editorial content to recipes | GAS → Sheets (hook/tip fields) | 🟡 Medium | Ongoing | None |
| 3.4 | Set up API key rotation reminders | Documentation | 🟢 Low | 15 min | None |

---

### Phase 4: Extend (Month 3+)

| # | Task | File(s) | Risk Level | Effort | Dependencies |
|---|------|---------|------------|--------|-------------|
| 4.1 | Split main.js into modules | `main.js` → `src/*.js` | 🔴 High | 8+ hr | 2.1 |
| 4.2 | Add client-side pagination | `main.js`, `style.css` | 🟡 Medium | 4 hr | 4.1 |
| 4.3 | Add RSS feed | `scripts/build-recipe-pages.mjs` | 🟢 Low | 1 hr | None |
| 4.4 | Refactor code.gs into multiple files | `google-apps-script/*.gs` | 🔴 High | 8+ hr | None |
| 4.5 | Add print stylesheet | `style.css` | 🟢 Low | 30 min | None |
| 4.6 | Add recipe rating/saving | `main.js`, `sw.js` | 🟡 Medium | 6 hr | 4.1 |

---

## 2. Quick Wins (< 30 Minutes Each)

These are low-risk, high-return changes that can be done immediately and independently.

| # | Task | Risk | Return | Complexity |
|---|------|------|--------|------------|
| **QW1** | Set `cancel-in-progress: false` in CI workflow | 🟢 | Prevents corrupted builds | 1 line change |
| **QW2** | Add `defer` to `<script src="main.js">` | 🟢 | Improves LCP, unblocks HTML parsing | 2 files, 1 attr each |
| **QW3** | Add `loading="lazy"` to non-hero images | 🟢 | Reduces initial page weight | 1 file change |
| **QW4** | Increase Groq temperature to 0.7 | 🟢 | Less templated AI output | 1 config line |
| **QW5** | Add CI build validation (count check) | 🟢 | Catches silent page generation failures | 5 lines in YAML |
| **QW6** | Add CSP meta tag | 🟢 | Basic XSS/clickjacking protection | 2 files |
| **QW7** | Remove NEWS LETTER_WEB_APP_URL from CONFIG | 🟢 | Remove unnecessary URL from repo | 1 line |
| **QW8** | Add page count assertion to CI workflow | 🟢 | Verify generated pages match expected | 3 lines in YAML |

**Recommended order for quick wins**: QW1 → QW5 → QW2 → QW4 → QW6 → QW3 → QW7 → QW8

---

## 3. Stabilization Priorities (Week 1-2)

### 3.1 🔴 Critical: Fix CI Race Condition

**Current behavior**:
```yaml
concurrency:
  group: static-recipes-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

**Target behavior**:
```yaml
concurrency:
  group: static-recipes-${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: false
```

**Why**: Ensures CI runs complete sequentially. No mid-build cancellations.

**Risk of change**: 🟢 Low — runs will queue instead of cancelling. Total time from push to deploy increases slightly but reliability improves.

### 3.2 🔴 Critical: Improve AI Content Quality

**Current state**:
- Groq temperature: 0.35
- FAQ template: identical across all 148 recipes
- Prompt: single static template

**Target changes**:
1. Increase temperature to 0.7 (`code.gs` line 965: `temperature: 0.35` → `temperature: 0.7`)
2. Add category-specific FAQ templates in `build-recipe-faq-items()` in `scripts/build-recipe-pages.mjs`
3. Vary Q&A order/format per cuisine type (e.g., baking recipes get "Can I freeze?" instead of "Can I make ahead?")

**Risk of change**: 🟡 Medium — higher temperature may occasionally produce factually incorrect output. Monitor AutomationLog for Groq errors.

### 3.3 🔴 High: Unify Sitemap Generation

**Current**: GAS `buildSitemapXmlFromPayload_()` generates sitemap on push to GitHub. CI `writeSitemap()` regenerates it on build.

**Target**: Remove `GITHUB_SITEMAP_FILE` and `buildSitemapXmlFromPayload_` call from GAS push. Let CI be the sole sitemap author.

**Why**: Eliminates dual-authority race condition. CI has the full picture of generated pages (including orphan cleanup).

**Risk**: 🟡 Medium — if GAS push succeeds but CI fails, sitemap won't be updated until the next push.

---

## 4. SEO Priorities

| Priority | Task | Expected Impact | Effort |
|----------|------|----------------|--------|
| P1 | Increase AI temperature + vary FAQ templates | Reduce penalty risk | Medium |
| P2 | Unify sitemap generation under CI | Consistent indexation signals | Low |
| P2 | Fix sitemap `<lastmod>` to use actual dates | Better crawl prioritization | Low |
| P3 | Add unique editorial content (hook, personal notes) | Differentiation from TheMealDB sources | High (ongoing) |
| P3 | Monitor GSC for manual actions | Early warning | Low |
| P4 | Add original photography | Maximum differentiation | Very high |

### Sitemap `<lastmod>` Fix Strategy

Rather than using static `datePublished`, use the actual git commit date of the recipe page:

```bash
# Option A: git-based (best)
git log -1 --format=%cI recipes/{slug}/index.html

# Option B: CI-based (simpler)
# Use GITHUB_RUN_ID or workflow run timestamp as lastmod
```

**Recommended**: Option B during CI workflow — use the current date as lastmod (since pages are regenerated on each push, this reflects the actual freshness).

---

## 5. CI/CD Priorities

| Priority | Task | Risk | Effort |
|----------|------|------|--------|
| P1 | Set `cancel-in-progress: false` | 🟢 Low | 5 min |
| P2 | Add page generation validation | 🟢 Low | 15 min |
| P2 | Add rebase conflict fallback | 🟡 Medium | 30 min |
| P3 | Tag successful deployments | 🟢 Low | 10 min |
| P4 | Add staging/preview environment | 🔴 High | 4+ hr |

### CI Validation Checklist (to add to workflow)

After page generation:
```yaml
# Verify count matches
- name: Validate generated pages
  run: |
    RECIPE_COUNT=$(node -e "console.log(JSON.parse(require('fs').readFileSync('recipes.json','utf8')).recipes.length)")
    PAGE_COUNT=$(find recipes -name "index.html" | wc -l)
    if [ "$RECIPE_COUNT" -ne "$PAGE_COUNT" ]; then
      echo "ERROR: $RECIPE_COUNT recipes but $PAGE_COUNT pages"
      exit 1
    fi
    echo "All $PAGE_COUNT pages validated"
```

---

## 6. Performance Priorities

| Priority | Task | Expected Gain | Risk | Effort |
|----------|------|---------------|------|--------|
| P3 | Add `defer` to main.js | LCP improvement, unblocks HTML parse | 🟢 Low | 5 min |
| P3 | Add `loading="lazy"` to non-hero images | Reduces initial load weight | 🟢 Low | 15 min |
| P3 | Add image `srcset` | Bandwidth savings on mobile | 🟡 Medium | 2 hr |
| P4 | Minify CSS/JS in CI | Smaller payloads, faster load | 🟢 Low | 1 hr |
| P4 | Preconnect to TheMealDB CDN | Faster image loading | 🟢 Low | 5 min |

### Performance Budget (Target)

| Resource | Current | Target |
|----------|---------|--------|
| CSS | 59.7 KB | <30 KB (minified) |
| JS | 68 KB | <40 KB (deferred + split) |
| Recipes JSON | ~150 KB | Same (acceptable) |
| LCP | Unknown | <2.5s |
| CLS | Unknown | <0.1 |
| TBT | Unknown | <200ms |

---

## 7. Security Priorities

| Priority | Task | Risk Reduction | Effort |
|----------|------|----------------|--------|
| P3 | Add CSP meta tag | XSS, clickjacking, data injection | 10 min |
| P4 | Key rotation documentation | Prevent stale key exposure | 15 min |
| P4 | Remove hardcoded NEWSLETTER_WEB_APP_URL | Reduce attack surface | 5 min |

### Recommended CSP Policy

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://www.googletagmanager.com https://pagead2.googlesyndication.com;
  img-src 'self' https://www.themealdb.com https://images.unsplash.com https://pagead2.googlesyndication.com;
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  font-src https://fonts.gstatic.com;
  connect-src 'self';
  frame-src https://pagead2.googlesyndication.com;
">
```

---

## 8. Long-Term Improvements (Month 2+)

### High Reward / High Effort

| # | Improvement | Why | Dependencies |
|---|-------------|-----|--------------|
| L1 | Split main.js into modules | Maintainability, performance, testability | None (preferably Phase 4) |
| L2 | Refactor code.gs → multiple files | Readability, error isolation, easier debugging | None |
| L3 | Add unit tests for build script | Prevent regression when modifying page generation | Depends on build script stability |
| L4 | Precompute AI enrichment offline | Remove AI calls from daily pipeline, reduce GAS execution time | Requires separate batch process |

### Medium Reward / Medium Effort

| # | Improvement | Why | Effort |
|---|-------------|-----|--------|
| M1 | Add RSS feed | Content discovery, subscriber growth | 1 hr |
| M2 | Add print stylesheet | User experience for recipe printing | 30 min |
| M3 | Add pagination to recipe grid | Performance with 500+ recipes | 4 hr |
| M4 | Add `preconnect` to TheMealDB image CDN | Faster hero image loading | 5 min |

### Low Reward / Low Effort

| # | Improvement | Why | Effort |
|---|-------------|-----|--------|
| S1 | Add `loading="lazy"` to images | Better initial page load | 15 min |
| S2 | Add `defer` to main.js | Unblock HTML parser | 5 min |
| S3 | Add page count badge to README | Quick status reference | 5 min |

---

## 9. Low-Risk vs High-Risk Tasks

### ✅ Low-Risk Tasks (Can Be Done Anytime)

These changes are isolated, easily reviewable, and have clear rollback paths (revert the commit):

| Task | Fallback |
|------|----------|
| `cancel-in-progress: false` | Revert YAML change |
| Add `defer` to script tags | Remove attribute |
| Add `loading="lazy"` | Remove attribute |
| Increase Groq temperature | Change number back |
| Add CSP meta tag | Remove meta tag |
| Add CI build validation | Remove step from workflow |
| Add pagination count check | Remove step |

### ⚠️ Medium-Risk Tasks (Test Before Deploy)

These changes affect data flow or content generation and should be tested:

| Task | Validation Needed |
|------|-------------------|
| Remove sitemap from GAS push | Run CI once after change to confirm sitemap updates |
| Vary FAQ templates per category | Spot-check generated pages for 3-4 categories |
| Add image `srcset` | Verify images load correctly on mobile/desktop |
| Modify slug generation | Run build script locally and compare generated paths |

### 🔴 High-Risk Tasks (Plan Carefully)

These changes touch core infrastructure and need a rollback plan:

| Task | Risk | Rollback Plan |
|------|------|---------------|
| Split main.js into modules | Site JS may break entirely | Keep original main.js as fallback, deploy with feature flag |
| Refactor code.gs | Daily publication may stop | Keep original code.gs backup, manually publish if needed |
| Add rating/saving feature | SW + IndexedDB complexity | Feature-flag, can disable server-side |
| Staging/preview environment | Significant workflow changes | Keep `main` as production until staging is battle-tested |

---

## 10. Dependency Graph

```
Phase 1 (Stabilize)
├── 1.1 cancel-in-progress: false ────────── No dependencies
├── 1.2 CI build validation ───────────────── No dependencies
├── 1.3 Remove sitemap from GAS ───────────── No dependencies
├── 1.4 Increase AI temperature ───────────── No dependencies
├── 1.5 Vary FAQ templates ────────────────── Depends on understanding current template
└── 1.6 Add deployment tags ───────────────── No dependencies

Phase 2 (Audit)
├── 2.1 Add defer to main.js ──────────────── No dependencies
├── 2.2 Review GAS logs ───────────────────── No dependencies (read-only)
├── 2.3 Check GSC ─────────────────────────── No dependencies (read-only)
├── 2.4 Add CSP meta tag ──────────────────── No dependencies
└── 2.5 Audit images ──────────────────────── No dependencies (read-only)

Phase 3 (Fortify)
├── 3.1 Add srcset ────────────────────────── Depends on 2.5
├── 3.2 Add lazy loading ──────────────────── No dependencies
├── 3.3 Add unique editorial content ──────── Depends on 1.4, 1.5
└── 3.4 Key rotation setup ────────────────── No dependencies

Phase 4 (Extend)
├── 4.1 Split main.js ─────────────────────── Depends on 2.1
├── 4.2 Add pagination ────────────────────── Depends on 4.1
├── 4.3 Add RSS feed ──────────────────────── No dependencies
├── 4.4 Refactor code.gs ──────────────────── Depends on stable pipeline (Phase 1)
├── 4.5 Add print stylesheet ──────────────── No dependencies
└── 4.6 Add rating/saving ─────────────────── Depends on 4.1
```

### Critical Path

The shortest path to a stable, audit-ready system:

```
Week 1                    Week 2                    Week 3
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│ 1.1 CI fix   │───▶│ 2.1 JS defer │───▶│ 3.2 Lazy load│
│ 1.2 Validation│    │ 2.4 CSP      │    │ 4.5 Print css│
│ 1.3 Sitemap  │    │ 2.5 Img audit│    └──────────────┘
│ 1.4 AI temp  │    └──────────────┘
│ 1.5 FAQ vary │
│ 1.6 Tags     │
└──────────────┘
```

---

## Appendix A: Rollback Procedures

### If CI build fails mid-deployment:
```bash
# Find last good commit
git log --oneline -10

# Revert to specific commit
git revert HEAD~2  # or specific SHA
git push origin main
```

### If GAS pipeline fails:
1. Check `AutomationLog` sheet for error details
2. Run individual steps manually from the menu:
   - `③ Marquer PUBLISHED` (if fetch succeeded)
   - `④ Pousser recipes.json` (if mark succeeded)
3. If critical, run `testRunFetchMarkPushPipeline()` to retry the full chain

### If sitemap is corrupted:
1. Generate locally: `node scripts/build-recipe-pages.mjs`
2. Commit and push manually: `node scripts/build-recipe-pages.mjs && git add sitemap.xml && git commit -m "fix: regenerate sitemap" && git push`

---

## Appendix B: Monitoring Checklist

After each Phase 1 change, verify:

- [ ] CI workflow runs successfully (GitHub Actions)
- [ ] All recipe pages are generated (check count matches recipes.json)
- [ ] Sitemap is valid XML (validate structure)
- [ ] GAS pipeline runs without errors (check AutomationLog)
- [ ] Homepage loads without JS errors
- [ ] A random recipe page loads correctly with all content
- [ ] Google Search Console shows no new errors

---

*End of SAFE Stabilization Roadmap. Generated 2026-05-15. This document is READ-ONLY — no project files were modified.*
