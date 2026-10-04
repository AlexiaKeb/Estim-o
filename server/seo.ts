import type { Request } from "express";
import { AGENT, BRAND, FAQ } from "../src/data/siteContent";

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

export function seoHead(req: Request): string {
  const base = siteBase(req);
  const m = pageMeta(req.path);
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
    `<meta property="og:type" content="website" />`,
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
  ];
  return tags.filter(Boolean).join("\n    ");
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
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(([p, prio, freq]) => `  <url><loc>${base}${p === "/" ? "/" : p}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`)
  .join("\n")}
</urlset>
`;
}
