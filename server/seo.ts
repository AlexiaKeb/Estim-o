import type { Request } from "express";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AGENT, BRAND, FAQ } from "../src/data/siteContent";
import { BLOG_POSTS, getPost, BlogPost } from "../src/data/blog";
import { BlogIndex, BlogArticle, BlogNotFound } from "../src/components/BlogPages";
import { AreaPage, AreaHub, areaFaq, monthYear } from "../src/components/AreaPages";
import { AREAS, Area, getArea } from "../src/data/areas";
import { AreaStats, getAreaStats } from "./market";

// Référencement : balises par page, données structurées, robots.txt, sitemap.xml.
// L'adresse canonique vient de APP_URL (ou SITE_URL) pour que le nom de domaine définitif soit toujours celui indexé.

const AGENT_PATHS = new Set(["/agent", "/pro", "/conseiller", "/admin"]);

export function siteBase(req: Request): string {
  const configured = process.env.SITE_URL || process.env.APP_URL || process.env.RENDER_EXTERNAL_URL;
  if (configured) return configured.replace(/\/+$/, "");
  return `${req.protocol}://${req.get("host")}`;
}

interface PageMeta {
  title: string;
  description: string;
  path: string;
  index: boolean;
  home?: boolean;
  post?: BlogPost;
  blogIndex?: boolean;
  status?: number;
  area?: Area;
  areaHub?: boolean;
  stats?: AreaStats | null;
}

export function pageMeta(rawPath: string): PageMeta {
  const path = rawPath.toLowerCase().replace(/\/+$/, "") || "/";
  if (path === "/") {
    return {
      title: `Estimation immobilière Lyon gratuite | ${BRAND.name}`,
      description:
        "Estimez votre bien à Lyon, Villeurbanne ou en Beaujolais en 2 minutes grâce aux ventes réelles (DVF). Visite offerte avec Céline Levrat, conseillère locale.",
      path: "/",
      index: true,
      home: true,
    };
  }
  if (path === "/mentions-legales") {
    return {
      title: `Mentions légales | ${BRAND.name}`,
      description: "Mentions légales du site Agent Estimation : éditeur, agence mandante, hébergeur et nature des estimations.",
      path,
      index: true,
    };
  }
  if (path === "/confidentialite") {
    return {
      title: `Politique de confidentialité | ${BRAND.name}`,
      description: "Données collectées, finalités, durée de conservation, vos droits et cookies : la politique de confidentialité d'Agent Estimation.",
      path,
      index: true,
    };
  }
  if (path === "/blog") {
    return {
      title: `Conseils pour estimer et vendre son bien à Lyon | ${BRAND.name}`,
      description:
        "Prix, documents, diagnostics, étapes de la vente : des conseils clairs pour estimer et vendre son appartement ou sa maison à Lyon et dans le Beaujolais.",
      path,
      index: true,
      blogIndex: true,
    };
  }
  if (path.startsWith("/blog/")) {
    const post = getPost(path.slice("/blog/".length));
    if (post) return { title: post.metaTitle.length + BRAND.name.length + 3 <= 68 ? `${post.metaTitle} | ${BRAND.name}` : post.metaTitle, description: post.description, path, index: true, post };
    return { title: `Article introuvable | ${BRAND.name}`, description: BRAND.tagline, path, index: false, status: 404 };
  }
  if (path === "/estimation-immobiliere") {
    return {
      title: `Estimation immobilière à Lyon : prix par secteur | ${BRAND.name}`,
      description:
        "Prix au m² réellement constatés à Lyon, Villeurbanne, Caluire, Bron, Écully… d'après les ventes enregistrées (DVF). Estimez gratuitement votre bien.",
      path,
      index: true,
      areaHub: true,
    };
  }
  if (path.startsWith("/estimation-immobiliere/")) {
    const area = getArea(path.slice("/estimation-immobiliere/".length));
    if (area) return { title: area.name, description: "", path, index: false, area };
    return { title: `Page introuvable | ${BRAND.name}`, description: BRAND.tagline, path, index: false, status: 404 };
  }
  // Espace conseiller et pages inconnues : jamais indexés
  return { title: BRAND.name, description: BRAND.tagline, path, index: false };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function jsonLd(base: string): string {
  const areas = ["Lyon", "Villeurbanne", "Caluire-et-Cuire", "Bron", "Écully", "Villefranche-sur-Saône", "Beaujolais"].map((name) => ({
    "@type": "City",
    name,
  }));
  const graph = [
    {
      "@type": "WebSite",
      "@id": `${base}/#website`,
      url: `${base}/`,
      name: BRAND.name,
      inLanguage: "fr-FR",
    },
    {
      "@type": "RealEstateAgent",
      "@id": `${base}/#agent`,
      name: `${AGENT.name} – ${BRAND.name}`,
      url: `${base}/`,
      image: `${base}/celine.jpg`,
      telephone: "+33603580316",
      description: "Estimation immobilière gratuite à Lyon, Villeurbanne et en Beaujolais, appuyée sur les ventes réelles, avec visite offerte.",
      areaServed: areas,
    },
    {
      "@type": "Service",
      "@id": `${base}/#service`,
      serviceType: "Estimation immobilière",
      name: "Estimation immobilière gratuite",
      provider: { "@id": `${base}/#agent` },
      areaServed: areas,
      offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
    },
    {
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  // "<" échappé pour que le JSON ne puisse jamais fermer la balise script
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

const plain = (s: string) => s.replace(/[\u202f\u00a0]/g, " ");

/** Titre, description et indexation d'une page secteur : ils dépendent des chiffres réellement disponibles. */
function areaMeta(m: PageMeta, stats: AreaStats | null): PageMeta {
  const area = m.area!;
  const t = stats?.apartment || stats?.house;
  if (!stats || !t) {
    return { ...m, stats: null, title: `Prix immobilier ${area.name} | ${BRAND.name}`, description: `Estimez gratuitement votre bien ${area.inName} en 2 minutes, avec une visite offerte.`, index: false };
  }
  const label = stats.apartment ? "appartements" : "maisons";
  const title = plain(`Prix immobilier ${area.name} : ${t.medianM2.toLocaleString("fr-FR")} €/m², estimation gratuite`);
  const description = plain(
    `Prix au m² ${area.inName} d'après ${stats.totalSales.toLocaleString("fr-FR")} ventes réelles (DVF) : médiane de ${t.medianM2.toLocaleString("fr-FR")} € pour les ${label}. Estimez votre bien gratuitement.`,
  );
  return { ...m, stats, title, description, index: true };
}

function areaLd(base: string, area: Area, stats: AreaStats | null): string {
  const url = `${base}/estimation-immobiliere/${area.slug}`;
  const graph: any[] = [
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: "Estimation immobilière", item: `${base}/estimation-immobiliere` },
        { "@type": "ListItem", position: 3, name: area.name, item: url },
      ],
    },
    {
      "@type": "FAQPage",
      mainEntity: areaFaq(area, stats).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: plain(f.a) } })),
    },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

function articleLd(base: string, post: BlogPost): string {
  const url = `${base}/blog/${post.slug}`;
  const graph = [
    {
      "@type": "Article",
      "@id": `${url}#article`,
      headline: post.title,
      description: post.description,
      datePublished: post.date,
      dateModified: post.updated || post.date,
      inLanguage: "fr-FR",
      image: `${base}/og-image.png`,
      mainEntityOfPage: url,
      author: { "@type": "Person", name: AGENT.name, url: `${base}/` },
      publisher: { "@type": "Organization", name: BRAND.name, url: `${base}/`, logo: { "@type": "ImageObject", url: `${base}/favicon.svg` } },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: "Conseils", item: `${base}/blog` },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

function buildHead(req: Request, m: PageMeta): string {
  const base = siteBase(req);
  const url = `${base}${m.path === "/" ? "/" : m.path}`;
  const image = `${base}/og-image.png`;
  const robots = m.index ? "index,follow,max-image-preview:large" : "noindex,nofollow";
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<meta name="robots" content="${robots}" />`,
    m.index ? `<link rel="canonical" href="${esc(url)}" />` : "",
    `<meta property="og:locale" content="fr_FR" />`,
    `<meta property="og:site_name" content="${esc(BRAND.name)}" />`,
    `<meta property="og:type" content="${m.post ? "article" : "website"}" />`,
    m.post ? `<meta property="article:published_time" content="${m.post.date}" />` : "",
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    `<meta property="og:image:width" content="1200" />`,
    `<meta property="og:image:height" content="630" />`,
    `<meta property="og:image:alt" content="Céline Levrat, conseillère immobilière à Lyon : estimation gratuite" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    m.home ? `<script type="application/ld+json">${jsonLd(base)}</script>` : "",
    m.post ? `<script type="application/ld+json">${articleLd(base, m.post)}</script>` : "",
    m.area && m.index ? `<script type="application/ld+json">${areaLd(base, m.area, m.stats ?? null)}</script>` : "",
  ];
  return tags.filter(Boolean).join("\n    ");
}

export interface SeoResult {
  head: string;
  body: string;
  status: number;
}

/** Tout ce qu'il faut injecter dans index.html pour la page demandée (balises, contenu rendu côté serveur, statut HTTP). */
export async function renderSeo(req: Request): Promise<SeoResult> {
  let m = pageMeta(req.path);
  let body = "";
  if (m.post) body = renderToStaticMarkup(createElement(BlogArticle, { post: m.post }));
  else if (m.blogIndex) body = renderToStaticMarkup(createElement(BlogIndex));
  else if (m.areaHub) body = renderToStaticMarkup(createElement(AreaHub));
  else if (m.area) {
    const stats = await getAreaStats(m.area).catch(() => null);
    m = areaMeta(m, stats);
    // Les chiffres sont aussi remis au navigateur, qui reconstruit la même page sans refaire le calcul
    const data = JSON.stringify({ slug: m.area!.slug, stats }).replace(/</g, "\\u003c");
    body = renderToStaticMarkup(createElement(AreaPage, { area: m.area!, stats })) + `<script id="area-data" type="application/json">${data}</script>`;
  } else if (m.status === 404 && req.path.startsWith("/blog")) body = renderToStaticMarkup(createElement(BlogNotFound));
  return { head: buildHead(req, m), body, status: m.status || 200 };
}

export function robotsTxt(base: string): string {
  return [
    "User-agent: *",
    "Allow: /",
    "Disallow: /api/",
    ...[...AGENT_PATHS].map((p) => `Disallow: ${p}`),
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
  ].join("\n");
}

export function sitemapXml(base: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const urls: Array<[string, string, string]> = [
    ["/", "1.0", "weekly"],
    ["/mentions-legales", "0.2", "yearly"],
    ["/confidentialite", "0.2", "yearly"],
    ["/blog", "0.8", "weekly"],
    ["/estimation-immobiliere", "0.8", "weekly"],
    ...AREAS.map((a) => [`/estimation-immobiliere/${a.slug}`, "0.7", "weekly"] as [string, string, string]),
    ...BLOG_POSTS.map((p) => [`/blog/${p.slug}`, "0.7", "monthly"] as [string, string, string]),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(([p, prio, freq]) => `  <url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${p.startsWith("/blog/") ? (getPost(p.slice(6))?.updated || getPost(p.slice(6))?.date || today) : today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`)
  .join("\n")}
</urlset>
`;
}
