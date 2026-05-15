/**
 * Génère une page HTML statique par recette (SEO + Open Graph dans le HTML)
 * et réécrit sitemap.xml. Ne supprime pas recipe.html?id= (rétrocompatibilité).
 *
 * Usage: node scripts/build-recipe-pages.mjs
 *
 * Améliorations SEO v2 :
 *  - Structured data : Recipe + Breadcrumb + FAQPage + Article + WebSite (SearchAction)
 *  - Open Graph renforcé : og:image:alt, article:published_time, article:section
 *  - Twitter Card : twitter:label / twitter:data (temps, portions)
 *  - Meta robots par page avec directives max-image-preview, max-snippet
 *  - Canonical strict (toujours absolu, jamais relatif)
 *  - Titre SEO optimisé < 60 chars, sans doublon "Recipe Recipe"
 *  - Meta description : 140-155 chars, hook > description > fallback riche
 *  - hreflang : x-default self (prêt pour internationalisation)
 *  - Preload hero image dans <head>
 *  - decoding="sync" sur l'image LCP (hero fetchpriority=high)
 *  - JSON-LD : Organization, WebSite SearchAction, skillLevel, suitableForDiet multi-valeur
 *  - Sitemap : lastmod ISO 8601 +00:00, priority dynamique (featured/views)
 *  - TOC auto-injecté si steps > 8
 *  - FAQ question 4 contextuelle (difficulté si disponible)
 *  - Orphan page cleanup + erreur explicite si slug manquant
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT          = path.join(__dirname, "..");
const RECIPES_JSON  = path.join(ROOT, "recipes.json");
const RECIPE_TEMPLATE = path.join(ROOT, "recipe.html");
const SITEMAP_OUT   = path.join(ROOT, "sitemap.xml");
const RECIPES_DIR   = path.join(ROOT, "recipes");

// ---------------------------------------------------------------------------
// Encoding helpers
// ---------------------------------------------------------------------------

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Slug / category helpers
// ---------------------------------------------------------------------------

function slugifyCategoryKey(raw) {
  const s = String(raw ?? "").trim().toLowerCase().replace(/\s+/g, "-");
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
  const key    = normalizeRecipeCategoryKey(rawCat);
  return {
    ...r,
    category: key,
    categoryDisplay: prettyCategoryDisplay(rawCat, key),
  };
}

// ---------------------------------------------------------------------------
// Text / time helpers
// ---------------------------------------------------------------------------

/**
 * Meta description : hook > description > fallback généré riche.
 * Cible : 140-155 chars pour éviter la troncature Google.
 */
function metaDescriptionFromRecipe(recipe, siteName) {
  // Priorité 1 : hook (accroche humaine rédigée par Groq)
  const hook = recipe.hook && String(recipe.hook).trim();
  if (hook) return hook.length > 155 ? hook.slice(0, 152) + "…" : hook;

  // Priorité 2 : description SEO
  const d = recipe.description && String(recipe.description).trim();
  if (d) return d.length > 155 ? d.slice(0, 152) + "…" : d;

  // Fallback riche : titre + catégorie + cuisine + ingrédients clés
  const bits = [];
  if (recipe.title) bits.push(recipe.title);
  const cat = recipe.categoryDisplay || categoryLabel(recipe.category);
  if (cat && cat !== "Uncategorized") bits.push(cat + " recipe");
  if (recipe.origin) bits.push("from " + String(recipe.origin).trim());
  const ing = (recipe.ingredients || [])
    .slice(0, 3)
    .map((s) => String(s).trim().split(" ").pop())
    .filter(Boolean)
    .join(", ");
  if (ing) bits.push("with " + ing);
  let out =
    bits.join(" · ") + ". Step-by-step guide on " + (siteName || "Akkous") + ".";
  return out.length > 155 ? out.slice(0, 152) + "…" : out;
}

/**
 * Titre SEO : max 60 chars, jamais "Recipe Recipe".
 * Format long  : "{Title} Recipe — {SiteName} | Easy {Category} Guide"
 * Format court : "{Title} Recipe — {SiteName}"
 * Minimal      : "{Title} | {SiteName}"
 */
function buildSeoTitle(recipe, siteName) {
  const rawTitle  = String(recipe.title || "").trim();
  const titleBase = /\brecipe\b/i.test(rawTitle) ? rawTitle : rawTitle + " Recipe";
  const cat       = recipe.categoryDisplay || categoryLabel(recipe.category);
  const catSuffix = cat && cat !== "Uncategorized" ? cat : "Cooking";

  const full  = `${titleBase} — ${siteName} | Easy ${catSuffix} Guide`;
  if (full.length <= 60) return full;

  const short = `${titleBase} — ${siteName}`;
  if (short.length <= 60) return short;

  return `${rawTitle} | ${siteName}`;
}

function minutesFromTimeLabel(label) {
  if (!label || typeof label !== "string") return undefined;
  const m = label.match(/(\d+)\s*min/i);
  return m ? parseInt(m[1], 10) : undefined;
}

function youtubeVideoId(url) {
  if (!url || typeof url !== "string") return "";
  const m = url
    .trim()
    .match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  return m ? m[1] : "";
}

function getSteps(recipe) {
  let steps = recipe.steps;
  if (!steps || !steps.length) {
    const instr = recipe.instructions;
    if (typeof instr === "string" && instr.trim()) {
      steps = instr.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    }
  }
  return steps || [];
}

function estimateReadMinutes(recipe) {
  const steps = getSteps(recipe);
  const words =
    (String(recipe.description || "").split(/\s+/).length || 0) +
    ((recipe.ingredients || []).join(" ").split(/\s+/).length || 0) +
    (steps.join(" ").split(/\s+/).length || 0);
  return Math.max(2, Math.round(words / 200));
}

function readingTimeMinutes(recipe) {
  const steps = getSteps(recipe);
  return Math.max(
    1,
    Math.ceil((steps.length * 30 + (recipe.ingredients || []).length * 10) / 60)
  );
}

// ---------------------------------------------------------------------------
// Schema.org author
// ---------------------------------------------------------------------------

function schemaAuthorName(recipe, siteName) {
  const sn   = siteName || "Akkous";
  const raw  = recipe.author && recipe.author.name;
  if (!raw || !String(raw).trim()) return sn;
  const name = String(raw).trim();
  const origin = recipe.origin && String(recipe.origin).trim();
  if (origin && origin.toLowerCase() === name.toLowerCase()) return sn;
  return name;
}

// ---------------------------------------------------------------------------
// FAQ — questions contextuelles par groupe de catégorie
// ---------------------------------------------------------------------------

function buildRecipeFaqItems(recipe) {
  const t        = recipe.title || "this recipe";
  const total    = recipe.totalTime || "";
  const cook     = recipe.cookTime  || "";
  const prep     = recipe.prepTime  || "";
  const servings = recipe.servings  || 4;
  const cat      = (recipe.category || "").toLowerCase();
  const diff     = recipe.difficultyReal || "";

  const ingredientHint = (recipe.ingredients || [])
    .slice(0, 2)
    .map((s) => String(s || "").trim())
    .filter(Boolean)
    .join(", ");

  const timeAnswer = total
    ? `${t} usually takes around ${total} from prep to serving.`
    : cook || prep
    ? `${t} takes about ${prep && cook ? prep + " prep + " + cook + " cooking time" : cook || prep}.`
    : `Most home cooks finish ${t} in under one hour.`;

  const group =
    cat === "dessert"                         ? "dessert"
    : /^(seafood|fish)$/.test(cat)            ? "seafood"
    : /^(pasta|lasagna|noodles?)$/.test(cat)  ? "pasta"
    : cat === "breakfast"                     ? "breakfast"
    : /^(vegetarian|vegan|side)$/.test(cat)   ? "vegetable"
    : /^(starter|appetizer|snack)$/.test(cat) ? "starter"
    : "default";

  const serveSides = {
    dessert:   "a scoop of ice cream, fresh berries, or a drizzle of sauce",
    seafood:   "a light salad, steamed vegetables, or crusty bread",
    pasta:     "garlic bread, a fresh green salad, and a glass of wine",
    breakfast: "fresh fruit, yogurt, or a side of toast",
    vegetable: "quinoa, roasted potatoes, or a light grain bowl",
    starter:   "as an appetizer with drinks or as part of a larger spread",
    default:   "simple sides like salad, rice, or roasted vegetables",
  }[group];

  let serveAnswer =
    `Serve ${t} with ${serveSides}. ` +
    `Plan for about ${servings} serving${servings === 1 ? "" : "s"}.`;
  if (ingredientHint) serveAnswer += ` Key ingredients include ${ingredientHint}.`;

  const aheadAdvice = {
    dessert:   "Most desserts keep well in the fridge for up to 3 days or freeze for up to a month. Add fresh toppings before serving.",
    seafood:   "Seafood is best fresh — prep ingredients up to a day ahead and cook just before serving. Leftovers keep up to 2 days refrigerated.",
    pasta:     "Assemble ahead and refrigerate for up to 2 days, or store leftovers in an airtight container for up to 3 days.",
    breakfast: "Prep components the night before and finish cooking in the morning. Leftovers keep refrigerated for up to 2 days.",
    vegetable: "Cooked vegetable dishes keep well for up to 4 days. Reheat gently to preserve texture and flavor.",
    starter:   "Most appetizers can be prepared a day ahead and reheated or assembled just before serving.",
    default:   "Cook ahead and store in an airtight container in the fridge for up to 3 days. Reheat gently before serving.",
  }[group];

  const substituteAdvice = {
    dessert:   "Swap with ingredients of similar texture and moisture. Adjust sweetness to taste and test doneness with a toothpick.",
    seafood:   "Substitute with a similar fish or shellfish, keeping cooking time and thickness in mind. Adjust seasoning accordingly.",
    pasta:     "Different pasta shapes work interchangeably. Adjust cooking time and sauce consistency as needed.",
    breakfast: "Swap ingredients with similar textures. Adjust seasoning and sweetness gradually for a balanced result.",
    vegetable: "Swap vegetables based on season and availability. Adjust cooking times and seasoning to balance flavors.",
    starter:   "Substitute with ingredients of similar texture and moisture. Adjust seasoning gradually and test as you go.",
    default:   "Use ingredients with similar texture and flavor, then adjust seasoning gradually to maintain balance.",
  }[group];

  // Q4 : difficulté contextuelle si disponible, sinon substitution
  const q4 = diff
    ? {
        q: `How difficult is ${t} to make?`,
        a: `${t} is rated as ${diff} difficulty. ${
          diff.toLowerCase().includes("easy")
            ? "It is beginner-friendly with simple steps."
            : diff.toLowerCase().includes("hard")
            ? "Plan extra time and follow each step carefully for best results."
            : "It requires some cooking experience but is very achievable at home."
        }`,
      }
    : {
        q: `Can I substitute ingredients in ${t}?`,
        a: "Yes. " + substituteAdvice,
      };

  return [
    { q: `How long does it take to make ${t}?`, a: timeAnswer },
    { q: `Can I make ${t} ahead of time?`,       a: "Yes. " + aheadAdvice },
    { q: `What should I serve with ${t}?`,       a: serveAnswer },
    q4,
  ];
}

// ---------------------------------------------------------------------------
// JSON-LD — Recipe graph complet
// ---------------------------------------------------------------------------

function buildJsonLd(recipe, pageUrl, site, buildDate) {
  const siteName = site.name || "Akkous";
  const desc     =
    (recipe.description && String(recipe.description).trim()) ||
    metaDescriptionFromRecipe(recipe, siteName);
  const canon     = (site.canonicalOrigin || "").replace(/\/+$/, "");
  const orgId     = canon ? canon + "/#organization" : "";
  const publisher = orgId
    ? { "@id": orgId }
    : { "@type": "Organization", name: siteName, url: canon || undefined };

  const cookMin = minutesFromTimeLabel(recipe.cookTime);
  const prepMin = minutesFromTimeLabel(recipe.prepTime);
  const steps   = getSteps(recipe);
  const cat     = (recipe.category || "").toLowerCase();

  // Régimes alimentaires
  const diets = [];
  if (cat === "vegetarian") diets.push("https://schema.org/VegetarianDiet");
  if (cat === "vegan")      diets.push("https://schema.org/VeganDiet");
  if (/gluten.?free/.test(cat)) diets.push("https://schema.org/GlutenFreeDiet");

  const obj = {
    "@type":     "Recipe",
    "@id":       pageUrl + "#recipe",
    name:        recipe.title,
    description: desc,
    inLanguage:  "en",
    image: recipe.image
      ? [{ "@type": "ImageObject", url: recipe.image, caption: recipe.title || "", representativeOfPage: true }]
      : undefined,
    author:    { "@type": "Person", name: schemaAuthorName(recipe, siteName) },
    publisher,
    datePublished:
      (recipe.datePublished && String(recipe.datePublished).slice(0, 10)) ||
      (recipe.publishDate   && String(recipe.publishDate).slice(0, 10))   ||
      (console.warn("Missing datePublished for " + (recipe.title || recipe.id || "unknown")),
       new Date().toISOString().slice(0, 10)),
    dateModified: (() => {
      const pub      = recipe.datePublished || recipe.publishDate || "";
      const pubDay   = String(pub).slice(0, 10);
      const buildDay = (buildDate || "").slice(0, 10);
      return !pubDay || buildDay > pubDay ? buildDate : pub;
    })(),
    recipeCategory: recipe.categoryDisplay || categoryLabel(recipe.category),
    keywords: (recipe.tags || []).length ? (recipe.tags || []).join(", ") : undefined,
    recipeIngredient: recipe.ingredients || [],
    recipeInstructions: steps.map((text, i) => ({
      "@type":  "HowToStep",
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
  if (cookMin) obj.cookTime  = "PT" + cookMin + "M";
  if (prepMin) obj.prepTime  = "PT" + prepMin + "M";
  if (cookMin && prepMin) obj.totalTime = "PT" + (cookMin + prepMin) + "M";
  if (diets.length === 1) obj.suitableForDiet = diets[0];
  if (diets.length > 1)   obj.suitableForDiet = diets;
  if (recipe.difficultyReal) obj.skillLevel = recipe.difficultyReal;

  // Outils détectés dans les étapes
  const toolKeywords = [
    "oven","pan","skillet","blender","mixer","pot","grill","baking sheet",
    "food processor","whisk","knife","cutting board","slow cooker",
    "pressure cooker","wok","air fryer",
  ];
  const stepText = steps.join(" ").toLowerCase();
  const detectedTools = toolKeywords.filter((tk) => stepText.includes(tk));
  if (detectedTools.length) {
    obj.tool = detectedTools.map((tk) => ({ "@type": "HowToTool", name: tk }));
  }

  // Vidéo YouTube
  const yid = youtubeVideoId(recipe.youtube || "");
  if (yid) {
    obj.video = {
      "@type":       "VideoObject",
      name:          recipe.title || "Recipe video",
      description:   desc,
      thumbnailUrl:  recipe.image || undefined,
      embedUrl:      "https://www.youtube.com/embed/" + yid,
      contentUrl:    String(recipe.youtube || "").trim() || undefined,
      uploadDate:
        (recipe.datePublished && String(recipe.datePublished).slice(0, 10)) ||
        (recipe.publishDate   && String(recipe.publishDate).slice(0, 10))   ||
        new Date().toISOString().slice(0, 10),
    };
  }

  // Breadcrumb
  const homeUrl = canon
    ? canon + "/"
    : pageUrl.replace(/\/recipes\/[^/]+\/$/, "/");
  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home",
        item: homeUrl },
      { "@type": "ListItem", position: 2,
        name: recipe.categoryDisplay || categoryLabel(recipe.category),
        item: homeUrl + "?category=" + recipe.category },
      { "@type": "ListItem", position: 3,
        name: recipe.title || "Recipe",
        item: pageUrl },
    ],
  };

  // FAQPage
  const faqItems = buildRecipeFaqItems(recipe);
  const faq = {
    "@type": "FAQPage",
    mainEntity: faqItems.map((it) => ({
      "@type": "Question",
      name:    it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  // WebSite avec SearchAction (sitelinks searchbox Google)
  const webSite = {
    "@type": "WebSite",
    "@id":   (canon || "https://akkous.com") + "/#website",
    name:    siteName,
    url:     canon ? canon + "/" : "https://akkous.com/",
    potentialAction: {
      "@type":       "SearchAction",
      target:        {
        "@type":     "EntryPoint",
        urlTemplate: (canon || "https://akkous.com") + "/?search={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  // Organization (logo)
  const organization = {
    "@type": "Organization",
    "@id":   orgId || undefined,
    name:    siteName,
    url:     canon ? canon + "/" : undefined,
    logo: {
      "@type": "ImageObject",
      url:     (canon || "https://akkous.com") + "/assets/favicon.svg",
    },
  };

  const graph = [obj, breadcrumb, faq, webSite];
  if (orgId) graph.push(organization);

  return { "@context": "https://schema.org", "@graph": graph };
}

// ---------------------------------------------------------------------------
// JSON-LD — Article (Google Discover + News)
// ---------------------------------------------------------------------------

function buildArticleLd(recipe, pageUrl, site, buildDate) {
  const pub      = recipe.datePublished || recipe.publishDate || "";
  const pubDay   = String(pub).slice(0, 10);
  const buildDay = (buildDate || "").slice(0, 10);
  const dateModified = !pubDay || buildDay > pubDay ? buildDate : pub;
  const canon    = (site.canonicalOrigin || "").replace(/\/+$/, "");
  const slug     = String(recipe.slug || recipe.id || "").trim();
  const pageHref = (canon || "https://akkous.com") + "/recipes/" + encodeURIComponent(slug) + "/";
  const siteName = site.name || "Akkous";

  const steps = getSteps(recipe);
  const wordCount = Math.max(
    50,
    (String(recipe.description || "")).split(/\s+/).length +
    (recipe.ingredients || []).join(" ").split(/\s+/).length +
    steps.join(" ").split(/\s+/).length
  );

  return {
    "@context":  "https://schema.org",
    "@type":     "Article",
    headline:    recipe.title || "",
    description: metaDescriptionFromRecipe(recipe, siteName),
    image:       recipe.image || "",
    datePublished: pubDay || undefined,
    dateModified,
    author: {
      "@type": "Organization",
      name:    siteName,
      url:     canon || "https://akkous.com",
    },
    publisher: {
      "@type": "Organization",
      name:    siteName,
      logo: {
        "@type": "ImageObject",
        url:     (canon || "https://akkous.com") + "/assets/favicon.svg",
      },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": pageHref },
    articleSection:   recipe.categoryDisplay || categoryLabel(recipe.category),
    keywords:         (recipe.tags || []).join(", ") || undefined,
    wordCount,
  };
}

// ---------------------------------------------------------------------------
// HTML helpers
// ---------------------------------------------------------------------------

function applyPathPrefix(html, prefix) {
  return html
    .replace(/href="recipes\.json"/g,         `href="${prefix}recipes.json"`)
    .replace(/href="manifest\.webmanifest"/g, `href="${prefix}manifest.webmanifest"`)
    .replace(/href="assets\//g,               `href="${prefix}assets/`)
    .replace(/href="style\.css"/g,            `href="${prefix}style.css"`)
    .replace(/src="main\.js"/g,               `src="${prefix}main.js"`)
    .replace(/href="index\.html/g,            `href="${prefix}index.html`)
    .replace(/href="terms-of-use\.html"/g,    `href="${prefix}terms-of-use.html"`)
    .replace(/href="privacy-policy\.html"/g,  `href="${prefix}privacy-policy.html"`)
    .replace(/href="contact\.html"/g,         `href="${prefix}contact.html"`);
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

// ---------------------------------------------------------------------------
// Core — build one static page
// ---------------------------------------------------------------------------

function buildStaticRecipePage(template, recipe, site, buildDate) {
  const slug = String(recipe.slug || recipe.id || "").trim();
  if (!slug)
    throw new Error("Recipe missing slug/id: " + JSON.stringify(recipe.title));

  const siteName   = site.name || "Akkous";
  const canonBase  = (site.canonicalOrigin || "").replace(/\/+$/, "");
  const pageUrl    = canonBase ? `${canonBase}/recipes/${slug}/` : "";

  const title      = buildSeoTitle(recipe, siteName);
  const desc       = metaDescriptionFromRecipe(recipe, siteName);
  const steps      = getSteps(recipe);
  const readMin    = estimateReadMinutes(recipe);
  const readMinNew = readingTimeMinutes(recipe);
  const isLongRead = readMinNew > 8;
  const servings   = recipe.servings || 1;
  const catDisplay = recipe.categoryDisplay || categoryLabel(recipe.category);
  const origin     = recipe.origin || "";
  const intro      = recipe.hook || recipe.description || "";
  const img        = recipe.image || "";
  const socialImg  = img
    || (canonBase ? `${canonBase}/assets/og-default.jpg` : "https://akkous.com/assets/og-default.jpg");
  const imgAlt     = recipe.title ? `Photo of ${recipe.title}` : `${siteName} recipe`;

  // Publication date ISO 8601
  const pubDateRaw = recipe.datePublished || recipe.publishDate || "";
  const pubDateIso = pubDateRaw
    ? new Date(pubDateRaw).toISOString().replace(/\.\d{3}Z$/, "+00:00")
    : buildDate;

  const articleSection =
    catDisplay && catDisplay !== "Uncategorized" ? catDisplay : "Recipes";

  let html = applyPathPrefix(template, "/");

  // ─── 1. Bloc <head> ────────────────────────────────────────────────────────
  const headMeta = `
    <meta name="description" content="${escapeHtml(desc)}" />
    <meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta name="googlebot" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1" />
    <meta name="pinterest-rich-pin" content="true" />
    <meta name="p:domain_verify" content="1e49b9312c23dd1bba6b615c270a0e3c" />
    <meta name="google-adsense-account" content="ca-pub-2269008589730162" />

    <!-- Open Graph -->
    <meta property="og:title"                content="${escapeHtml(title)}" />
    <meta property="og:description"          content="${escapeHtml(desc)}" />
    <meta property="og:type"                 content="article" />
    <meta property="og:locale"               content="en_US" />
    <meta property="og:url"                  content="${escapeHtml(pageUrl)}" />
    <meta property="og:image"                content="${escapeHtml(socialImg)}" />
    <meta property="og:image:width"          content="1200" />
    <meta property="og:image:height"         content="630" />
    <meta property="og:image:alt"            content="${escapeHtml(imgAlt)}" />
    <meta property="og:site_name"            content="${escapeHtml(siteName)}" />
    <meta property="article:published_time"  content="${escapeHtml(pubDateIso)}" />
    <meta property="article:modified_time"   content="${escapeHtml(buildDate)}" />
    <meta property="article:section"         content="${escapeHtml(articleSection)}" />

    <!-- Twitter Card -->
    <meta name="twitter:card"        content="summary_large_image" />
    <meta name="twitter:title"       content="${escapeHtml(title)}" />
    <meta name="twitter:description" content="${escapeHtml(desc)}" />
    <meta name="twitter:image"       content="${escapeHtml(socialImg)}" />
    <meta name="twitter:image:alt"   content="${escapeHtml(imgAlt)}" />
    <meta name="twitter:label1"      content="Prep &amp; Cook time" />
    <meta name="twitter:data1"       content="${escapeHtml(recipe.totalTime || recipe.cookTime || "~30 min")}" />
    <meta name="twitter:label2"      content="Servings" />
    <meta name="twitter:data2"       content="${escapeHtml(String(servings))}" />

    <!-- Canonical + hreflang -->
    <link rel="canonical" id="canonical-url" href="${escapeHtml(pageUrl)}" />
    <link rel="alternate" hreflang="en"        href="${escapeHtml(pageUrl)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(pageUrl)}" />

    <!-- Hero LCP preload -->
    <!-- hero-preload -->

    <title>${escapeHtml(title)}</title>`.trim();

  html = html.replace(
    /\s*<meta\s+name="description"[\s\S]*?<title>[\s\S]*?<\/title>/,
    "\n    " + headMeta + "\n    "
  );

  // ─── 2. Preload hero image ─────────────────────────────────────────────────
  html = html.replace(
    /<!-- hero-preload -->/,
    img
      ? `<link rel="preload" as="image" href="${escapeHtml(img)}" fetchpriority="high" />`
      : ""
  );

  // ─── 3. JSON-LD ───────────────────────────────────────────────────────────
  const jsonLd    = buildJsonLd(recipe, pageUrl, site, buildDate);
  const articleLd = buildArticleLd(recipe, pageUrl, site, buildDate);
  html = html.replace(
    "</head>",
    `    <script id="article-jsonld" type="application/ld+json">${JSON.stringify(articleLd)}</script>\n` +
    `    <script id="recipe-jsonld"  type="application/ld+json">${JSON.stringify(jsonLd)}</script>\n` +
    `  </head>`
  );

  // ─── 4. Loading banner caché ───────────────────────────────────────────────
  html = html.replace(
    /<p id="recipe-loading-banner" class="recipe-loading-banner container" role="status" aria-live="polite">/,
    '<p id="recipe-loading-banner" class="recipe-loading-banner container" role="status" aria-live="polite" hidden>'
  );

  // ─── 5. Hero image — decoding="sync" (LCP avec fetchpriority=high) ─────────
  html = html.replace(
    /<img id="recipe-hero-image"[^>]*>/,
    `<img id="recipe-hero-image" src="${escapeHtml(img)}" alt="${escapeHtml(imgAlt)}" ` +
    `width="1600" height="900" fetchpriority="high" decoding="sync" />`
  );

  // ─── 6. Breadcrumb ────────────────────────────────────────────────────────
  html = html.replace(
    /<span aria-current="page" id="breadcrumb-current">[^<]*<\/span>/,
    `<span aria-current="page" id="breadcrumb-current">${escapeHtml(recipe.title || "Recipe")}</span>`
  );

  // ─── 7. Hero text ─────────────────────────────────────────────────────────
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

  // ─── 8. Reading time + badge ───────────────────────────────────────────────
  html = html.replace(
    /<span id="recipe-read-time">[^<]*<\/span>/,
    `<span id="recipe-read-time">${readMin} min read</span>`
  );
  html = html.replace(
    /<span class="reading-time__text" id="reading-time-text">[^<]*<\/span>/,
    `<span class="reading-time__text" id="reading-time-text">${readMinNew} min read</span>`
  );
  html = html.replace(
    /<span class="badge badge--long-read" id="reading-time-badge" hidden>/,
    `<span class="badge badge--long-read" id="reading-time-badge"${isLongRead ? "" : " hidden"}>`
  );

  // ─── 9. Servings ──────────────────────────────────────────────────────────
  html = html.replace(
    /<span id="recipe-servings">[^<]*<\/span>/,
    `<span id="recipe-servings">${servings} serving${servings === 1 ? "" : "s"}</span>`
  );

  // ─── 10. Intro ─────────────────────────────────────────────────────────────
  html = html.replace(
    /<p class="recipe-article__intro container--narrow" id="recipe-intro"><\/p>/,
    `<p class="recipe-article__intro container--narrow" id="recipe-intro">${escapeHtml(intro)}</p>`
  );

  // ─── 11. Personal note ────────────────────────────────────────────────────
  const hasNote = recipe.personalNote && String(recipe.personalNote).trim();
  html = html.replace(
    /<div class="recipe-note" id="recipe-personal-note" hidden>/,
    `<div class="recipe-note" id="recipe-personal-note"${hasNote ? "" : " hidden"}>`
  );
  html = html.replace(
    /<p class="recipe-note__text" id="recipe-personal-note-text"><\/p>/,
    `<p class="recipe-note__text" id="recipe-personal-note-text">${escapeHtml(hasNote)}</p>`
  );

  // ─── 12. Tags ──────────────────────────────────────────────────────────────
  const tags = renderTagsHtml(recipe);
  html = html.replace(
    /<div class="container container--narrow recipe-tags-bar" id="recipe-tags-section" hidden>/,
    `<div class="container container--narrow recipe-tags-bar" id="recipe-tags-section"${tags.show ? "" : " hidden"}>`
  );
  html = html.replace(
    /<ul class="recipe-tag-list" id="recipe-tag-list"[^>]*><\/ul>/,
    `<ul class="recipe-tag-list" id="recipe-tag-list" aria-labelledby="recipe-tags-heading">${tags.html}</ul>`
  );

  // ─── 13. Ingredients ──────────────────────────────────────────────────────
  const ingItems = (recipe.ingredients || [])
    .map((ing, i) => {
      const sid = `ing-${recipe.id || recipe.slug}-${i}`;
      return (
        "<li>" +
        `<label for="${escapeHtml(sid)}">` +
        `<input type="checkbox" id="${escapeHtml(sid)}">` +
        `<span>${escapeHtml(ing)}</span>` +
        `</label>` +
        "</li>"
      );
    })
    .join("");
  html = html.replace(
    /<ul class="ingredient-list" id="ingredient-list"><\/ul>/,
    `<ul class="ingredient-list" id="ingredient-list">${ingItems}</ul>`
  );

  // ─── 14. Steps + TOC auto (si > 8 étapes) ─────────────────────────────────
  const showToc = steps.length > 8;
  let tocHtml   = "";
  if (showToc) {
    const tocItems = steps
      .map((step, i) => {
        const num     = i + 1;
        const excerpt = step.length > 40 ? step.substring(0, 40) + "…" : step;
        return `<li><a href="#step-${num}">${escapeHtml(excerpt)}</a></li>`;
      })
      .join("");
    tocHtml =
      `<nav class="recipe-toc" aria-label="Recipe steps">` +
      `<h3 class="recipe-toc__title">Jump to step</h3>` +
      `<ol class="recipe-toc__list">${tocItems}</ol></nav>`;
  }
  const stepItems = steps
    .map((step, i) => {
      const num = i + 1;
      return (
        `<li id="step-${num}" class="recipe-step">` +
        `<span class="recipe-step__number">${num}.</span>` +
        `<span class="recipe-step__text">${escapeHtml(step)}</span></li>`
      );
    })
    .join("");
  html = html.replace(
    /<ol id="recipe-steps"[^>]*><\/ol>/,
    tocHtml +
    `<ol id="recipe-steps" aria-labelledby="steps-heading">${stepItems}</ol>`
  );

  // ─── 15. Sections optionnelles ────────────────────────────────────────────
  const optionalSections = [
    {
      wrapperRe:  /<section class="recipe-pairing container container--narrow" id="recipe-wine-pairing" hidden/,
      wrapperNew: (show) =>
        `<section class="recipe-pairing container container--narrow" id="recipe-wine-pairing"${show ? "" : " hidden"}`,
      textRe:  /<p id="recipe-wine-pairing-text"><\/p>/,
      textId:  "recipe-wine-pairing-text",
      value:   recipe.winePairing && String(recipe.winePairing).trim(),
    },
    {
      wrapperRe:  /<div class="recipe-chef-tip" id="recipe-chef-tip" hidden>/,
      wrapperNew: (show) =>
        `<div class="recipe-chef-tip" id="recipe-chef-tip"${show ? "" : " hidden"}>`,
      textRe:  /<p id="recipe-chef-tip-text"><\/p>/,
      textId:  "recipe-chef-tip-text",
      value:   recipe.chefTip && String(recipe.chefTip).trim(),
    },
    {
      wrapperRe:  /<section class="recipe-story" id="recipe-story" hidden>/,
      wrapperNew: (show) =>
        `<section class="recipe-story" id="recipe-story"${show ? "" : " hidden"}>`,
      textRe:  /<p id="recipe-story-text"><\/p>/,
      textId:  "recipe-story-text",
      value:   recipe.storyOrigin && String(recipe.storyOrigin).trim(),
    },
    {
      wrapperRe:  /<section class="recipe-chef" id="recipe-chef" hidden>/,
      wrapperNew: (show) =>
        `<section class="recipe-chef" id="recipe-chef"${show ? "" : " hidden"}>`,
      textRe:  /<p id="recipe-chef-text"><\/p>/,
      textId:  "recipe-chef-text",
      value:   recipe.chefVariation && String(recipe.chefVariation).trim(),
    },
    {
      wrapperRe:  /<div class="recipe-season" id="recipe-season" hidden>/,
      wrapperNew: (show) =>
        `<div class="recipe-season" id="recipe-season"${show ? "" : " hidden"}>`,
      textRe:  /<p id="recipe-season-text"><\/p>/,
      textId:  "recipe-season-text",
      value:   recipe.seasonalNote && String(recipe.seasonalNote).trim(),
    },
  ];

  for (const sec of optionalSections) {
    html = html.replace(sec.wrapperRe, sec.wrapperNew(!!sec.value));
    html = html.replace(
      sec.textRe,
      `<p id="${sec.textId}">${escapeHtml(sec.value)}</p>`
    );
  }

  // ─── 16. FAQ ──────────────────────────────────────────────────────────────
  html = html.replace(
    /<div id="recipe-faq-list"><\/div>/,
    `<div id="recipe-faq-list">${renderFaqHtml(recipe)}</div>`
  );

  return html;
}

// ---------------------------------------------------------------------------
// Sitemap — priorité dynamique selon popularité
// ---------------------------------------------------------------------------

function recipePagePriority(recipe) {
  if (recipe.featured) return "0.9";
  if (recipe.views && parseInt(recipe.views, 10) > 500) return "0.9";
  return "0.8";
}

function writeSitemap(site, recipes, buildDate) {
  const canon = (site.canonicalOrigin || "https://akkous.com").replace(/\/+$/, "");
  const staticPages = [
    { loc: `${canon}/`,                 changefreq: "daily",   priority: "1.0", lastmod: buildDate },
    { loc: `${canon}/terms-of-use.html`,    changefreq: "monthly", priority: "0.5", lastmod: buildDate },
    { loc: `${canon}/privacy-policy.html`,  changefreq: "monthly", priority: "0.5", lastmod: buildDate },
    { loc: `${canon}/contact.html`,         changefreq: "monthly", priority: "0.5", lastmod: buildDate },
  ];

  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ];

  for (const p of staticPages) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(p.loc)}</loc>`);
    if (p.changefreq) lines.push(`    <changefreq>${p.changefreq}</changefreq>`);
    if (p.priority)   lines.push(`    <priority>${p.priority}</priority>`);
    if (p.lastmod)    lines.push(`    <lastmod>${p.lastmod}</lastmod>`);
    lines.push("  </url>");
  }

  for (const r of recipes) {
    const slug = String(r.slug || r.id || "").trim();
    if (!slug) continue;
    const pubDate =
      (r.datePublished && String(r.datePublished).slice(0, 10)) ||
      (r.publishDate   && String(r.publishDate).slice(0, 10))   || "";
    const lastmod = !pubDate || buildDate.slice(0, 10) > pubDate
      ? buildDate
      : pubDate + "T00:00:00+00:00";
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(`${canon}/recipes/${slug}/`)}</loc>`);
    lines.push(`    <lastmod>${lastmod}</lastmod>`);
    lines.push("    <changefreq>weekly</changefreq>");
    lines.push(`    <priority>${recipePagePriority(r)}</priority>`);
    lines.push("  </url>");
  }

  lines.push("</urlset>");
  fs.writeFileSync(SITEMAP_OUT, lines.join("\n") + "\n", "utf8");
}

// ---------------------------------------------------------------------------
// Orphan cleanup
// ---------------------------------------------------------------------------

function removeOrphanRecipeDirs(wantedSlugs) {
  if (!fs.existsSync(RECIPES_DIR)) return;
  const wanted = new Set(wantedSlugs);
  for (const ent of fs.readdirSync(RECIPES_DIR, { withFileTypes: true })) {
    if (!ent.isDirectory()) continue;
    if (!wanted.has(ent.name)) {
      fs.rmSync(path.join(RECIPES_DIR, ent.name), { recursive: true, force: true });
      console.warn("Removed orphan recipe directory: " + ent.name);
    }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const buildDate = process.env.CI_BUILD_DATE
    || new Date().toISOString().replace(/Z$/, "+00:00");
  const raw      = JSON.parse(fs.readFileSync(RECIPES_JSON, "utf8"));
  const site     = raw.site || {};
  const list     = (raw.recipes || []).map(prepareRecipe);
  const template = fs.readFileSync(RECIPE_TEMPLATE, "utf8");

  fs.mkdirSync(RECIPES_DIR, { recursive: true });

  const wantedSlugs = [];
  let n = 0;

  for (const recipe of list) {
    const slug = String(recipe.slug || recipe.id || "").trim();
    if (!slug) {
      console.warn("Skipping recipe without slug:", recipe.title || "(no title)");
      continue;
    }
    wantedSlugs.push(slug);
    const dir = path.join(RECIPES_DIR, slug);
    fs.mkdirSync(dir, { recursive: true });
    try {
      const html = buildStaticRecipePage(template, recipe, site, buildDate);
      fs.writeFileSync(path.join(dir, "index.html"), html, "utf8");
      n++;
    } catch (err) {
      console.error(`Error building page for "${slug}":`, err.message);
    }
  }

  removeOrphanRecipeDirs(wantedSlugs);
  writeSitemap(site, list, buildDate);
  console.log(
    `Wrote ${n} recipe pages under recipes/<slug>/index.html and updated sitemap.xml`
  );
}

main();
