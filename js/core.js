(function(w) {
  "use strict";
  var A = w.Akkous = w.Akkous || {};

  A.DEBUG = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  A.log = function() {
    for (var _len = arguments.length, a = new Array(_len), _key = 0; _key < _len; _key++) { a[_key] = arguments[_key]; }
    A.DEBUG && console.log.apply(console, a);
  };
  A.RECIPE_PAGE = "recipe.html";

  A.$ = function(sel, root) { return (root || document).querySelector(sel); };
  A.$$ = function(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  A.escapeHtml = function(str) {
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  };

  A.PAGE_SIZE = 12;

  A.state = {
    data: null,
    recipes: [],
    site: {},
    activeCategory: "all",
    searchQuery: "",
    recipeCategoryTaxonomyKeys: null,
    categoryKeys: [],
    validCategorySet: null,
    paginationCount: 0,
    _filteredList: [],
  };

  A.siteRootRelativePrefix = function() {
    var segs = window.location.pathname.split("/").filter(Boolean);
    if (segs.length && /index\.html?/i.test(segs[segs.length - 1])) { segs.pop(); }
    var ri = segs.indexOf("recipes");
    if (ri < 0 || ri >= segs.length - 1) return "";
    return "../".repeat(segs.length);
  };

  A.dataUrl = function() {
    var p = A.siteRootRelativePrefix();
    if (p) { return new URL(p + "recipes.json", window.location.href).href; }
    return new URL("recipes.json", window.location.href).href;
  };

  A.getBaseUrl = function() {
    var p = A.siteRootRelativePrefix();
    if (p) { return new URL(p, window.location.href).href; }
    return new URL(".", window.location.href).href;
  };

  A.homeIndexFileUrl = function() { return A.siteRootRelativePrefix(); };

  A.isRecipePage = function() { return !!document.getElementById("recipe-main"); };
  A.isHomePage = function() { return !!document.getElementById("recipe-grid"); };

  A.recipeIdFromLocation = function() {
    var segs = window.location.pathname.split("/").filter(Boolean);
    if (segs.length && /index\.html?/i.test(segs[segs.length - 1])) { segs.pop(); }
    var ri = segs.indexOf("recipes");
    if (ri >= 0 && ri < segs.length - 1) { return segs[ri + 1]; }
    return null;
  };

  A.slugifyCategoryKey = function(raw) {
    var s = String(raw || "").trim().toLowerCase().replace(/\s+/g, "-");
    s = s.replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
    return s || "uncategorized";
  };

  A.normalizeRecipeCategoryKey = function(raw) { return A.slugifyCategoryKey(raw); };

  A.prettyCategoryDisplay = function(raw, normalizedKey) {
    var r = String(raw || "").trim();
    if (r) { return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase(); }
    return A.categoryLabel(normalizedKey);
  };

  A.categoryLabel = function(key) {
    if (!key || key === "all") return "All";
    var map = { uncategorized: "Uncategorized" };
    if (map[key]) return map[key];
    return key.split("-").filter(Boolean).map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }).join(" ");
  };

  A.recipePublishTimeMs = function(recipe) {
    var raw = recipe.publishDate || recipe.datePublished || "";
    if (!raw) return 0;
    var s = String(raw).trim();
    if (!s) return 0;
    if (s.length === 10 && s.indexOf("T") === -1) { s = s + "T12:00:00"; }
    try { var t = new Date(s).getTime(); return isNaN(t) ? 0 : t; } catch (e) { return 0; }
  };

  A.formatTrendCardDate = function(recipe) {
    var raw = recipe.datePublished || "";
    if (!raw && recipe.publishDate) { raw = String(recipe.publishDate).slice(0, 10); }
    if (!raw) return "";
    try {
      var s = String(raw).trim();
      var d = new Date(s.length === 10 ? s + "T12:00:00" : s);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    } catch (e) { return ""; }
  };

  A.youtubeVideoId = function(url) {
    if (!url || typeof url !== "string") return "";
    var u = url.trim();
    var m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
    return m ? m[1] : "";
  };

  A.recipeUrl = function(id) {
    var rid = String(id || "").trim();
    var recipe = A.state.recipes.find(function(r) { return r.id === rid; });
    if (!recipe) { recipe = A.state.recipes.find(function(r) { return String(r.slug || "") === rid; }); }
    var slug = recipe && String(recipe.slug || recipe.id || "").trim();
    if (!slug) return A.RECIPE_PAGE + "?id=" + encodeURIComponent(rid);
    return A.siteRootRelativePrefix() + "recipes/" + encodeURIComponent(slug) + "/";
  };

  A.sortRecipesByPublishDateDesc = function(recipes) {
    return recipes.slice().sort(function(a, b) {
      var tb = A.recipePublishTimeMs(b);
      var ta = A.recipePublishTimeMs(a);
      if (tb !== ta) return tb - ta;
      return String(a.title || "").localeCompare(String(b.title || ""));
    });
  };

  A.findRecipeById = function(rawId) {
    if (rawId == null || rawId === "") return null;
    var id = String(rawId).trim();
    try { id = decodeURIComponent(id); } catch (e) {}
    id = id.trim();
    return A.state.recipes.find(function(r) {
      if (r.id === id) return true;
      if (r.slug != null && String(r.slug) === id) return true;
      if (r.mealId != null && String(r.mealId) === id) return true;
      return false;
    }) || null;
  };

  A.loadData = function() {
    return fetch(A.dataUrl())
      .then(function(res) {
        if (!res.ok) throw new Error("Failed to load recipes");
        return res.json();
      })
      .then(function(data) {
        var recipes, site;
        if (Array.isArray(data)) { recipes = data; site = {}; }
        else { site = data.site || {}; recipes = data.recipes || []; }
        A.state.data = Array.isArray(data) ? { site: site, recipes: recipes } : data;
        A.state.site = site;
        A.state.recipeCategoryTaxonomyKeys = null;
        if (site && Array.isArray(site.recipeCategoryTaxonomy) && site.recipeCategoryTaxonomy.length) {
          A.state.recipeCategoryTaxonomyKeys = site.recipeCategoryTaxonomy.map(function(t) { return A.slugifyCategoryKey(t); });
        }
        A.state.recipes = recipes.map(function(r) {
          var rawCat = r.category || "";
          var key = A.normalizeRecipeCategoryKey(rawCat);
          r.categoryDisplay = A.prettyCategoryDisplay(rawCat, key);
          r.category = key;
          if (!r.datePublished && r.publishDate) { r.datePublished = String(r.publishDate).slice(0, 10); }
          if (!r.mealId && r.id && /^\d+$/.test(String(r.id).trim())) { r.mealId = String(r.id).trim(); }
          return r;
        });
        return A.state.data;
      });
  };

  A.refreshDerivedCategories_ = function() {
    var fromRecipes = [];
    var seen = {};
    A.state.recipes.forEach(function(r) {
      var k = r.category;
      if (!k || seen[k]) return;
      seen[k] = true;
      fromRecipes.push(k);
    });
    var tax = A.state.recipeCategoryTaxonomyKeys;
    if (tax && tax.length) {
      var ordered = [], used = {};
      tax.forEach(function(k) { if (!k || used[k]) return; used[k] = true; ordered.push(k); });
      fromRecipes.forEach(function(k) { if (!used[k]) { used[k] = true; ordered.push(k); } });
      A.state.categoryKeys = ordered;
    } else {
      A.state.categoryKeys = fromRecipes.slice().sort(function(a, b) { return A.categoryLabel(a).localeCompare(A.categoryLabel(b)); });
    }
    A.state.validCategorySet = new Set(A.state.categoryKeys);
    A.state.validCategorySet.add("all");
  };

  A.categoryRowMeta = function(key) {
    var sample = A.state.recipes.find(function(r) { return r.category === key; });
    var label = (sample && sample.categoryDisplay) || A.categoryLabel(key);
    var count = A.state.recipes.filter(function(r) { return r.category === key; }).length;
    return { key: key, label: label, count: count };
  };

  A.fallbackCopy = function(text, cb) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px;opacity:0";
      document.body.appendChild(ta); ta.focus(); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
    } catch (e) {}
    if (cb) cb();
  };

  A.initImagePlaceholders = function(root) {
    var imgs = root ? root.querySelectorAll(".recipe-card__img img, .trend-card__img img, .related-card__img img") : [];
    imgs.forEach(function(img) {
      var parent = img.closest(".recipe-card__img, .trend-card__img, .related-card__img");
      if (!parent) return;
      function markLoaded() { parent.classList.add(parent.className.split(" ")[0] + "--loaded"); }
      function markError() { parent.classList.add(parent.className.split(" ")[0] + "--error"); }
      if (img.complete && img.naturalWidth) { markLoaded(); return; }
      if (img.complete && !img.naturalWidth) { markError(); return; }
      img.addEventListener("load", markLoaded, { once: true });
      img.addEventListener("error", markError, { once: true });
    });
  };

  A.initV2LazyImages = function(root) {
    var imgs = root ? root.querySelectorAll(".recipe-card__img img, .trend-card__img img, .related-card__img img") : [];
    if (!("IntersectionObserver" in window)) return;
    var obs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add("v2-img-visible"); obs.unobserve(entry.target); }
      });
    }, { rootMargin: "200px" });
    imgs.forEach(function(img) { obs.observe(img); });
  };

  A.renderNavCategoryLinks = function() {
    var wrap = A.$("#nav-category-links");
    if (!wrap) return;
    var home = A.homeIndexFileUrl();
    var parts = ['<a class="nav__link" href="' + A.escapeHtml(home + "#recipe-grid") + '" data-nav-cat="all">All</a>'];
    A.state.categoryKeys.forEach(function(key) {
      var meta = A.categoryRowMeta(key);
      parts.push('<a class="nav__link" href="' + A.escapeHtml(home + "?cat=" + encodeURIComponent(meta.key) + "#recipe-grid") + '" data-nav-cat="' + A.escapeHtml(meta.key) + '">' + A.escapeHtml(meta.label) + "</a>");
    });
    wrap.innerHTML = parts.join("");
  };

  A.initNavCategoryLinks = function() {
    A.$$("a[data-nav-cat]").forEach(function(link) {
      link.addEventListener("click", function(e) {
        var cat = link.getAttribute("data-nav-cat") || "all";
        if (!A.state.validCategorySet || !A.state.validCategorySet.has(cat)) return;
        if (A.isHomePage()) {
          e.preventDefault();
          if (typeof history !== "undefined" && history.replaceState) {
            var u = new URL(window.location.href);
            if (cat === "all") u.searchParams.delete("cat");
            else u.searchParams.set("cat", cat);
            history.replaceState({}, "", u.pathname + u.search + u.hash);
          }
          if (typeof A.setFilter === "function") A.setFilter(cat);
          if (typeof A.scrollToRecipeGrid === "function") A.scrollToRecipeGrid();
        }
      });
    });
  };

  A.initGlobalCategoryNav_ = function() {
    A.renderNavCategoryLinks();
    A.initNavCategoryLinks();
  };

  A.applyBranding = function() {
    var name = A.state.site.name || "Akkous";
    A.$$("[data-site-name]").forEach(function(el) { el.textContent = name; });
    if (A.isHomePage()) { document.title = name + " — From your kitchen to the world"; }
    var nh = A.$("#newsletter-heading");
    if (nh && A.state.site.newsletterHeading) nh.textContent = A.state.site.newsletterHeading;
    var ns = A.$("#newsletter-subtext");
    if (ns && A.state.site.newsletterSubtext) ns.textContent = A.state.site.newsletterSubtext;
  };

  A.initScrollFadeIn = function() {
    var nodes = A.$$(".io-fade");
    if (!nodes.length || !("IntersectionObserver" in window)) {
      nodes.forEach(function(el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -40px 0px", threshold: 0.08 });
    nodes.forEach(function(el) { io.observe(el); });
  };

  A.initPageSearchRedirect = function() {
    if (A.isHomePage()) return;
    var input = A.$("#site-search");
    if (!input) return;
    input.addEventListener("keydown", function(e) {
      if (e.key !== "Enter") return;
      e.preventDefault();
      var raw = (input.value || "").trim();
      window.location.href = A.siteRootRelativePrefix() + (raw ? "?q=" + encodeURIComponent(raw) : "") + "#recipe-grid";
    });
  };

  A.boot = function() {
    A.log("Akkous core boot");

    if (typeof A.initTheme === "function") A.initTheme();
    if (typeof A.initMobileNav === "function") A.initMobileNav();
    if (typeof A.initBackToTop === "function") A.initBackToTop();
    if (typeof A.initPwaInstall === "function") A.initPwaInstall();
    if (typeof A.registerServiceWorker === "function") A.registerServiceWorker();
    if (typeof A.initReveal === "function") A.initReveal();

    var themeBtn = A.$("#theme-toggle");
    if (themeBtn && typeof A.toggleTheme === "function") themeBtn.addEventListener("click", A.toggleTheme);

    A.loadData()
      .then(function() {
        A.refreshDerivedCategories_();
        if (typeof A.initPageSearchRedirect === "function") A.initPageSearchRedirect();
        A.initGlobalCategoryNav_();

        if (A.isRecipePage()) {
          A.applyBranding();
          if (typeof A.renderRecipePage === "function") A.renderRecipePage();
        } else if (A.isHomePage()) {
          if (typeof A.initHomePage === "function") A.initHomePage();
        }

        A.initScrollFadeIn();
      })
      .catch(function(err) {
        console.error(err);
        var grid = A.$("#recipe-grid");
        if (grid) { grid.innerHTML = '<p class="empty-state" role="alert">Could not load recipes. Check that recipes.json is available.</p>'; }
        var main = A.$("#recipe-main");
        if (main) { main.innerHTML = '<div class="container error-page"><h1>Something went wrong</h1><p>Could not load recipe data.</p></div>'; }
      });
  };
})(window);
