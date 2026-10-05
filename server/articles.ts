// Articles de blog écrits dans le tableau de bord (table `articles`) et fusionnés avec ceux livrés avec le site.
import crypto from "crypto";
import { BLOG_POSTS, BlogPost, ArticleBlock } from "../src/data/blog";

export interface ArticleInput {
  title: string;
  metaTitle?: string;
  description?: string;
  category?: string;
  coverUrl?: string;
  intro?: string;
  blocks: ArticleBlock[];
}

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const httpsUrl = (v: unknown) => {
  const u = clip(v, 600);
  return /^https:\/\/[^\s"'<>]+$/i.test(u) ? u : "";
};

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "article";
}

/** Cleans what the editor sends: only known block types, bounded sizes, https images only. */
export function sanitizeArticle(body: any): { ok: true; value: ArticleInput } | { ok: false; error: string } {
  const title = clip(body?.title, 150);
  if (title.length < 5) return { ok: false, error: "Le titre est trop court." };
  const blocks: ArticleBlock[] = [];
  for (const b of Array.isArray(body?.blocks) ? body.blocks.slice(0, 200) : []) {
    if (b?.type === "h2" || b?.type === "p") {
      const text = clip(b.text, 4000);
      if (text) blocks.push({ type: b.type, text });
    } else if (b?.type === "ul") {
      const items = (Array.isArray(b.items) ? b.items : []).map((i: unknown) => clip(i, 500)).filter(Boolean).slice(0, 30);
      if (items.length) blocks.push({ type: "ul", items });
    } else if (b?.type === "img") {
      const url = httpsUrl(b.url);
      if (url) blocks.push({ type: "img", url, alt: clip(b.alt, 200), caption: clip(b.caption, 250) || undefined });
    }
  }
  return {
    ok: true,
    value: {
      title,
      metaTitle: clip(body?.metaTitle, 70),
      description: clip(body?.description, 170),
      category: clip(body?.category, 40) || "Conseils",
      coverUrl: httpsUrl(body?.coverUrl),
      intro: clip(body?.intro, 1500),
      blocks,
    },
  };
}

export function readingMinutes(a: Pick<ArticleInput, "intro" | "blocks">): number {
  const words = [a.intro || "", ...a.blocks.map((b) => (b.type === "ul" ? b.items.join(" ") : b.type === "img" ? "" : b.text))].join(" ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Image bytes check: JPEG, PNG or WebP only, whatever the declared type says. */
export function imageKind(buf: Buffer): { ext: string; mime: string } | null {
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.length > 12 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { ext: "png", mime: "image/png" };
  if (buf.length > 12 && buf.subarray(0, 4).toString() === "RIFF" && buf.subarray(8, 12).toString() === "WEBP") return { ext: "webp", mime: "image/webp" };
  return null;
}

export const randomName = (ext: string) => `${Date.now()}-${crypto.randomBytes(5).toString("hex")}.${ext}`;

const isoDay = (v?: string | null) => (v ? String(v).slice(0, 10) : "");

export function rowToPost(r: any): BlogPost {
  const date = isoDay(r.published_at) || isoDay(r.created_at);
  const updated = isoDay(r.updated_at);
  return {
    slug: r.slug,
    title: r.title,
    metaTitle: r.meta_title || r.title.slice(0, 55),
    description: r.description || (r.intro || "").slice(0, 155),
    category: r.category || "Conseils",
    date,
    updated: updated && updated !== date ? updated : undefined,
    readingMinutes: r.reading_minutes || 3,
    intro: r.intro || "",
    sections: [],
    blocks: Array.isArray(r.blocks) ? r.blocks : [],
    coverUrl: r.cover_url || undefined,
    related: [],
    source: "db",
  };
}

let cache: { t: number; posts: BlogPost[] } | null = null;
export const invalidateArticles = () => {
  cache = null;
};

/** Published posts of both kinds, newest first. Never throws: if the database is down, only the built-in articles remain. */
export async function getAllPosts(client: any | null): Promise<BlogPost[]> {
  if (cache && Date.now() - cache.t < 60_000) return cache.posts;
  let dbPosts: BlogPost[] = [];
  if (client) {
    try {
      const { data } = await client
        .from("articles")
        .select("slug, title, meta_title, description, category, cover_url, intro, blocks, reading_minutes, published_at, created_at, updated_at")
        .eq("status", "publie")
        .order("published_at", { ascending: false })
        .limit(200);
      dbPosts = (data || []).map(rowToPost);
    } catch {
      /* table missing or database down */
    }
  }
  const taken = new Set(dbPosts.map((p) => p.slug));
  const all = [...dbPosts, ...BLOG_POSTS.filter((p) => !taken.has(p.slug)).map((p) => ({ ...p, source: "code" as const }))].sort((a, b) => b.date.localeCompare(a.date));
  // "À lire aussi" for the advisor's own articles: the two most recent others
  for (const p of all) if (p.source === "db") p.related = all.filter((o) => o.slug !== p.slug).slice(0, 2).map((o) => o.slug);
  cache = { t: Date.now(), posts: all };
  return all;
}
