(function(w) {
  "use strict";
  var A = w.Akkous;
  if (!A) return;

  function renderRecipeTagsAndVideo(recipe) {
    var tagSection = A.$("#recipe-tags-section");
    var tagList = A.$("#recipe-tag-list");
    if (tagList && tagSection) {
      var tags = recipe.tags || [];
      tagList.innerHTML = tags.map(function(t) { return "<li><span>" + A.escapeHtml(String(t)) + "</span></li>"; }).join("");
      tagSection.hidden = !tags.length;
    }

    var ytWrap = A.$("#recipe-youtube-wrap");
    var ytInner = A.$("#recipe-youtube-inner");
    if (!ytWrap || !ytInner) return;

    var yid = A.youtubeVideoId(recipe.youtube || "");
    if (yid) {
      ytWrap.hidden = false;
      ytInner.innerHTML = '<iframe title="Recipe video" src="https://www.youtube.com/embed/' + A.escapeHtml(yid) + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe>';
    } else if (recipe.youtube && String(recipe.youtube).trim()) {
      ytWrap.hidden = false;
      ytInner.innerHTML = '<a class="recipe-youtube__link" href="' + A.escapeHtml(recipe.youtube.trim()) + '" target="_blank" rel="noopener noreferrer">Watch on YouTube</a>';
    } else {
      ytWrap.hidden = true;
      ytInner.innerHTML = "";
    }
  }

  function absoluteRecipePageUrl(recipe) {
    var slug = String(recipe.slug || recipe.id || "").trim();
    var path = "recipes/" + encodeURIComponent(slug) + "/";
    var co = A.state.site && A.state.site.canonicalOrigin && String(A.state.site.canonicalOrigin).replace(/\/+$/, "");
    if (co) return co + "/" + path;
    var base = A.getBaseUrl().replace(/\/+$/, "");
    return base + "/" + path;
  }

  function injectJsonLd(json) {
    var existing = A.$("#recipe-jsonld");
    if (existing) existing.remove();
    var script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "recipe-jsonld";
    script.textContent = JSON.stringify(json);
    document.head.appendChild(script);
  }

  function setMeta(name, content, isProperty) {
    if (content == null || content === "") return;
    var attr = isProperty ? "property" : "name";
    var sel = "meta[" + attr + '="' + name + '"]';
    var el = A.$(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, name);
      document.head.appendChild(el);
    }
    el.setAttribute("content", content);
  }

  function metaDescriptionFromRecipe(recipe) {
    var h = recipe.hook && String(recipe.hook).trim();
    if (h) return h.length > 158 ? h.slice(0, 155) + "\u2026" : h;
    var d = recipe.description && String(recipe.description).trim();
    if (d && !d.includes("recipe with") && !d.includes("ingredients and")) return d.length > 158 ? d.slice(0, 155) + "\u2026" : d;
    var bits = [];
    if (recipe.title) bits.push(recipe.title);
    var cat = recipe.categoryDisplay || A.categoryLabel(recipe.category);
    if (cat) bits.push(cat);
    if (recipe.origin) bits.push(String(recipe.origin) + " recipe");
    var out = bits.join(" \u00b7 ") + ". Ingredients, steps, and tips \u2014 easy recipe on " + (A.state.site.name || "Akkous") + ".";
    return out.length > 158 ? out.slice(0, 155) + "\u2026" : out;
  }

  function updateRecipeMeta(recipe) {
    var url = absoluteRecipePageUrl(recipe);
    var title = recipe.title + " \u2014 " + (A.state.site.name || "Recipes");
    document.title = title;
    var desc = metaDescriptionFromRecipe(recipe);
    setMeta("description", desc);
    setMeta("og:title", title, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "article", true);
    setMeta("og:url", url, true);
    if (recipe.image) setMeta("og:image", recipe.image, true);
    setMeta("twitter:card", "summary_large_image", true);
    setMeta("twitter:title", title, true);
    setMeta("twitter:description", desc, true);
    if (recipe.image) setMeta("twitter:image", recipe.image, true);
    var canonical = A.$("#canonical-url");
    if (canonical) canonical.setAttribute("href", url);
  }

  function buildRecipeJsonLdGraph(recipe) {
    return {
      "@context": "https://schema.org",
      "@type": "Recipe",
      "name": recipe.title,
      "image": recipe.image,
      "description": recipe.description,
      "author": { "@type": "Organization", "name": "Akkous" },
      "prepTime": recipe.prepTime || "PT15M",
      "cookTime": recipe.cookTime || "PT30M",
      "totalTime": recipe.totalTime || "PT45M",
      "recipeYield": recipe.servings ? recipe.servings + " servings" : "4 servings",
      "recipeIngredient": recipe.ingredients || [],
      "recipeInstructions": (recipe.steps || []).map(function(step, i) { return { "@type": "HowToStep", "position": i + 1, "text": step }; }),
      "nutrition": recipe.nutrition ? { "@type": "NutritionInformation", "calories": recipe.nutrition.calories } : undefined
    };
  }

  function buildRecipeFaqItems(recipe) {
    var t = recipe.title || "this recipe";
    var total = recipe.totalTime || "";
    var cook = recipe.cookTime || "";
    var prep = recipe.prepTime || "";
    var servings = recipe.servings || 4;
    var cat = (recipe.category || "").toLowerCase();
    var ingredientHint = (recipe.ingredients || []).slice(0, 2).map(function(s) { return String(s || "").trim(); }).filter(Boolean).join(", ");

    var timeAnswer = total ? t + " usually takes around " + total + " from prep to serving." : cook || prep ? t + " usually takes about " + (prep && cook ? prep + " prep + " + cook + " cooking time." : cook || prep) : "Timing depends on your pace, but most home cooks can finish " + t + " in under one hour.";

    var group = cat === "dessert" ? "dessert" : /^(seafood|fish)$/.test(cat) ? "seafood" : /^(pasta|lasagna)$/.test(cat) ? "pasta" : cat === "breakfast" ? "breakfast" : /^(vegetarian|vegan|side)$/.test(cat) ? "vegetable" : /^(starter|appetizer)$/.test(cat) ? "starter" : "default";

    var serveSides = { dessert: "a scoop of ice cream, fresh berries, or a drizzle of sauce", seafood: "a light salad, steamed vegetables, or crusty bread", pasta: "garlic bread, a fresh green salad, and a glass of wine", breakfast: "fresh fruit, yogurt, or a side of toast", vegetable: "quinoa, roasted potatoes, or a light grain bowl", starter: "as an appetizer with drinks or as part of a larger spread", default: "simple sides like salad, rice, or roasted vegetables" }[group];

    var serveAnswer = "Serve " + t + " with " + serveSides + ". " + "Plan for about " + servings + " serving" + (servings === 1 ? "" : "s") + ".";
    if (ingredientHint) serveAnswer += " Main ingredients include " + ingredientHint + ".";

    var aheadAdvice = { dessert: "Most desserts keep well in the fridge for up to 3 days or freeze for up to a month. Thaw and add fresh toppings before serving.", seafood: "Seafood is best enjoyed fresh, but you can prep ingredients up to a day ahead and cook just before serving. Store leftovers in the fridge for up to 2 days.", pasta: "You can assemble the dish ahead and refrigerate for up to 2 days before baking, or store leftovers in an airtight container for up to 3 days.", breakfast: "You can prep components the night before and finish cooking in the morning. Store leftovers in the fridge for up to 2 days.", vegetable: "Cooked vegetable dishes keep well in the fridge for up to 4 days. Reheat gently to preserve texture and flavor.", starter: "Most appetizers can be prepared a day ahead and reheated or assembled just before serving.", default: "You can cook it ahead and store it in an airtight container in the fridge for up to 3 days. Reheat gently before serving." }[group];

    var substituteAdvice = { dessert: "Swap ingredients with similar texture and moisture content. Adjust sweetness to taste and test doneness with a toothpick.", seafood: "Substitute with a similar type of fish or shellfish, keeping cooking time and thickness in mind. Adjust seasoning to complement.", pasta: "Different pasta shapes work well interchangeably. Adjust cooking time and sauce consistency as needed.", vegetable: "Swap vegetables based on season and availability, keeping cooking times similar. Adjust seasoning to balance flavors.", default: "Use ingredients with similar texture and flavor, then adjust seasoning gradually to keep balance in the final dish." }[group];

    return [
      { q: "How long does it take to make " + t + "?", a: timeAnswer },
      { q: "Can I make " + t + " ahead of time?", a: "Yes. " + aheadAdvice },
      { q: "What should I serve with " + t + "?", a: serveAnswer },
      { q: "Can I substitute ingredients in " + t + "?", a: "Yes. " + substituteAdvice }
    ];
  }

  function renderRecipeFaq(recipe) {
    var root = A.$("#recipe-faq-list");
    if (!root) return;
    var items = buildRecipeFaqItems(recipe);
    root.innerHTML = items.map(function(it, i) {
      return '<details class="recipe-faq__item"' + (i === 0 ? " open" : "") + "><summary>" + A.escapeHtml(it.q) + "</summary><p class=\"recipe-faq__answer\">" + A.escapeHtml(it.a) + "</p></details>";
    }).join("");
  }

  function renderRecipeTip(recipe) {
    var tip = recipe.tip && String(recipe.tip).trim();
    var existing = A.$("#recipe-tip-box");
    if (existing) existing.remove();
    if (!tip) return;
    var steps = A.$("#recipe-steps");
    if (!steps) return;
    var box = document.createElement("div");
    box.id = "recipe-tip-box";
    box.className = "recipe-tip";
    box.innerHTML = "<strong>Chef's Tip:</strong> " + A.escapeHtml(tip);
    steps.parentNode.insertBefore(box, steps.nextSibling);
  }

  var CATEGORY_CTA = {
    chicken: { title: "The Chicken Bible", text: "500+ chicken recipes from around the world \u2014 roasts, curries, stir-fries, and more.", bullets: ["500+ chicken recipes for every occasion", "Quick weeknight dinners to Sunday roasts", "Global flavors made simple"], cta: "Get the Chicken Cookbook", url: "#" },
    beef: { title: "The Steakhouse at Home", text: "Master beef with 200+ recipes from burgers to braises and everything in between.", bullets: ["200+ beef recipes from around the world", "Steaks, stews, burgers, and more", "Tips for perfect doneness every time"], cta: "Get the Beef Cookbook", url: "#" },
    seafood: { title: "Ocean to Table", text: "Fresh seafood recipes that bring coastal cooking to your kitchen.", bullets: ["150+ fish and shellfish recipes", "Easy weeknight dinners to entertaining", "Sustainable seafood tips included"], cta: "Get the Seafood Cookbook", url: "#" },
    pork: { title: "The Pork Companion", text: "Discover succulent pork recipes from quick chops to slow-roasted shoulders.", bullets: ["150+ pork recipes for home cooks", "Roasts, chops, ribs, and more", "Simple marinades and rubs included"], cta: "Get the Pork Cookbook", url: "#" },
    lamb: { title: "The Lamb Lover\u2019s Cookbook", text: "Tender lamb recipes from aromatic curries to classic roasts.", bullets: ["120+ lamb recipes from around the world", "Slow-cooked stews to quick chops", "Perfect pairings and side ideas"], cta: "Get the Lamb Cookbook", url: "#" },
    pasta: { title: "Pasta Perfection", text: "From classic Italian to creative noodle dishes \u2014 master pasta at home.", bullets: ["200+ pasta and noodle recipes", "Fresh pasta from scratch to shortcuts", "Sauces, bakes, and one-pot meals"], cta: "Get the Pasta Cookbook", url: "#" },
    vegetarian: { title: "Plant-Powered Kitchen", text: "Flavorful vegetarian recipes that satisfy everyone at the table.", bullets: ["300+ meat-free recipes", "Hearty mains to light sides", "Protein-packed and family-friendly"], cta: "Get the Vegetarian Cookbook", url: "#" },
    vegan: { title: "Vegan Cheat Meals Cookbook", text: "Discover 200+ tasty vegan recipes that actually feel like cheat meals (but healthy).", bullets: ["200+ vegan recipes with indulgent flavors", "Simple ingredients and beginner-friendly steps", "Fresh ideas for lunches, dinners, and snacks"], cta: "Download the Cookbook Now", url: "https://0f32e8wh-e0m7t1bzvreoy2m9r.hop.clickbank.net" },
    dessert: { title: "Sweet Treats Bible", text: "Indulge in 300+ dessert recipes from quick sweets to show-stopping cakes.", bullets: ["300+ dessert recipes for every craving", "Cakes, cookies, pies, and no-bake treats", "Make-ahead and party favorites"], cta: "Get the Dessert Cookbook", url: "#" },
    breakfast: { title: "The Breakfast Book", text: "Start your day right with 200+ breakfast and brunch recipes.", bullets: ["200+ breakfast recipes from around the world", "Quick weekday ideas to weekend feasts", "Healthy and indulgent options"], cta: "Get the Breakfast Cookbook", url: "#" },
    default: { title: "Akkous Favorites", text: "A curated collection of the best recipes from Akkous \u2014 tested, trusted, and delicious.", bullets: ["Hand-picked recipes from every category", "Beginner-friendly instructions", "New favorites for your weekly rotation"], cta: "Explore the Collection", url: "#" }
  };

  function renderAffiliate(recipe) {
    var affCta = A.$("#affiliate-cta");
    var affHeading = document.getElementById("affiliate-heading");
    var affText = document.querySelector(".recipe-affiliate__text");
    var affBullets = document.querySelector(".recipe-affiliate__bullets");
    if (!affCta || !affHeading || !affText || !affBullets) return;
    var catKey = recipe.category || "default";
    var cta = CATEGORY_CTA[catKey] || CATEGORY_CTA.default;
    affHeading.textContent = cta.title;
    affText.textContent = cta.text;
    affBullets.innerHTML = cta.bullets.map(function(b) { return "<li>" + A.escapeHtml(b) + "</li>"; }).join("");
    affCta.textContent = cta.cta;
    try {
      if (cta.url && cta.url !== "#") {
        var u = new URL(cta.url);
        u.searchParams.set("utm_source", "akkous");
        u.searchParams.set("utm_medium", "affiliate");
        u.searchParams.set("utm_campaign", catKey + "-cookbook");
        u.searchParams.set("utm_content", String(recipe.slug || recipe.id || ""));
        affCta.href = u.toString();
      } else { affCta.href = "#"; }
    } catch (e) { affCta.href = cta.url || "#"; }
  }

  function estimateReadMinutes(recipe) {
    var stepText = (recipe.steps || []).join(" ");
    if (!stepText && typeof recipe.instructions === "string") stepText = recipe.instructions;
    var words = ((recipe.description || "").split(/\s+/).length || 0) + (recipe.ingredients || []).join(" ").split(/\s+/).length + stepText.split(/\s+/).length;
    return Math.max(2, Math.round(words / 200));
  }

  function initShare(recipe) {
    var title = recipe.title || "";
    var canon = document.querySelector('link[rel="canonical"]');
    var url = canon && canon.href ? canon.href : window.location.href;
    var ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

    var xBtn = A.$("#share-x");
    if (xBtn) {
      xBtn.addEventListener("click", function() {
        var text = encodeURIComponent(title);
        var u = encodeURIComponent(url);
        window.open("https://twitter.com/intent/tweet?text=" + text + "&url=" + u, "_blank", "noopener,noreferrer,width=600,height=400");
      });
    }

    var pinBtn = A.$("#share-pinterest");
    if (pinBtn) {
      pinBtn.addEventListener("click", function() {
        var u = encodeURIComponent(url);
        var media = encodeURIComponent(recipe.image || "");
        var desc = encodeURIComponent(title);
        window.open("https://pinterest.com/pin/create/button/?url=" + u + "&media=" + media + "&description=" + desc, "_blank", "noopener,noreferrer,width=750,height=550");
      });
    }

    var whatsappBtn = A.$("#share-whatsapp");
    if (whatsappBtn) {
      whatsappBtn.addEventListener("click", function() {
        var ingredientsText = ingredients.length ? ingredients.map(function(item) { return "- " + item; }).join("\n") : "- (No ingredients listed)";
        var message = "Try this recipe: " + title + "\n\nIngredients:\n" + ingredientsText + "\n\nLink: " + url;
        var waUrl = "https://wa.me/?text=" + encodeURIComponent(message);
        window.open(waUrl, "_blank", "noopener,noreferrer");
      });
    }

    var copyBtn = A.$("#share-copy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function() {
        var svgBackup = copyBtn.innerHTML;
        var checkmark = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        function done() { copyBtn.innerHTML = checkmark; setTimeout(function() { copyBtn.innerHTML = svgBackup; }, 2000); }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(function() { A.fallbackCopy(url, done); });
        } else { A.fallbackCopy(url, done); }
      });
    }
  }

  A.renderRecipePage = function() {
    var id = A.recipeIdFromLocation();
    var recipe = A.findRecipeById(id);
    var main = A.$("#recipe-main");

    if (!recipe) {
      if (main) { main.innerHTML = '<div class="container error-page"><h1>Recipe not found</h1><p>The link may be outdated.</p><p><a href="/">Back to home</a></p></div>'; }
      document.title = "Not found \u2014 " + (A.state.site.name || "Recipes");
      return;
    }

    var loadBanner = A.$("#recipe-loading-banner");
    if (loadBanner) loadBanner.hidden = true;

    updateRecipeMeta(recipe);
    injectJsonLd(buildRecipeJsonLdGraph(recipe));

    var recipeName = recipe.name || recipe.title || "Recipe";
    var fallbackDesc = (recipe.ingredients || []).slice(0, 3).map(function(x) { return String(x || "").trim(); }).filter(Boolean).join(", ");
    var recipeSeoDesc = recipe.description || fallbackDesc || "";
    document.title = recipeName + " \u2014 Akkous";
    var ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (ogTitleTag) ogTitleTag.setAttribute("content", recipeName + " \u2014 Akkous");
    var ogDescTag = document.querySelector('meta[property="og:description"]');
    if (ogDescTag && recipeSeoDesc) ogDescTag.setAttribute("content", recipeSeoDesc);
    var canonicalTag = document.getElementById("canonical-url");
    if (canonicalTag) canonicalTag.setAttribute("href", window.location.href.split("?")[0]);

    var heroImg = A.$("#recipe-hero-image");
    if (heroImg) { heroImg.src = recipe.image || ""; heroImg.alt = recipe.title ? "Photo of " + recipe.title : ""; }

    A.$("#recipe-title").textContent = recipe.title || "";
    var bc = A.$("#breadcrumb-current");
    if (bc) bc.textContent = recipe.title || "Recipe";
    var catHero = A.$("#recipe-category");
    if (catHero) catHero.textContent = recipe.categoryDisplay || A.categoryLabel(recipe.category);
    var originHero = A.$("#recipe-origin");
    if (originHero) originHero.textContent = recipe.origin || "";
    A.$("#recipe-read-time").textContent = estimateReadMinutes(recipe) + " min read";
    A.$("#recipe-servings").textContent = (recipe.servings || 1) + " serving" + ((recipe.servings || 1) === 1 ? "" : "s");

    var qRead = A.$("#recipe-read-time-quick");
    if (qRead) qRead.textContent = estimateReadMinutes(recipe) + " min";
    var qServ = A.$("#recipe-servings-quick");
    if (qServ) qServ.textContent = (recipe.servings || 1) + " serving" + ((recipe.servings || 1) === 1 ? "" : "s");
    var qCat = A.$("#recipe-category-quick");
    if (qCat) qCat.textContent = recipe.categoryDisplay || A.categoryLabel(recipe.category) || "\u2014";
    var qOrig = A.$("#recipe-origin-quick");
    if (qOrig) qOrig.textContent = recipe.origin || "\u2014";

    var introEl = A.$("#recipe-intro");
    if (introEl) {
      var title = recipe.title || "This recipe";
      var category = recipe.categoryDisplay || recipe.category || "";
      var origin = recipe.origin || "";
      var ingCount = (recipe.ingredients || []).length;
      var stepCount = (recipe.steps || []).length;
      var cookTime = recipe.cookTime || recipe.totalTime || "";
      var parts = [];
      if (category && origin) { parts.push("A " + origin + " " + category.toLowerCase() + " recipe."); }
      else if (category) { parts.push("A " + category.toLowerCase() + " recipe."); }
      if (ingCount) parts.push(ingCount + " ingredients");
      if (stepCount) parts.push(stepCount + " steps");
      if (cookTime) parts.push("ready in " + cookTime);
      var summary = title;
      if (parts.length) summary += " \u2014 " + parts.join(", ") + ".";
      introEl.textContent = recipe.hook || summary;
    }

    var pNoteEl = A.$("#recipe-personal-note");
    var pNoteText = A.$("#recipe-personal-note-text");
    if (pNoteEl && pNoteText && recipe.personalNote && String(recipe.personalNote).trim()) {
      pNoteText.textContent = String(recipe.personalNote).trim();
      pNoteEl.hidden = false;
    }

    renderRecipeTip(recipe);
    renderRecipeTagsAndVideo(recipe);

    var wineEl = A.$("#recipe-wine-pairing");
    var wineText = A.$("#recipe-wine-pairing-text");
    if (wineEl && wineText && recipe.winePairing && String(recipe.winePairing).trim()) {
      wineText.textContent = String(recipe.winePairing).trim();
      wineEl.hidden = false;
    }

    var chefTipEl = A.$("#recipe-chef-tip");
    var chefTipText = A.$("#recipe-chef-tip-text");
    if (chefTipEl && chefTipText && recipe.chefTip && String(recipe.chefTip).trim()) {
      chefTipText.textContent = String(recipe.chefTip).trim();
      chefTipEl.hidden = false;
    }

    var storyEl = A.$("#recipe-story");
    var storyText = A.$("#recipe-story-text");
    if (storyEl && storyText && recipe.storyOrigin && String(recipe.storyOrigin).trim()) {
      storyText.textContent = String(recipe.storyOrigin).trim();
      storyEl.hidden = false;
    }

    var chefVarEl = A.$("#recipe-chef");
    var chefVarText = A.$("#recipe-chef-text");
    if (chefVarEl && chefVarText && recipe.chefVariation && String(recipe.chefVariation).trim()) {
      chefVarText.textContent = String(recipe.chefVariation).trim();
      chefVarEl.hidden = false;
    }

    var seasonalEl = A.$("#recipe-season");
    var seasonalText = A.$("#recipe-season-text");
    if (seasonalEl && seasonalText && recipe.seasonalNote && String(recipe.seasonalNote).trim()) {
      seasonalText.textContent = String(recipe.seasonalNote).trim();
      seasonalEl.hidden = false;
    }

    renderRecipeFaq(recipe);
    renderAffiliate(recipe);

    var printBtn = A.$("#print-recipe");
    if (printBtn) { printBtn.onclick = function() { try { window.print(); } catch (e) {} }; }

    var ingList = A.$("#ingredient-list");
    if (ingList) {
      ingList.innerHTML = (recipe.ingredients || []).map(function(ing, i) {
        var sid = "ing-" + recipe.id + "-" + i;
        return "<li><label for=\"" + A.escapeHtml(sid) + "\"><input type=\"checkbox\" id=\"" + A.escapeHtml(sid) + "\"><span>" + A.escapeHtml(ing) + "</span></label></li>";
      }).join("");
    }

    var stepsOl = A.$("#recipe-steps");
    if (stepsOl) {
      var stepLines = recipe.steps;
      if (!stepLines || !stepLines.length) {
        var instr = recipe.instructions;
        if (typeof instr === "string" && instr.trim()) stepLines = instr.split(/\n+/).map(function(s) { return s.trim(); }).filter(Boolean);
      }
      stepsOl.innerHTML = (stepLines || []).map(function(step) { return "<li>" + A.escapeHtml(step) + "</li>"; }).join("");
    }

    var relatedIds = recipe.relatedRecipeIds || [];
    var related = relatedIds.map(function(rid) { return A.findRecipeById(rid); }).filter(Boolean).slice(0, 3);
    if (!related.length) {
      related = A.sortRecipesByPublishDateDesc(A.state.recipes.filter(function(r) { return r.id !== recipe.id && r.category === recipe.category; })).slice(0, 3);
      if (!related.length) related = A.sortRecipesByPublishDateDesc(A.state.recipes.filter(function(r) { return r.id !== recipe.id; })).slice(0, 3);
    }

    var relRoot = A.$("#related-grid");
    if (relRoot) {
      relRoot.innerHTML = related.map(function(r) {
        var imgSrc = r.imageCard || r.image || "";
        return '<article class="related-card io-fade"><a href="' + A.escapeHtml(A.recipeUrl(r.id)) + '"><div class="related-card__img"><img src="' + A.escapeHtml(imgSrc) + '" srcset="' + A.escapeHtml(imgSrc) + '/preview 200w, ' + A.escapeHtml(imgSrc) + ' 700w" sizes="(max-width: 768px) 100vw, 33vw" alt="' + A.escapeHtml((r.title || "Related recipe") + " photo") + '" loading="lazy" decoding="async" width="400" height="250"></div><div class="related-card__body"><h3>' + A.escapeHtml(r.title || "") + "</h3></div></a></article>";
      }).join("");
      A.initImagePlaceholders(relRoot);
      A.initV2LazyImages(relRoot);
    }

    initShare(recipe);
  };
})(window);
