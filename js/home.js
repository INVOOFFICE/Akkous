(function(w) {
  "use strict";
  var A = w.Akkous;
  if (!A) return;

  var TRENDING_SLIDER_MAX = 20;
  var HERO_CAROUSEL_MAX = 7;
  var HERO_AUTO_MS = 7000;

  var heroCarousel = {
    recipes: [],
    index: 0,
    timer: null,
    interactionPause: false,
    userPrefersReducedMotion: false
  };

  function clearHeroLoadingSkeleton() {
    var root = A.$("#hero-section");
    if (root) root.classList.remove("hero--loading");
  }

  function getHeroCarouselRecipes() {
    if (!A.state.recipes.length) return [];
    var sorted = A.sortRecipesByPublishDateDesc(A.state.recipes);
    return sorted.slice(0, HERO_CAROUSEL_MAX);
  }

  function heroRecipeMetaLine(recipe) {
    var parts = [];
    if (recipe.author && recipe.author.name) { parts.push("By " + recipe.author.name); }
    else if (recipe.origin && String(recipe.origin).trim()) { parts.push("By " + String(recipe.origin).trim()); }
    var time = recipe.cookTime || recipe.totalTime || "";
    if (time) parts.push(time);
    return parts.join(" \u00b7 ");
  }

  function renderHeroEmptyState() {
    clearHeroLoadingSkeleton();
    var img = A.$("#hero-image");
    var cta = A.$("#hero-cta");
    var cta2 = A.$("#hero-cta-secondary");
    var dek = A.$("#hero-dek");
    var tagEl = A.$("#hero-tag");
    if (img) { img.removeAttribute("src"); img.alt = ""; img.classList.remove("is-hero-dim"); }
    if (tagEl) tagEl.textContent = "Featured";
    if (dek) dek.textContent = "Publish recipes in your sheet to populate the homepage carousel and latest sections.";
    A.$("#hero-title").textContent = "No recipes yet";
    A.$("#hero-meta").textContent = "recipes.json is empty or could not be read. Check the file and try again.";
    if (cta) { cta.href = "/"; cta.textContent = "Reload"; cta.hidden = false; }
    if (cta2) cta2.hidden = true;
    var dots = A.$("#hero-dots");
    var controls = A.$("#hero-carousel-controls");
    if (dots) { dots.hidden = true; dots.innerHTML = ""; }
    if (controls) controls.hidden = true;
  }

  function paintHeroSlide(recipe, animate) {
    clearHeroLoadingSkeleton();
    var img = A.$("#hero-image");
    var cta = A.$("#hero-cta");
    var cta2 = A.$("#hero-cta-secondary");
    var tagEl = A.$("#hero-tag");
    var dek = A.$("#hero-dek");
    if (!recipe) return;
    if (animate && heroCarousel.userPrefersReducedMotion) animate = false;

    function applyTextAndLink() {
      A.$("#hero-title").textContent = recipe.title || "";
      A.$("#hero-meta").textContent = heroRecipeMetaLine(recipe);
      if (dek) {
        var d = String(recipe.description || "").trim();
        if (!d) d = "Cook " + (recipe.title || "this recipe") + " with clear ingredients and practical step-by-step guidance.";
        dek.textContent = d.length > 170 ? d.slice(0, 167) + "..." : d;
      }
      if (tagEl) tagEl.textContent = recipe.featured ? "Featured" : "Latest";
      if (cta) { cta.hidden = false; cta.textContent = "Read Recipe"; cta.href = A.recipeUrl(recipe.id); }
      if (cta2) cta2.hidden = false;
    }

    function setImgSrc() {
      if (!img) return;
      var src = recipe.image || "";
      if (src) { img.src = src; img.alt = recipe.title ? "Hero image for " + recipe.title : ""; }
      else { img.removeAttribute("src"); img.alt = ""; }
    }

    if (!img || !animate) { setImgSrc(); applyTextAndLink(); return; }

    img.classList.add("is-hero-dim");
    window.setTimeout(function() {
      setImgSrc();
      applyTextAndLink();
      window.setTimeout(function() { img.classList.remove("is-hero-dim"); }, 40);
    }, 220);
  }

  function clearHeroCarouselTimer() {
    if (heroCarousel.timer) { clearInterval(heroCarousel.timer); heroCarousel.timer = null; }
  }

  function scheduleHeroCarouselTimer() {
    clearHeroCarouselTimer();
    if (heroCarousel.recipes.length <= 1) return;
    if (heroCarousel.userPrefersReducedMotion) return;
    heroCarousel.timer = setInterval(function() {
      if (document.hidden || heroCarousel.interactionPause) return;
      advanceHeroCarousel(1);
    }, HERO_AUTO_MS);
  }

  function renderHeroDots() {
    var dots = A.$("#hero-dots");
    var controls = A.$("#hero-carousel-controls");
    if (!dots || !controls) return;
    var n = heroCarousel.recipes.length;
    if (n <= 1) { dots.hidden = true; controls.hidden = true; dots.innerHTML = ""; return; }
    dots.hidden = false;
    controls.hidden = false;
    dots.innerHTML = heroCarousel.recipes.map(function(_r, i) {
      return '<button type="button" class="hero__dot" aria-label="Slide ' + (i + 1) + " of " + n + '"' + (i === heroCarousel.index ? ' aria-current="true"' : "") + ' data-hero-dot="' + i + '"></button>';
    }).join("");
    dots.querySelectorAll(".hero__dot").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var idx = parseInt(btn.getAttribute("data-hero-dot"), 10);
        if (!isNaN(idx)) goHeroCarouselIndex(idx);
      });
    });
  }

  function goHeroCarouselIndex(i) {
    var n = heroCarousel.recipes.length;
    if (!n) return;
    heroCarousel.index = ((i % n) + n) % n;
    paintHeroSlide(heroCarousel.recipes[heroCarousel.index], true);
    renderHeroDots();
    scheduleHeroCarouselTimer();
  }

  function advanceHeroCarousel(delta) { goHeroCarouselIndex(heroCarousel.index + delta); }

  function initHeroCarousel() {
    heroCarousel.userPrefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var recs = getHeroCarouselRecipes();
    heroCarousel.recipes = recs;
    heroCarousel.index = 0;
    heroCarousel.interactionPause = false;
    clearHeroCarouselTimer();

    var root = A.$("#hero-section");
    var prev = A.$("#hero-prev");
    var next = A.$("#hero-next");

    if (!recs.length) { renderHeroEmptyState(); return; }

    paintHeroSlide(recs[0], false);
    renderHeroDots();
    scheduleHeroCarouselTimer();

    if (prev) prev.addEventListener("click", function() { advanceHeroCarousel(-1); });
    if (next) next.addEventListener("click", function() { advanceHeroCarousel(1); });

    if (root) {
      root.addEventListener("mouseenter", function() { heroCarousel.interactionPause = true; });
      root.addEventListener("mouseleave", function() { heroCarousel.interactionPause = false; });
      root.addEventListener("focusin", function() { heroCarousel.interactionPause = true; });
      root.addEventListener("focusout", function(e) { if (!root.contains(e.relatedTarget)) heroCarousel.interactionPause = false; });
    }

    if (window.matchMedia) {
      var mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      var onMotion = function() {
        heroCarousel.userPrefersReducedMotion = mq.matches;
        if (mq.matches) clearHeroCarouselTimer();
        else scheduleHeroCarouselTimer();
      };
      if (mq.addEventListener) mq.addEventListener("change", onMotion);
      else if (mq.addListener) mq.addListener(onMotion);
    }
  }

  function renderTrending() {
    var track = A.$("#trending-track");
    if (!track) return;
    if (!A.state.recipes.length) { track.innerHTML = ""; return; }
    var sorted = A.sortRecipesByPublishDateDesc(A.state.recipes);
    var latest = sorted.slice(0, TRENDING_SLIDER_MAX);
    track.innerHTML = latest.map(function(r) {
      var tag = r.categoryDisplay || (r.tags && r.tags[0]) || A.categoryLabel(r.category) || "Recipe";
      var imgSrc = r.imageCard || r.image || "";
      var whenLabel = A.formatTrendCardDate(r) || r.cookTime || r.totalTime || "";
      return '<article class="trend-card io-fade" role="listitem"><a class="trend-card__link" href="' + A.escapeHtml(A.recipeUrl(r.id)) + '"><div class="trend-card__img"><img src="' + A.escapeHtml(imgSrc) + '" srcset="' + A.escapeHtml(imgSrc) + '/preview 200w, ' + A.escapeHtml(imgSrc) + ' 700w" sizes="(max-width: 768px) 100vw, 50vw" alt="' + A.escapeHtml((r.title || "Recipe") + " photo") + '" loading="lazy" decoding="async" width="400" height="300"></div><div class="trend-card__body"><h3 class="trend-card__title">' + A.escapeHtml(r.title || "") + '</h3><div class="trend-card__meta"><span>' + A.escapeHtml(whenLabel) + '</span><span class="trend-card__tag">' + A.escapeHtml(tag) + "</span></div></div></a></article>";
    }).join("");
    A.initImagePlaceholders(track);
    A.initV2LazyImages(track);
  }

  function initTrendingSlider() {
    var track = A.$("#trending-track");
    var prev = A.$("#trending-prev");
    var next = A.$("#trending-next");
    if (!track) return;
    function scrollAmount() { return Math.min(Math.max(260, track.clientWidth * 0.75), 520); }
    if (prev) prev.addEventListener("click", function() { track.scrollBy({ left: -scrollAmount(), behavior: "smooth" }); });
    if (next) next.addEventListener("click", function() { track.scrollBy({ left: scrollAmount(), behavior: "smooth" }); });
  }

  var SPOTLIGHT_BLURB = {
    chicken: "From quick saut\u00e9s to slow roasts",
    beef: "Steaks, stews, and bold flavors",
    seafood: "Fish, shellfish, and coastal dishes",
    pasta: "Noodles, sauces, and baked classics",
    vegetarian: "Plant-forward plates full of flavor",
    vegan: "Fully plant-based favorites",
    goat: "Rich curries and tender cuts",
    pork: "Roasts, chops, and weekday meals",
    lamb: "Roasts, chops, and aromatic dishes",
    side: "Sides that complete the meal",
    dessert: "Sweet endings for any occasion",
    desserts: "Sweet endings for any occasion",
    breakfast: "Morning favorites",
    miscellaneous: "More ideas to explore",
    starter: "Small plates to open the meal"
  };

  var CATEGORY_ICONS = {
    chicken: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a4 4 0 0 0-4 4c0 2 1 3 2 4l-2 5h8l-2-5c1-1 2-2 2-4a4 4 0 0 0-4-4z"/><path d="M8 15v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2"/></svg>',
    beef: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5c0 2 1 3 2 4l-1 4h8l-1-4c1-1 2-2 2-4a5 5 0 0 0-5-5z"/><path d="M8 15v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3"/></svg>',
    seafood: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2c-3 0-5 2-5 5 0 2 1 3 2 4l-2 5h10l-2-5c1-1 2-2 2-4 0-3-2-5-5-5z"/><path d="M8 15v2a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2"/></svg>',
    pasta: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18l-3 8H6l-3-8z"/><path d="M3 12V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/></svg>',
    vegetarian: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22c4-4 8-8 8-14a8 8 0 0 0-16 0c0 6 4 10 8 14z"/><path d="M12 8v8"/></svg>',
    dessert: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
    soup: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18l-3 8H6l-3-8z"/><path d="M3 12V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/><path d="M7 8V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2"/></svg>',
    breakfast: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 1v6"/><path d="M12 17v6"/><path d="M4.22 4.22l4.24 4.24"/><path d="M15.54 15.54l4.24 4.24"/><path d="M1 12h6"/><path d="M17 12h6"/><path d="M4.22 19.78l4.24-4.24"/><path d="M15.54 8.46l4.24-4.24"/></svg>',
    lamb: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a5 5 0 0 0-5 5c0 2 1 3 2 4l-1 4h8l-1-4c1-1 2-2 2-4a5 5 0 0 0-5-5z"/><path d="M8 15v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3"/><path d="M12 8v4"/></svg>',
    side: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18l-3 8H6l-3-8z"/><path d="M3 12V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/></svg>'
  };

  function spotlightBlurb(key, label, count) {
    if (SPOTLIGHT_BLURB[key]) return SPOTLIGHT_BLURB[key];
    var n = count || 0;
    return n + (n === 1 ? " recipe" : " recipes") + " \u2014 explore " + label;
  }

  function renderCategorySpotlight() {
    var grid = A.$("#category-spotlight-grid");
    if (!grid) return;
    if (!A.state.categoryKeys.length) {
      grid.innerHTML = '<p class="empty-state" role="status">No categories yet. Publish recipes or sync TheMealDB taxonomy in Apps Script.</p>';
      return;
    }
    grid.innerHTML = A.state.categoryKeys.map(function(key) {
      var meta = A.categoryRowMeta(key);
      var href = A.homeIndexFileUrl() + "?cat=" + encodeURIComponent(meta.key) + "#recipe-grid";
      var desc = spotlightBlurb(meta.key, meta.label, meta.count);
      var icon = CATEGORY_ICONS[meta.key] || '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h18l-3 8H6l-3-8z"/><path d="M3 12V8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4"/></svg>';
      return '<a class="category-spotlight__card" role="listitem" href="' + A.escapeHtml(href) + '"><strong><span class="category-spotlight__icon" aria-hidden="true">' + icon + "</span>" + A.escapeHtml(meta.label) + "</strong><span>" + A.escapeHtml(desc) + "</span></a>";
    }).join("");
  }

  function renderFilterPills() {
    var inner = A.$("#category-filter-pills");
    if (!inner) return;
    var pills = ['<button type="button" class="filter-pill" data-category="all" aria-pressed="true">All</button>'];
    A.state.categoryKeys.forEach(function(key) {
      var meta = A.categoryRowMeta(key);
      pills.push('<button type="button" class="filter-pill" data-category="' + A.escapeHtml(meta.key) + '" aria-pressed="false">' + A.escapeHtml(meta.label) + "</button>");
    });
    inner.innerHTML = pills.join("");
  }

  function matchesFilters(recipe) {
    if (A.state.activeCategory !== "all" && recipe.category !== A.state.activeCategory) return false;
    if (A.state.searchQuery) {
      var q = A.state.searchQuery;
      var blob = (recipe.title || "") + " " + (recipe.description || "") + " " + (recipe.tags || []).join(" ") + " " + ((recipe.author && recipe.author.name) || "") + " " + (recipe.origin || "") + " " + (recipe.slug || "");
      if (blob.toLowerCase().indexOf(q) === -1) return false;
    }
    return true;
  }

  function updateGridHeading() {
    var heading = A.$("#grid-heading");
    if (!heading) return;
    if (A.state.activeCategory === "all") { heading.textContent = "All Recipes"; return; }
    var meta = A.categoryRowMeta(A.state.activeCategory);
    heading.textContent = (meta.label || A.categoryLabel(A.state.activeCategory)) + " Recipes";
  }

  function recipeCardHtml(r) {
    var imgSrc = r.imageCard || r.image || "";
    var avatar = "/img.png";
    return '<article class="recipe-card recipe-card-container"><a class="recipe-card__link" href="' + A.escapeHtml(A.recipeUrl(r.id)) + '"><div class="recipe-card__img"><span class="recipe-card__badge">' + A.escapeHtml(r.difficulty || "") + '</span><img src="' + A.escapeHtml(imgSrc) + '" srcset="' + A.escapeHtml(imgSrc) + '/preview 200w, ' + A.escapeHtml(imgSrc) + ' 700w" sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" alt="' + A.escapeHtml((r.title || "Recipe") + " photo") + '" loading="lazy" decoding="async" width="600" height="750"></div><div class="recipe-card__body"><h3 class="recipe-card__title">' + A.escapeHtml(r.title || "") + '</h3><p class="recipe-card__category">' + A.escapeHtml(r.categoryDisplay || A.categoryLabel(r.category)) + '</p><div class="recipe-card__author"><img src="' + A.escapeHtml(avatar) + '" alt="' + A.escapeHtml(((r.author && r.author.name) || "Recipe author") + " avatar") + '" loading="lazy" width="32" height="32"><span>' + A.escapeHtml((r.author && r.author.name) || "") + "</span></div>" + (r.origin ? '<p class="recipe-card__origin">' + A.escapeHtml(r.origin) + "</p>" : "") + '<p class="recipe-card__time">' + A.escapeHtml(r.cookTime || r.totalTime || "") + '</p><div class="recipe-card__footer"><span class="recipe-card__cta">View recipe</span></div></div></a></article>';
  }

  function updateLoadMoreButton() {
    var wrap = A.$("#load-more-wrap");
    if (!wrap) return;
    var remaining = A.state._filteredList.length - A.state.paginationCount;
    if (remaining <= 0) { wrap.hidden = true; return; }
    wrap.hidden = false;
    var btn = wrap.querySelector(".load-more__btn");
    if (btn) btn.textContent = "Load More (" + remaining + " recipes)";
  }

  function onLoadMore() {
    var grid = A.$("#recipe-grid");
    if (!grid) return;
    var next = Math.min(A.state.paginationCount + A.PAGE_SIZE, A.state._filteredList.length);
    var html = A.state._filteredList.slice(A.state.paginationCount, next).map(recipeCardHtml).join("");
    grid.insertAdjacentHTML("beforeend", html);
    A.state.paginationCount = next;
    updateLoadMoreButton();
    A.initImagePlaceholders(grid);
    A.initV2LazyImages(grid);
    updateLoadMoreButton();
  }

  function renderGrid() {
    var grid = A.$("#recipe-grid");
    if (!grid) return;
    updateGridHeading();
    A.state._filteredList = A.sortRecipesByPublishDateDesc(A.state.recipes.filter(matchesFilters));
    if (!A.state._filteredList.length) {
      var msg = A.state.recipes.length === 0 ? "No recipes in recipes.json yet. Publish from your sheet and push the updated file." : "No recipes match your filters.";
      grid.innerHTML = '<p class="empty-state" role="status">' + msg + "</p>";
      A.state.paginationCount = 0;
      updateLoadMoreButton();
      return;
    }
    A.state.paginationCount = Math.min(A.PAGE_SIZE, A.state._filteredList.length);
    grid.innerHTML = A.state._filteredList.slice(0, A.state.paginationCount).map(recipeCardHtml).join("");
    A.initImagePlaceholders(grid);
    A.initV2LazyImages(grid);
    updateLoadMoreButton();
  }

  A.setFilter = function(category) {
    A.state.activeCategory = category;
    A.$$(".filter-pill").forEach(function(btn) {
      var cat = btn.getAttribute("data-category") || "all";
      btn.setAttribute("aria-pressed", cat === category ? "true" : "false");
    });
    renderGrid();
    A.initScrollFadeIn();
  };

  function initFilters() {
    A.$$(".filter-pill").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var cat = btn.getAttribute("data-category") || "all";
        A.setFilter(cat);
      });
    });
  }

  function initSearch() {
    var input = A.$("#site-search");
    if (!input) return;
    var countBadge = A.$("#site-search-count");

    function updateCountBadge() {
      if (!countBadge) return;
      var raw = (input.value || "").trim();
      if (!raw) { countBadge.hidden = true; countBadge.textContent = ""; return; }
      var n = A.state.recipes.filter(matchesFilters).length;
      countBadge.textContent = n + " recipes found";
      countBadge.hidden = false;
    }

    function apply() {
      A.state.searchQuery = (input.value || "").trim().toLowerCase();
      renderGrid();
      updateCountBadge();
      A.initScrollFadeIn();
      if (A.isHomePage() && typeof history !== "undefined" && history.replaceState) {
        var u = new URL(window.location.href);
        if (A.state.searchQuery) u.searchParams.set("q", (input.value || "").trim());
        else u.searchParams.delete("q");
        history.replaceState({}, "", u.pathname + u.search + u.hash);
      }
    }

    input.addEventListener("input", apply);
    input.addEventListener("search", apply);
    updateCountBadge();
  }

  function initSearchQueryFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var q = params.get("q");
    if (!q) return;
    var input = A.$("#site-search");
    if (input) input.value = q;
    A.state.searchQuery = q.trim().toLowerCase();
  }

  function initNewsletter() {
    var form = A.$("#newsletter-form");
    if (!form) return;
    var status = A.$("#newsletter-status");
    var iframe = A.$("#newsletter-iframe");
    var section = form.closest(".newsletter") || A.$(".newsletter");
    var successFxTimer = null;

    function newsletterEndpoint() {
      var fromAttr = (form.getAttribute("data-newsletter-endpoint") || "").trim();
      if (fromAttr) return fromAttr;
      if (A.state.site && A.state.site.newsletterWebAppUrl) return String(A.state.site.newsletterWebAppUrl).trim();
      return "";
    }

    form.addEventListener("submit", function(e) {
      var input = A.$("#newsletter-email");
      var email = input && input.value ? String(input.value).trim() : "";
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        e.preventDefault();
        if (status) { status.textContent = "Please enter a valid email address."; status.setAttribute("role", "alert"); }
        return;
      }

      var endpoint = newsletterEndpoint();
      if (!endpoint) {
        e.preventDefault();
        if (status) { status.textContent = "Thanks! (Configure the newsletter: Google Sheet menu \u246b\u2013\u246c, then push recipes.json or set data-newsletter-endpoint on the form.)"; status.setAttribute("role", "status"); }
        form.reset();
        return;
      }

      form.setAttribute("method", "post");
      form.setAttribute("action", endpoint);
      form.setAttribute("target", "newsletter-iframe");
      if (status) { status.textContent = "Sending\u2026"; status.setAttribute("role", "status"); }

      var finished = false;
      function done(ok) {
        if (finished) return;
        finished = true;
        if (status) { status.textContent = ok ? "Thanks \u2014 you're on the list." : "Could not subscribe. Try again later."; status.setAttribute("role", ok ? "status" : "alert"); }
        if (section) {
          if (successFxTimer) { clearTimeout(successFxTimer); successFxTimer = null; }
          section.classList.remove("newsletter--success");
          if (ok) { void section.offsetWidth; section.classList.add("newsletter--success"); successFxTimer = setTimeout(function() { section.classList.remove("newsletter--success"); }, 4000); }
        }
        form.reset();
        if (iframe) iframe.onload = null;
      }

      var timeoutId = setTimeout(function() { done(false); }, 25000);
      if (iframe) { iframe.onload = function() { clearTimeout(timeoutId); done(true); }; }
      else { clearTimeout(timeoutId); e.preventDefault(); done(false); }
    });
  }

  A.scrollToRecipeGrid = function() {
    var el = A.$("#recipe-grid");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  function initCategoryFromUrl() {
    var params = new URLSearchParams(window.location.search);
    var cat = (params.get("cat") || "all").toLowerCase();
    if (!A.state.validCategorySet || !A.state.validCategorySet.has(cat)) cat = "all";
    A.setFilter(cat);
  }

  A.initHomePage = function() {
    A.applyBranding();
    renderCategorySpotlight();
    renderFilterPills();
    initHeroCarousel();
    renderTrending();
    initSearchQueryFromUrl();
    initCategoryFromUrl();
    initFilters();
    initSearch();
    initNewsletter();
    initTrendingSlider();
    var lmWrap = A.$("#load-more-wrap");
    if (lmWrap) {
      var lmBtn = lmWrap.querySelector(".load-more__btn");
      if (lmBtn) lmBtn.addEventListener("click", onLoadMore);
    }
  };
})(window);
