import React from 'react';
import { AGENT, BRAND } from '../data/siteContent';
import { BLOG_POSTS, BlogPost, formatPostDate, getPost } from '../data/blog';

// Pages du blog. Aucun hook ni API navigateur : ces composants sont aussi rendus côté serveur (référencement).

/** Texte avec **gras** et [lien](/chemin) */
export function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-stone-900">{part.slice(2, -2)}</strong>;
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) return <a key={i} href={m[2]} className="text-[#0f1f3d] underline underline-offset-2 hover:text-amber-700">{m[1]}</a>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-stone-50 text-stone-800">
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <a href="/" className="font-bold text-stone-900">{BRAND.name}</a>
        <nav aria-label="Navigation principale" className="flex items-center gap-4 text-sm">
          <a href="/estimation-immobiliere" className="hidden sm:inline text-stone-600 hover:text-stone-900">Prix par secteur</a>
          <a href="/blog" className="text-stone-600 hover:text-stone-900">Conseils</a>
          <a href="/#simulateur" className="rounded-lg bg-amber-400 hover:bg-amber-300 text-[#0f1f3d] font-semibold px-3.5 py-2">Estimer mon bien</a>
        </nav>
      </div>
    </header>
    {children}
    <footer className="border-t border-stone-200 bg-white mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 text-xs text-stone-500 flex flex-wrap gap-x-5 gap-y-2 justify-between">
        <span>{BRAND.name} · Estimation immobilière à Lyon</span>
        <span className="flex gap-4">
          <a href="/" className="hover:text-stone-800">Accueil</a>
          <a href="/estimation-immobiliere" className="hover:text-stone-800">Prix par secteur</a>
          <a href="/mentions-legales" className="hover:text-stone-800">Mentions légales</a>
          <a href="/confidentialite" className="hover:text-stone-800">Confidentialité</a>
        </span>
      </div>
    </footer>
  </div>
);

export const BlogCta: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <aside aria-label="Estimer son bien" className="rounded-2xl bg-[#0f1f3d] text-white p-5 sm:p-7 border-l-4 border-amber-400 my-8">
    <p className="text-amber-300 text-[11px] font-bold uppercase tracking-wider mb-1">Estimation gratuite</p>
    <p className={`font-semibold leading-snug ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>Combien vaut votre bien à Lyon et autour ?</p>
    <p className="text-sm sm:text-base text-slate-300 mt-2">
      Obtenez une fourchette en 2 minutes, fondée sur les ventes réelles autour de votre adresse. {AGENT.firstName} vous propose ensuite une visite gratuite et sans engagement.
    </p>
    <a href="/#simulateur" className="mt-4 inline-block rounded-xl bg-amber-400 hover:bg-amber-300 text-[#0f1f3d] font-bold px-5 py-3">
      Estimer mon bien
    </a>
  </aside>
);

const PostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <article className="rounded-2xl bg-white border border-stone-200 p-5 hover:shadow-md transition-shadow flex flex-col">
    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{post.category}</p>
    <h2 className="mt-1 text-lg font-semibold text-stone-900 leading-snug">
      <a href={`/blog/${post.slug}`} className="hover:underline">{post.title}</a>
    </h2>
    <p className="mt-2 text-sm text-stone-600 flex-1">{post.description}</p>
    <p className="mt-3 text-xs text-stone-500">{formatPostDate(post.date)} · {post.readingMinutes} min de lecture</p>
  </article>
);

export const BlogIndex: React.FC = () => (
  <Shell>
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 [text-wrap:balance]">
        Conseils pour estimer et vendre son bien à Lyon
      </h1>
      <p className="mt-3 text-stone-600 max-w-2xl">
        Prix, documents, diagnostics, étapes de la vente : des explications claires pour préparer votre projet, rédigées par {AGENT.name}, conseillère immobilière à Lyon.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-5">
        {BLOG_POSTS.map((p) => <PostCard key={p.slug} post={p} />)}
      </div>
      <BlogCta />
    </main>
  </Shell>
);

export const BlogNotFound: React.FC = () => (
  <Shell>
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
      <h1 className="text-2xl font-bold text-stone-900">Cet article n'existe pas</h1>
      <p className="mt-2 text-stone-600">Il a peut-être été déplacé.</p>
      <p className="mt-6"><a href="/blog" className="underline text-stone-900">Voir tous les conseils</a></p>
    </main>
  </Shell>
);

export const BlogArticle: React.FC<{ post: BlogPost }> = ({ post }) => {
  const related = post.related.map(getPost).filter(Boolean) as BlogPost[];
  return (
    <Shell>
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="Fil d'Ariane" className="text-xs text-stone-500 mb-4">
          <a href="/" className="hover:underline">Accueil</a> › <a href="/blog" className="hover:underline">Conseils</a> › <span>{post.category}</span>
        </nav>
        <article>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 leading-tight [text-wrap:balance]">{post.title}</h1>
          <p className="mt-3 text-sm text-stone-500">
            Par {AGENT.name} · <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            {post.updated ? <> · mis à jour le <time dateTime={post.updated}>{formatPostDate(post.updated)}</time></> : null} · {post.readingMinutes} min de lecture
          </p>
          <p className="mt-6 text-lg text-stone-700 leading-relaxed">{renderInline(post.intro)}</p>

          {post.sections.map((s, i) => (
            <React.Fragment key={s.h2}>
              <section className="mt-9">
                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 leading-snug">{s.h2}</h2>
                {s.paragraphs?.map((p, j) => <p key={j} className="mt-3 text-stone-700 leading-relaxed">{renderInline(p)}</p>)}
                {s.list && (
                  <ul className="mt-3 list-disc pl-6 space-y-1.5 text-stone-700 leading-relaxed">
                    {s.list.map((li, k) => <li key={k}>{renderInline(li)}</li>)}
                  </ul>
                )}
              </section>
              {i === 1 && <BlogCta compact />}
            </React.Fragment>
          ))}

          <BlogCta />

          <aside aria-label="À propos de l'auteure" className="mt-10 flex items-center gap-4 rounded-2xl bg-white border border-stone-200 p-4">
            <img src={AGENT.photoUrl} alt={AGENT.name} width={72} height={72} loading="lazy" className="w-[72px] h-[72px] rounded-full object-cover" />
            <p className="text-sm text-stone-600">
              <strong className="text-stone-900">{AGENT.name}</strong>, conseillère immobilière indépendante à Lyon. Elle accompagne les propriétaires de Lyon, Villeurbanne et du Beaujolais, de l'estimation à la vente. Ces informations sont générales et ne remplacent pas l'avis d'un professionnel pour votre situation.
            </p>
          </aside>
        </article>

        {related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-12">
            <h2 id="related-title" className="text-lg font-bold text-stone-900 mb-4">À lire aussi</h2>
            <div className="grid sm:grid-cols-2 gap-5">{related.slice(0, 2).map((p) => <PostCard key={p.slug} post={p} />)}</div>
          </section>
        )}
      </main>
    </Shell>
  );
};
