import type { Request } from "express";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AGENT, BRAND, FAQ, FAQ_HOME_COUNT, SOCIALS } from "../src/data/siteContent";
import { getPost, BlogPost } from "../src/data/blog";
import { BlogIndex, BlogArticle, BlogNotFound, FaqPage, ContactPage } from "../src/components/BlogPages";
import { Honoraires, MentionsLegales, Confidentialite } from "../src/components/LegalPages";

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
  faq?: boolean;
  contact?: boolean;
  legal?: "honoraires" | "mentions" | "confidentialite";
  status?: number;
}

export function pageMeta(rawPath: string, posts: BlogPost[]): PageMeta {
  const path = rawPath.toLowerCase().replace(/\/+$/, "") || "/";
  if (path === "/") {
    return {
      title: `Estimation immobilière gratuite à Lyon | ${BRAND.name}`,
      description:
        "Estimation immobilière gratuite à Lyon, Villeurbanne et en Beaujolais en 2 minutes, d'après les ventes réelles (DVF). Visite offerte avec Céline LEVRAT.",
      path: "/",
      index: true,
      home: true,
    };
  }
  // Landing page of the ads: the home page, with the estimate assistant opened straight away (canonical = home page)
  if (path === "/estimation") {
    return {
      title: `Estimation immobilière gratuite à Lyon | ${BRAND.name}`,
      description:
        "Estimation immobilière gratuite à Lyon, Villeurbanne et en Beaujolais en 2 minutes, d'après les ventes réelles (DVF). Visite offerte avec Céline LEVRAT.",
      path: "/",
      index: true,
      home: true,
    };
  }
  // Confirmation page (after a booking): served so a refresh keeps it, never indexed
  if (path === "/confirmation") {
    return { title: `Confirmation de votre rendez-vous | ${BRAND.name}`, description: "Confirmation de votre visite d'estimation avec Céline LEVRAT.", path, index: false };
  }
  if (path === "/contact") {
    return {
      title: `Contacter Céline LEVRAT, conseillère immobilière à Lyon | ${BRAND.name}`,
      description: "Téléphone, zone d'intervention et réseaux sociaux de Céline LEVRAT, conseillère immobilière indépendante à Lyon et en Beaujolais.",
      path,
      index: true,
      contact: true,
    };
  }
  if (path === "/honoraires") {
    return { title: `Barème d'honoraires | ${BRAND.name}`, description: "Barème des honoraires de transaction de l'agence mandante, toutes taxes comprises.", path, index: true, legal: "honoraires" };
  }
  if (path === "/mentions-legales") {
    return {
      title: `Mentions légales | ${BRAND.name}`,
      description: "Mentions légales du site Agent Estimation : éditeur, agence mandante, hébergeur et nature des estimations.",
      path,
      index: true,
      legal: "mentions",
    };
  }
  if (path === "/confidentialite") {
    return {
      title: `Politique de confidentialité | ${BRAND.name}`,
      description: "Données collectées, finalités, durée de conservation, vos droits et cookies : la politique de confidentialité d'Agent Estimation.",
      path,
      index: true,
      legal: "confidentialite",
    };
  }
  if (path === "/faq") {
    return {
      title: `Questions fréquentes sur l'estimation immobilière | ${BRAND.name}`,
      description: "Estimation gratuite en ligne, visite offerte, avis de valeur, documents à préparer : les réponses à vos questions avant de vendre votre bien.",
      path,
      index: true,
      faq: true,
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
    const post = getPost(path.slice("/blog/".length), posts);
    if (post) return { title: post.metaTitle.length + BRAND.name.length + 3 <= 68 ? `${post.metaTitle} | ${BRAND.name}` : post.metaTitle, description: post.description, path, index: true, post };
    return { title: `Article introuvable | ${BRAND.name}`, description: BRAND.tagline, path, index: false, status: 404 };
  }
  // Espace conseiller : jamais indexé. Toute autre adresse inconnue répond « 404 » (et non un faux 200) pour ne pas polluer Google
  if (AGENT_PATHS.has(path)) return { title: `Dashboard | ${BRAND.name}`, description: BRAND.tagline, path, index: false };
  return { title: `Page introuvable | ${BRAND.name}`, description: BRAND.tagline, path, index: false, status: 404 };
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
      sameAs: SOCIALS.map((s) => s.url),
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
      mainEntity: FAQ.slice(0, FAQ_HOME_COUNT).map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];
  // "<" échappé pour que le JSON ne puisse jamais fermer la balise script
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\u003c");
}

function faqLd(base: string): string {
  const graph = [
    {
      "@type": "FAQPage",
      "@id": `${base}/faq#faq`,
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${base}/` },
        { "@type": "ListItem", position: 2, name: "Questions fréquentes", item: `${base}/faq` },
      ],
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
      image: post.coverUrl && /^https:\/\//i.test(post.coverUrl) ? post.coverUrl : `${base}/og-image.png`,
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
  const cover = m.post?.coverUrl && /^https:\/\//i.test(m.post.coverUrl) ? m.post.coverUrl : null;
  const image = cover || `${base}/og-image.png`;
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
    m.post ? `<meta property="article:modified_time" content="${m.post.updated || m.post.date}" />` : "",
    m.post ? `<meta property="article:author" content="${esc(AGENT.name)}" />` : "",
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<meta property="og:image" content="${esc(image)}" />`,
    ...(cover ? [] : [`<meta property="og:image:width" content="1200" />`, `<meta property="og:image:height" content="630" />`]),
    `<meta property="og:image:alt" content="${esc(m.post ? m.post.title : "Céline LEVRAT, conseillère immobilière à Lyon : estimation gratuite")}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${esc(m.title)}" />`,
    `<meta name="twitter:description" content="${esc(m.description)}" />`,
    `<meta name="twitter:image" content="${esc(image)}" />`,
    m.home ? `<script type="application/ld+json">${jsonLd(base)}</script>` : "",
    m.post ? `<script type="application/ld+json">${articleLd(base, m.post)}</script>` : "",
    m.faq ? `<script type="application/ld+json">${faqLd(base)}</script>` : "",
  ];
  return tags.filter(Boolean).join("\n    ");
}

export interface SeoResult {
  head: string;
  body: string;
  status: number;
}

/** Tout ce qu'il faut injecter dans index.html pour la page demandée (balises, contenu rendu côté serveur, statut HTTP). */
const card = (p: BlogPost): BlogPost => ({ ...p, sections: [], blocks: undefined, intro: "" });

export async function renderSeo(req: Request, posts: BlogPost[]): Promise<SeoResult> {
  const m = pageMeta(req.path, posts);
  let body = "";
  const data = (o: unknown) => `<script id="blog-data" type="application/json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;
  if (m.post) {
    const related = m.post.related.map((s) => getPost(s, posts)).filter(Boolean) as BlogPost[];
    body = renderToStaticMarkup(createElement(BlogArticle, { post: m.post, all: posts })) + data({ post: m.post, related: related.map(card) });
  } else if (m.contact) {
    body = renderToStaticMarkup(createElement(ContactPage));
  } else if (m.legal) {
    const Page = m.legal === "honoraires" ? Honoraires : m.legal === "mentions" ? MentionsLegales : Confidentialite;
    body = renderToStaticMarkup(createElement(Page));
  } else if (m.faq) {
    body = renderToStaticMarkup(createElement(FaqPage));
  } else if (m.blogIndex) {
    body = renderToStaticMarkup(createElement(BlogIndex, { posts })) + data({ posts: posts.map(card) });
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

export function sitemapXml(base: string, posts: BlogPost[]): string {
  const latest = posts.reduce((d, p) => ((p.updated || p.date) > d ? p.updated || p.date : d), "2026-10-01");
  const today = latest;
  const urls: Array<[string, string, string]> = [
    ["/", "1.0", "weekly"],
    ["/mentions-legales", "0.2", "yearly"],
    ["/confidentialite", "0.2", "yearly"],
    ["/faq", "0.7", "monthly"],
    ["/contact", "0.5", "yearly"],
    ["/honoraires", "0.3", "yearly"],
    ["/blog", "0.8", "weekly"],
    ...posts.map((p) => [`/blog/${p.slug}`, "0.7", "monthly"] as [string, string, string]),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(([p, prio, freq]) => `  <url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${p.startsWith("/blog/") ? (getPost(p.slice(6), posts)?.updated || getPost(p.slice(6), posts)?.date || today) : today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`)
  .join("\n")}
</urlset>
`;
}
