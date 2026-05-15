/**
 * Génère une page HTML statique par recette (SEO + Open Graph dans le HTML)
 * et réécrit sitemap.xml. Ne supprime pas recipe.html?id= (rétrocompatibilité).
 *
 * Usage: node scripts/build-recipe-pages.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const RECIPES_JSON = path.join(ROOT, "recipes.json");
const RECIPE_TEMPLATE = path.join(ROOT, "recipe.html");
const SITEMAP_OUT = path.join(ROOT, "sitemap.xml");
const RECIPES_DIR = path.join(ROOT, "recipes");

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Aligné sur main.js : slug depuis la colonne Category du sheet. */
function slugifyCategoryKey(raw) {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const cleaned = s
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "uncategorized";
}

function normalizeRecipeCategoryKey(raw) {
  return slugifyCategoryKey(raw);
}

function categoryLabel(key) {
  if (!key || key === "all") return "All";
  const fixed = { uncategorized: "Uncategorized" };
  if (fixed[key]) return fixed[key];
  return key
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function prettyCategoryDisplay(raw, normalizedKey) {
  const r = String(raw || "").trim();
  if (r) return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
  return categoryLabel(normalizedKey);
}

function prepareRecipe(r) {
  const rawCat = r.category || "";
  const key = normalizeRecipeCategoryKey(rawCat);
  return {
    ...r,
    category: key,
    categoryDisplay: prettyCategoryDisplay(rawCat, key),
  };
}

function metaDescriptionFromRecipe(recipe, siteName) {
  const d = recipe.description && String(recipe.description).trim();
  if (d) return d.length > 158 ? d.slice(0, 155) + "…" : d;
  const bits = [];
  if (recipe.title) bits.push(recipe.title);
  const cat = recipe.categoryDisplay || categoryLabel(recipe.category);
  if (cat) bits.push(cat);
  if (recipe.origin) bits.push(String(recipe.origin) + " recipe");
  let out =
    bits.join(" · ") +
    ". Ingredients, steps, and tips — easy recipe on " +
    (siteName || "Akkous") +
    ".";
  return out.length > 158 ? out.slice(0, 155) + "…" : out;
}

function minutesFromTimeLabel(label) {
  if (!label || typeof label !== "string") return undefined;
  const m = label.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : undefined;
}

function youtubeVideoId(url) {
  if (!url || typeof url !== "string") return "";
  const u = url.trim();
  const m = u.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/
  );
  return m ? m[1] : "";
}

function getSteps(recipe) {
  let steps = recipe.steps;
  if (!steps || !steps.length) {
    const instr = recipe.instructions;
    if (typeof instr === "string" && instr.trim()) {
      steps = instr
        .split(/\n+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return steps || [];
}

function estimateReadMinutes(recipe) {
  const stepText = (recipe.steps || []).join(" ");
  const instrText =
    typeof recipe.instructions === "string" ? recipe.instructions : "";
  const words =
    ((recipe.description || "").split(/\s+/).length || 0) +
    (recipe.ingredients || []).join(" ").split(/\s+/).length +
    (stepText || instrText).split(/\s+/).length;
  return Math.max(2, Math.round(words / 200));
}

/** JSON-LD : évite de mettre la cuisine (origin) comme nom d’auteur (aligné Apps Script + main.js). */
function schemaAuthorName(recipe, siteName) {
  const sn = siteName || "Akkous";
  const raw = recipe.author && recipe.author.name;
  if (!raw || !String(raw).trim()) return sn;
  const name = String(raw).trim();
  const origin = recipe.origin && String(recipe.origin).trim();
  if (origin && origin.toLowerCase() === name.toLowerCase()) return sn;
  return name;
}

function buildRecipeFaqItems(recipe) {
  const t = recipe.title || "this recipe";
  const total = recipe.totalTime || "";
  const cook = recipe.cookTime || "";
  const prep = recipe.prepTime || "";
  const servings = recipe.servings || 4;
  const cat = (recipe.category || "").toLowerCase();
  const ingredientHint = (recipe.ingredients || [])
    .slice(0, 2)
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(", ");

  const timeAnswer = total
    ? t + " usually takes around " + total + " from prep to serving."
    : cook || prep
      ? t +
        " usually takes about " +
        (prep && cook ? prep + " prep + " + cook + " cooking time." : cook || prep)
      : "Timing depends on your pace, but most home cooks can finish " +
        t +
        " in under one hour.";

  const group = cat === "dessert" ? "dessert"
    : /^(seafood|fish)$/.test(cat) ? "seafood"
    : /^(pasta|lasagna)$/.test(cat) ? "pasta"
    : cat === "breakfast" ? "breakfast"
    : /^(vegetarian|vegan|side)$/.test(cat) ? "vegetable"
    : /^(starter|appetizer)$/.test(cat) ? "starter"
    : "default";

  const serveSides = {
    dessert: "a scoop of ice cream, fresh berries, or a drizzle of sauce",
    seafood: "a light salad, steamed vegetables, or crusty bread",
    pasta: "garlic bread, a fresh green salad, and a glass of wine",
    breakfast: "fresh fruit, yogurt, or a side of toast",
    vegetable: "quinoa, roasted potatoes, or a light grain bowl",
    starter: "as an appetizer with drinks or as part of a larger spread",
    default: "simple sides like salad, rice, or roasted vegetables",
  }[group];

  let serveAnswer =
    "Serve " + t + " with " + serveSides + ". " +
    "Plan for about " + servings + " serving" + (servings === 1 ? "" : "s") + ".";
  if (ingredientHint) serveAnswer += " Main ingredients include " + ingredientHint + ".";

  const aheadAdvice = {
    dessert: "Most desserts keep well in the fridge for up to 3 days or freeze for up to a month. Thaw and add fresh toppings before serving.",
    seafood: "Seafood is best enjoyed fresh, but you can prep ingredients up to a day ahead and cook just before serving. Store leftovers in the fridge for up to 2 days.",
    pasta: "You can assemble the dish ahead and refrigerate for up to 2 days before baking, or store leftovers in an airtight container for up to 3 days.",
    breakfast: "You can prep components the night before and finish cooking in the morning. Store leftovers in the fridge for up to 2 days.",
    vegetable: "Cooked vegetable dishes keep well in the fridge for up to 4 days. Reheat gently to preserve texture and flavor.",
    starter: "Most appetizers can be prepared a day ahead and reheated or assembled just before serving.",
    default: "You can cook it ahead and store it in an airtight container in the fridge for up to 3 days. Reheat gently before serving.",
  }[group];

  const substituteAdvice = {
    dessert: "Swap ingredients with similar texture and moisture content. Adjust sweetness to taste and test doneness with a toothpick.",
    seafood: "Substitute with a similar type of fish or shellfish, keeping cooking time and thickness in mind. Adjust seasoning to complement.",
    pasta: "Different pasta shapes work well interchangeably. Adjust cooking time and sauce consistency as needed.",
    breakfast: "Swap ingredients with similar textures and cook times. Adjust seasoning and sweetness gradually to keep the final dish balanced.",
    vegetable: "Swap vegetables based on season and availability, keeping cooking times similar. Adjust seasoning to balance flavors.",
    starter: "Substitute with ingredients of similar texture and moisture. Adjust seasoning gradually and test as you go for best results.",
    default: "Use ingredients with similar texture and flavor, then adjust seasoning gradually to keep balance in the final dish.",
  }[group];

  return [
    { q: "How long does it take to make " + t + "?", a: timeAnswer },
    { q: "Can I make " + t + " ahead of time?", a: "Yes. " + aheadAdvice },
    { q: "What should I serve with " + t + "?", a: serveAnswer },
    { q: "Can I substitute ingredients in " + t + "?", a: "Yes. " + substituteAdvice },
  ];
}

function buildJsonLd(recipe, pageUrl, site) {
  const siteName = site.name || "Akkous";
  const desc =
    (recipe.description && String(recipe.description).trim()) ||
    metaDescriptionFromRecipe(recipe, siteName);
  const canon = (site.canonicalOrigin || "").replace(/\/+$/, "");
  const orgGraphId = canon ? canon + "/#organization" : "";
  const publisher = orgGraphId
    ? { "@id": orgGraphId }
    : {
        "@type": "Organization",
        name: siteName,
        url: canon || undefined,
      };

  const cookMin = minutesFromTimeLabel(recipe.cookTime);
  const prepMin = minutesFromTimeLabel(recipe.prepTime);
  const steps = getSteps(recipe);
  const cat = (recipe.category || "").toLowerCase();

  const obj = {
    "@type": "Recipe",
    "@id": pageUrl + "#recipe",
    name: recipe.title,
    description: desc,
    inLanguage: "en",
    image: recipe.image
      ? [
          {
            "@type": "ImageObject",
            url: recipe.image,
            caption: recipe.title || "",
            representativeOfPage: true,
          },
        ]
      : undefined,
    author: {
      "@type": "Person",
      name: schemaAuthorName(recipe, siteName),
    },
    publisher,
    datePublished:
      (recipe.datePublished && String(recipe.datePublished).slice(0, 10)) ||
      (recipe.publishDate && String(recipe.publishDate).slice(0, 10)) ||
      (console.warn("Missing datePublished for " + (recipe.title || recipe.id || "unknown") + " — using today's date as fallback"), new Date().toISOString().slice(0, 10)),
    recipeCategory: recipe.categoryDisplay || categoryLabel(recipe.category),
    keywords: (recipe.tags || []).length
      ? (recipe.tags || []).join(", ")
      : undefined,
    recipeIngredient: recipe.ingredients || [],
    recipeInstructions: steps.map((text, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      text,
    })),
    mainEntityOfPage: { "@type": "WebPage", "@id": pageUrl },
  };

  if (recipe.servings != null && String(recipe.servings).trim() !== "") {
    obj.recipeYield = String(recipe.servings) + " servings";
  }
  if (recipe.origin && String(recipe.origin).trim()) {
    obj.recipeCuisine = String(recipe.origin).trim();
  }
  if (cookMin) obj.cookTime = "PT" + cookMin + "M";
  if (prepMin) obj.prepTime = "PT" + prepMin + "M";
  if (cookMin && prepMin) obj.totalTime = "PT" + (cookMin + prepMin) + "M";
  if (cat === "vegetarian") obj.suitableForDiet = "https://schema.org/VegetarianDiet";
  if (cat === "vegan") obj.suitableForDiet = "https://schema.org/VeganDiet";

  const toolKeywords = [
    "oven",
    "pan",
    "skillet",
    "blender",
    "mixer",
    "pot",
    "grill",
    "baking sheet",
    "food processor",
    "whisk",
    "knife",
    "cutting board",
  ];
  const stepText = steps.join(" ").toLowerCase();
  const detectedTools = toolKeywords.filter((t) => stepText.includes(t));
  if (detectedTools.length) {
    obj.tool = detectedTools.map((t) => ({ "@type": "HowToTool", name: t }));
  }

  const yid = youtubeVideoId(recipe.youtube || "");
  if (yid) {
    obj.video = {
      "@type": "VideoObject",
      name: recipe.title || "Recipe video",
      description: desc,
      thumbnailUrl: recipe.image || undefined,
      embedUrl: "https://www.youtube.com/embed/" + yid,
      contentUrl: String(recipe.youtube || "").trim() || undefined,
      uploadDate:
        (recipe.datePublished && String(recipe.datePublished).slice(0, 10)) ||
        (recipe.publishDate && String(recipe.publishDate).slice(0, 10)) ||
        (console.warn("Missing uploadDate for video " + (recipe.title || recipe.id || "unknown")), new Date().toISOString().slice(0, 10)),
    };
  }

  const homeUrl = canon ? canon + "/" : pageUrl.replace(/\/recipes\/[^/]+\/$/, "/");
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: homeUrl },
      {
        "@type": "ListItem",
        position: 2,
        name: recipe.categoryDisplay || categoryLabel(recipe.category),
        item: homeUrl + "?category=" + recipe.category,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: recipe.title || "Recipe",
        item: pageUrl,
      },
    ],
  };

  const faqItems = buildRecipeFaqItems(recipe);
  const faq = {
    "@type": "FAQPage",
    mainEntity: faqItems.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return {
    "@context": "https://schema.org",
    "@graph": [obj, breadcrumb, faq],
  };
}

function applyPathPrefix(html, prefix) {
  const p = prefix;
  return html
    .replace(/href="recipes\.json"/g, `href="${p}recipes.json"`)
    .replace(/href="manifest\.webmanifest"/g, `href="${p}manifest.webmanifest"`)
    .replace(/href="assets\//g, `href="${p}assets/`)
    .replace(/href="style\.css"/g, `href="${p}style.css"`)
    .replace(/src="main\.js"/g, `src="${p}main.js"`)
    .replace(/href="index\.html/g, `href="${p}index.html`)
    .replace(/href="terms-of-use\.html"/g, `href="${p}terms-of-use.html"`)
    .replace(/href="privacy-policy\.html"/g, `href="${p}privacy-policy.html"`)
    .replace(/href="contact\.html"/g, `href="${p}contact.html"`);
}

function renderFaqHtml(recipe) {
  return buildRecipeFaqItems(recipe)
    .map(
      (it, i) =>
        `<details class="recipe-faq__item"${i === 0 ? " open" : ""}>` +
        `<summary>${escapeHtml(it.q)}</summary>` +
        `<p class="recipe-faq__answer">${escapeHtml(it.a)}</p>` +
        `</details>`
    )
    .join("");
}

function renderTagsHtml(recipe) {
  const tags = recipe.tags || [];
  if (!tags.length) return { html: "", show: false };
  const lis = tags
    .map((t) => `<li><span>${escapeHtml(String(t))}</span></li>`)
    .join("");
  return { html: lis, show: true };
}

function buildStaticRecipePage(template, recipe, site) {
  const slug = String(recipe.slug || recipe.id || "").trim();
  if (!slug) throw new Error("Recipe missing slug/id: " + JSON.stringify(recipe.title));

  const siteName = site.name || "Akkous";
  const canonBase = (site.canonicalOrigin || "").replace(/\/+$/, "");
  const pageUrl = canonBase ? `${canonBase}/recipes/${slug}/` : "";

  const titleBase = /\brecipe\b/i.test(String(recipe.title || ""))
    ? recipe.title
    : `${recipe.title} Recipe`;
  const title = `${titleBase} — ${siteName} | Easy Cooking Guide`;
  const desc = metaDescriptionFromRecipe(recipe, siteName);
  const steps = getSteps(recipe);
  const readMin = estimateReadMinutes(recipe);
  const servings = recipe.servings || 1;
  const catDisplay = recipe.categoryDisplay || categoryLabel(recipe.category);
  const origin = recipe.origin || "";
  // hook = accroche humaine visible sur la page (1-2 phrases Groq)
  // description = meta SEO 140-155 chars (invisible, balise <meta> + JSON-LD)
  const intro = recipe.hook || recipe.description || "";
  const img = recipe.image || "";
  const socialImg = img || "https://akkous.com/assets/og-default.jpg";
  const imgAlt = recipe.title ? "Photo of " + recipe.title : "";

  let html = applyPathPrefix(template, "/");

  const headMeta = `
    <meta
      name="description"
      content="${escapeHtml(desc)}"
    />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta name="pinterest-rich-pin" content="true" />
    <meta name="p:domain_verify" content="1e49b9312c23dd1bba6b615c270a0e3c" />
    <meta name="google-adsense-account" content="ca-pub-2269008589730162" />
    <meta property="og:title" content="${escapeHtml(title)}" />
    <meta
      property="og:description"
      content="${escapeHtml(desc)}"
    />
    <meta property="og:type" content="article" />
    <meta property="og:locale" content="en_US" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(socialImg)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:site_name" content="${escapeHtml(siteName)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image" content="${escapeHtml(socialImg)}" />
    <link rel="canonical" id="canonical-url" href="${escapeHtml(pageUrl)}" />
    <title>${escapeHtml(title)}</title>`;

  html = html.replace(
    /\s*<meta\s+name="description"[\s\S]*?<title>[\s\S]*?<\/title>/,
    "\n" + headMeta.trim() + "\n    "
  );

  const jsonLd = buildJsonLd(recipe, pageUrl, site);
  html = html.replace(
    "</head>",
    `    <script id="recipe-jsonld" type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n  </head>`
  );

  html = html.replace(
    /<p id="recipe-loading-banner" class="recipe-loading-banner container" role="status" aria-live="polite">/,
    '<p id="recipe-loading-banner" class="recipe-loading-banner container" role="status" aria-live="polite" hidden>'
  );

  html = html.replace(
    /<img id="recipe-hero-image"[^>]*>/,
    `<img id="recipe-hero-image" src="${escapeHtml(img)}" alt="${escapeHtml(imgAlt)}" width="1600" height="900" fetchpriority="high" decoding="async" />`
  );

  html = html.replace(
    /<!-- hero-preload -->/,
    `<link rel="preload" as="image" href="${escapeHtml(img)}" fetchpriority="high" />`
  );

  html = html.replace(
    /<span aria-current="page" id="breadcrumb-current">[^<]*<\/span>/,
    `<span aria-current="page" id="breadcrumb-current">${escapeHtml(recipe.title || "Recipe")}</span>`
  );

  html = html.replace(
    /<h1 class="recipe-hero__title" id="recipe-title">[^<]*<\/h1>/,
    `<h1 class="recipe-hero__title" id="recipe-title">${escapeHtml(recipe.title || "")}</h1>`
  );

  html = html.replace(
    /<span id="recipe-category"[^>]*><\/span>/,
    `<span id="recipe-category" class="recipe-hero__category">${escapeHtml(catDisplay)}</span>`
  );

  html = html.replace(
    /<span id="recipe-origin"[^>]*><\/span>/,
    `<span id="recipe-origin" class="recipe-hero__origin">${escapeHtml(origin)}</span>`
  );

  html = html.replace(
    /<span id="recipe-read-time">[^<]*<\/span>/,
    `<span id="recipe-read-time">${readMin} min read</span>`
  );

  html = html.replace(
    /<span id="recipe-servings">[^<]*<\/span>/,
    `<span id="recipe-servings">${servings} serving${servings === 1 ? "" : "s"}</span>`
  );

  html = html.replace(
    /<p class="recipe-article__intro container--narrow" id="recipe-intro"><\/p>/,
    `<p class="recipe-article__intro container--narrow" id="recipe-intro">${escapeHtml(intro)}</p>`
  );

  const hasNote = recipe.personalNote && String(recipe.personalNote).trim();
  html = html.replace(
    /<div class="recipe-note" id="recipe-personal-note" hidden>/,
    `<div class="recipe-note" id="recipe-personal-note"${hasNote ? "" : " hidden"}>`
  );
  html = html.replace(
    /<p class="recipe-note__text" id="recipe-personal-note-text"><\/p>/,
    `<p class="recipe-note__text" id="recipe-personal-note-text">${escapeHtml(hasNote)}</p>`
  );

  const tags = renderTagsHtml(recipe);
  html = html.replace(
    /<div class="container container--narrow recipe-tags-bar" id="recipe-tags-section" hidden>/,
    `<div class="container container--narrow recipe-tags-bar" id="recipe-tags-section"${tags.show ? "" : " hidden"}>`
  );
  html = html.replace(
    /<ul class="recipe-tag-list" id="recipe-tag-list"[^>]*><\/ul>/,
    `<ul class="recipe-tag-list" id="recipe-tag-list" aria-labelledby="recipe-tags-heading">${tags.html}</ul>`
  );

  const ingItems = (recipe.ingredients || [])
    .map((ing, i) => {
      const sid = "ing-" + recipe.id + "-" + i;
      return (
        "<li>" +
        `<label for="${escapeHtml(sid)}">` +
        `<input type="checkbox" id="${escapeHtml(sid)}">` +
        "<span>" +
        escapeHtml(ing) +
        "</span>" +
        "</label>" +
        "</li>"
      );
    })
    .join("");

  html = html.replace(
    /<ul class="ingredient-list" id="ingredient-list"><\/ul>/,
    `<ul class="ingredient-list" id="ingredient-list">${ingItems}</ul>`
  );

  const stepItems = steps
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
  html = html.replace(
    /<ol id="recipe-steps"[^>]*><\/ol>/,
    `<ol id="recipe-steps" aria-labelledby="steps-heading">${stepItems}</ol>`
  );

  const hasWine = recipe.winePairing && String(recipe.winePairing).trim();
  html = html.replace(
    /<section class="recipe-pairing container container--narrow" id="recipe-wine-pairing" hidden/,
    `<section class="recipe-pairing container container--narrow" id="recipe-wine-pairing"${hasWine ? "" : " hidden"}`
  );
  html = html.replace(
    /<p id="recipe-wine-pairing-text"><\/p>/,
    `<p id="recipe-wine-pairing-text">${escapeHtml(hasWine)}</p>`
  );

  const hasChefTip = recipe.chefTip && String(recipe.chefTip).trim();
  html = html.replace(
    /<div class="recipe-chef-tip" id="recipe-chef-tip" hidden>/,
    `<div class="recipe-chef-tip" id="recipe-chef-tip"${hasChefTip ? "" : " hidden"}>`
  );
  html = html.replace(
    /<p id="recipe-chef-tip-text"><\/p>/,
    `<p id="recipe-chef-tip-text">${escapeHtml(hasChefTip)}</p>`
  );

  const hasStory = recipe.storyOrigin && String(recipe.storyOrigin).trim();
  html = html.replace(
    /<section class="recipe-story" id="recipe-story" hidden>/,
    `<section class="recipe-story" id="recipe-story"${hasStory ? "" : " hidden"}>`
  );
  html = html.replace(
    /<p id="recipe-story-text"><\/p>/,
    `<p id="recipe-story-text">${escapeHtml(hasStory)}</p>`
  );

  const hasChefVar = recipe.chefVariation && String(recipe.chefVariation).trim();
  html = html.replace(
    /<section class="recipe-chef" id="recipe-chef" hidden>/,
    `<section class="recipe-chef" id="recipe-chef"${hasChefVar ? "" : " hidden"}>`
  );
  html = html.replace(
    /<p id="recipe-chef-text"><\/p>/,
    `<p id="recipe-chef-text">${escapeHtml(hasChefVar)}</p>`
  );

  const hasSeasonal = recipe.seasonalNote && String(recipe.seasonalNote).trim();
  html = html.replace(
    /<div class="recipe-season" id="recipe-season" hidden>/,
    `<div class="recipe-season" id="recipe-season"${hasSeasonal ? "" : " hidden"}>`
  );
  html = html.replace(
    /<p id="recipe-season-text"><\/p>/,
    `<p id="recipe-season-text">${escapeHtml(hasSeasonal)}</p>`
  );

  html = html.replace(
    /<div id="recipe-faq-list"><\/div>/,
    `<div id="recipe-faq-list">${renderFaqHtml(recipe)}</div>`
  );

  return html;
}

function writeSitemap(site, recipes, buildDate) {
  const canon = (site.canonicalOrigin || "https://akkous.com").replace(/\/+$/, "");
  const staticPages = [
    { loc: `${canon}/`, changefreq: "daily", priority: "1.0", lastmod: buildDate },
    {
      loc: `${canon}/terms-of-use.html`,
      changefreq: "monthly",
      priority: "0.5",
      lastmod: buildDate,
    },
    {
      loc: `${canon}/privacy-policy.html`,
      changefreq: "monthly",
      priority: "0.5",
      lastmod: buildDate,
    },
    { loc: `${canon}/contact.html`, changefreq: "monthly", priority: "0.5", lastmod: buildDate },
  ];

  const lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];

  for (const p of staticPages) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(p.loc)}</loc>`);
    if (p.changefreq) lines.push(`    <changefreq>${p.changefreq}</changefreq>`);
    if (p.priority) lines.push(`    <priority>${p.priority}</priority>`);
    if (p.lastmod) lines.push(`    <lastmod>${p.lastmod}</lastmod>`);
    lines.push("  </url>");
  }

  for (const r of recipes) {
    const slug = String(r.slug || r.id || "").trim();
    if (!slug) continue;
    const pubDate =
      (r.datePublished && String(r.datePublished).slice(0, 10)) ||
      (r.publishDate && String(r.publishDate).slice(0, 10)) ||
      "";
    const lastmod = !pubDate || buildDate.slice(0, 10) > pubDate
      ? buildDate
      : pubDate + "T00:00:00+00:00";
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(`${canon}/recipes/${slug}/`)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push("    <changefreq>weekly</changefreq>");
    lines.push("    <priority>0.8</priority>");
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  fs.writeFileSync(SITEMAP_OUT, lines.join("\n") + "\n", "utf8");
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Supprime les dossiers recipes/<slug>/ absents de recipes.json (évite 404 / pages fantômes). */
function removeOrphanRecipeDirs(wantedSlugs) {
  if (!fs.existsSync(RECIPES_DIR)) return;
  const wanted = new Set(wantedSlugs);
  for (const ent of fs.readdirSync(RECIPES_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    const name = ent.name;
    if (!wanted.has(name)) {
      fs.rmSync(path.join(RECIPES_DIR, name), { recursive: true, force: true });
      console.warn("Removed orphan recipe directory: " + name);
    }
  }
}

function main() {
  const buildDate = process.env.CI_BUILD_DATE || new Date().toISOString().replace(/Z$/, "+00:00");
  const raw = JSON.parse(fs.readFileSync(RECIPES_JSON, "utf8"));
  const site = raw.site || {};
  const list = (raw.recipes || []).map(prepareRecipe);
  const template = fs.readFileSync(RECIPE_TEMPLATE, "utf8");

  fs.mkdirSync(RECIPES_DIR, { recursive: true });

  const wantedSlugs = [];
  let n = 0;
  for (const recipe of list) {
    const slug = String(recipe.slug || recipe.id || "").trim();
    if (!slug) continue;
    wantedSlugs.push(slug);
    const dir = path.join(RECIPES_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    const html = buildStaticRecipePage(template, recipe, site);
    fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
    n++;
  }

  removeOrphanRecipeDirs(wantedSlugs);
  writeSitemap(site, list, buildDate);
  console.log(`Wrote ${n} recipe pages under recipes/<slug>/index.html and updated sitemap.xml`);
}

main();
