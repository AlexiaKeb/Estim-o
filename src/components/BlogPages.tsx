import React from 'react';
import { AGENT, BRAND, FAQ, LEGAL, SOCIALS } from '../data/siteContent';
import { BrandLogo } from './BrandLogo';
import { CreditLine } from './CreditLine';
import { Human } from './Mascots';
import { BlogPost, ArticleBlock, blocksOf, formatPostDate, getPost } from '../data/blog';

// Pages du blog. Aucun hook ni API navigateur : ces composants sont aussi rendus côté serveur (référencement).

/** Texte avec **gras** et [lien](/chemin) */
export function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="font-semibold text-stone-900">{part.slice(2, -2)}</strong>;
    const m = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (m) return <a key={i} href={m[2]} className="text-[#0B0F1F] underline underline-offset-2 hover:text-[#2B4BFF]">{m[1]}</a>;
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="min-h-screen bg-[#FFF7E6] text-[#0B0F1F]">
    <header className="sticky top-0 z-30 bg-[#FFF7E6] border-b-[3px] border-[#0B0F1F]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
        <BrandLogo />
        <nav aria-label="Navigation principale" className="flex items-center gap-4 text-sm">
          <a href="/blog" className="font-black text-[#0B0F1F] hover:text-[#2B4BFF]">Conseils</a>
          <a href="/#simulateur" className="rounded-lg bg-[#FFD60A] hover:brightness-95 text-[#0B0F1F] border-[3px] border-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] font-black px-3.5 py-2">Estimer mon bien</a>
        </nav>
      </div>
    </header>
    {children}
    <a
      href="/#simulateur"
      className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-[#FFD60A] text-[#0B0F1F] border-t-[3px] border-[#0B0F1F] font-black text-center py-4"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
    >
      Estimer mon bien, offert →
    </a>
    <footer className="bg-[#0B0F1F] mt-16 pb-16 sm:pb-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 text-[11px] sm:text-xs text-center sm:text-left text-white/70 flex flex-wrap gap-x-5 gap-y-2 justify-center sm:justify-between">
        <span>{BRAND.name} · Estimation immobilière à Lyon</span>
        <span className="flex flex-wrap justify-center gap-x-4 gap-y-1">
          <a href="/" className="hover:text-[#FFD60A]">Accueil</a>
          <a href="/faq" className="hover:text-[#FFD60A]">Questions fréquentes</a>
          <a href="/contact" className="hover:text-[#FFD60A]">Contact</a>
          <a href="/mentions-legales" className="hover:text-[#FFD60A]">Mentions légales</a>
          <a href="/honoraires" className="hover:text-[#FFD60A]">Honoraires</a>
          <a href="/confidentialite" className="hover:text-[#FFD60A]">Confidentialité</a>
          <CreditLine />
        </span>
      </div>
    </footer>
  </div>
);

export const BlogCta: React.FC<{ compact?: boolean }> = ({ compact }) => (
  <aside aria-label="Estimer son bien" className="rounded-2xl bg-[#2B4BFF] text-white p-5 sm:p-7 border-l-4 border-[#FFD60A] my-8">
    <p className="text-[#FFD60A] text-[11px] font-bold uppercase tracking-wider mb-1">Estimation offerte</p>
    <p className={`font-semibold leading-snug ${compact ? 'text-lg' : 'text-xl sm:text-2xl'}`}>Combien vaut votre bien à Lyon et autour ?</p>
    <p className="text-sm sm:text-base text-slate-300 mt-2">
      Obtenez une fourchette en 2 minutes, fondée sur les ventes réelles autour de votre adresse. {AGENT.firstName} vous propose ensuite une visite offerte et sans engagement.
    </p>
    <a href="/#simulateur" className="mt-4 inline-block rounded-xl bg-[#FFD60A] hover:brightness-95 text-[#0B0F1F] border-[3px] border-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] font-black px-5 py-3">
      Estimer mon bien
    </a>
  </aside>
);

const PostCard: React.FC<{ post: BlogPost }> = ({ post }) => (
  <article className="pop-card rounded-3xl bg-white border-[3px] border-[#0B0F1F] shadow-[5px_5px_0_#0B0F1F] p-5 flex flex-col">
    <p className="text-[11px] font-bold uppercase tracking-wider text-[#2B4BFF]">{post.category}</p>
    <h2 className="mt-1 text-lg font-black text-[#0B0F1F] leading-snug">
      <a href={`/blog/${post.slug}`} className="hover:underline">{post.title}</a>
    </h2>
    <p className="mt-2 text-sm text-stone-600 flex-1">{post.description}</p>
    <p className="mt-3 text-xs text-stone-500">{formatPostDate(post.date)} · {post.readingMinutes} min de lecture</p>
  </article>
);

export const BlogIndex: React.FC<{ posts: BlogPost[] }> = ({ posts }) => (
  <Shell>
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0B0F1F] [text-wrap:balance]">
        Conseils pour estimer et vendre son bien à Lyon
      </h1>
      <p className="mt-3 text-stone-600 max-w-2xl">
        Prix, documents, diagnostics, étapes de la vente : des explications claires pour préparer votre projet, rédigées par {AGENT.name}, conseillère immobilière à Lyon.
      </p>
      <div className="mt-8 grid sm:grid-cols-2 gap-5">
        {posts.map((p) => <PostCard key={p.slug} post={p} />)}
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

/** URL d'image acceptée : adresse https uniquement */
const safeImg = (u: string) => (/^https:\/\//i.test(u) ? u : '');

const Block: React.FC<{ b: ArticleBlock }> = ({ b }) => {
  switch (b.type) {
    case 'h2':
      return <h2 className="mt-10 text-xl sm:text-2xl font-bold text-stone-900 leading-snug">{b.text}</h2>;
    case 'p':
      return <p className="mt-3 text-stone-700 leading-relaxed">{renderInline(b.text)}</p>;
    case 'ul':
      return (
        <ul className="mt-3 list-disc pl-6 space-y-1.5 text-stone-700 leading-relaxed">
          {b.items.map((li, k) => <li key={k}>{renderInline(li)}</li>)}
        </ul>
      );
    case 'img':
      return safeImg(b.url) ? (
        <figure className="mt-6">
          <img src={safeImg(b.url)} alt={b.alt} loading="lazy" decoding="async" className="mx-auto aspect-square w-full max-w-2xl rounded-2xl border-[3px] border-[#0B0F1F] object-cover" />
          {b.caption && <figcaption className="mt-2 text-center text-xs text-stone-500">{b.caption}</figcaption>}
        </figure>
      ) : null;
  }
};

export const BlogArticle: React.FC<{ post: BlogPost; all?: BlogPost[] }> = ({ post, all }) => {
  const related = post.related.map((s) => getPost(s, all)).filter(Boolean) as BlogPost[];
  const blocks = blocksOf(post);
  let h2Seen = 0;
  return (
    <Shell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="Fil d'Ariane" className="text-xs text-stone-500 mb-4">
          <a href="/" className="hover:underline">Accueil</a> › <a href="/blog" className="hover:underline">Conseils</a> › <span>{post.category}</span>
        </nav>
        <article>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0B0F1F] leading-tight [text-wrap:balance]">{post.title}</h1>
          <p className="mt-3 text-sm text-stone-500">
            Par {AGENT.name} · <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            {post.updated ? <> · mis à jour le <time dateTime={post.updated}>{formatPostDate(post.updated)}</time></> : null} · {post.readingMinutes} min de lecture
          </p>
          <p className="mt-6 text-lg text-stone-700 leading-relaxed">{renderInline(post.intro)}</p>
          <a href="/#simulateur" className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#FFD60A] hover:brightness-95 text-[#0B0F1F] border-[3px] border-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] font-black px-5 py-3">
            Estimer mon bien en 2 minutes →
          </a>

          {post.coverUrl && safeImg(post.coverUrl) && (
            <img src={safeImg(post.coverUrl)} alt={post.title} width={1200} height={1200} decoding="async" className="mx-auto mt-6 aspect-square w-full max-w-2xl rounded-2xl border-[3px] border-[#0B0F1F] object-cover" />
          )}

          {blocks.map((b, i) => {
            if (b.type === 'h2') h2Seen++;
            return (
              <React.Fragment key={i}>
                {b.type === 'h2' && h2Seen === 3 && <BlogCta compact />}
                <Block b={b} />
              </React.Fragment>
            );
          })}

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

/** Full list of questions and answers (rendered on the server too, for search engines). */
export const FaqPage: React.FC = () => (
  <Shell>
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <nav aria-label="Fil d'Ariane" className="text-xs text-stone-500 mb-4">
        <a href="/" className="hover:underline">Accueil</a> › <span>Questions fréquentes</span>
      </nav>
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0B0F1F] [text-wrap:balance]">Questions fréquentes sur l'estimation de votre bien</h1>
      <p className="mt-4 text-lg text-stone-700 leading-relaxed">
        Toutes les réponses sur l'estimation en ligne, la visite de {AGENT.firstName} et la suite de votre projet. Une question spécifique ? Appelez-la au <a className="font-bold underline" href={AGENT.phoneHref}>{AGENT.phone}</a>.
      </p>
      <div className="mt-8 space-y-4">
        {FAQ.map((item) => (
          <section key={item.q} className="rounded-2xl border-[3px] border-[#0B0F1F] bg-white p-5 sm:p-6 shadow-[5px_5px_0_#0B0F1F]">
            <h2 className="text-lg sm:text-xl font-black leading-snug text-[#0B0F1F]">{item.q}</h2>
            <p className="mt-2 text-stone-700 leading-relaxed">{item.a}</p>
          </section>
        ))}
      </div>
      <BlogCta />
    </main>
  </Shell>
);

/** Contact page: every way to reach the advisor (rendered on the server too). */
export const ContactPage: React.FC = () => (
  <Shell>
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <nav aria-label="Fil d'Ariane" className="text-xs text-stone-500 mb-4">
        <a href="/" className="hover:underline">Accueil</a> › <span>Contact</span>
      </nav>
      <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#0B0F1F] [text-wrap:balance]">Contacter {AGENT.firstName} {AGENT.name.split(' ').slice(1).join(' ').toUpperCase()}</h1>
      <p className="mt-4 text-lg text-stone-700 leading-relaxed">Une question avant ou après votre estimation ? {AGENT.firstName} vous répond directement.</p>

      <section aria-label="Coordonnées" className="mt-8 overflow-hidden rounded-3xl border-[3px] border-[#0B0F1F] bg-white shadow-[8px_8px_0_#0B0F1F]">
        <div className="border-b-[3px] border-[#0B0F1F] bg-[#FFD60A] px-5 py-3 sm:px-8">
          <span className="text-sm font-black uppercase tracking-wider">{AGENT.firstName} {AGENT.name.split(' ').slice(1).join(' ').toUpperCase()} · Conseillère immobilière indépendante</span>
        </div>
        <div className="flex flex-col items-center gap-8 p-5 sm:p-8 md:flex-row md:items-center">
          <Human className="w-36 shrink-0 sm:w-44" />
          <dl className="w-full min-w-0 flex-1 space-y-5">
            <div>
              <dt className="text-xs font-black uppercase tracking-wider text-[#2B4BFF]">Téléphone</dt>
              <dd className="mt-1 text-3xl font-black tracking-wide sm:text-4xl">{AGENT.phone}</dd>
              <dd className="mt-2">
                <a href={AGENT.phoneHref} className="inline-flex items-center gap-2 rounded-2xl border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-5 py-2.5 font-black shadow-[4px_4px_0_#0B0F1F] md:hidden">Appeler {AGENT.firstName}</a>
              </dd>
            </div>
            {LEGAL.contactEmail && (
              <div>
                <dt className="text-xs font-black uppercase tracking-wider text-[#2B4BFF]">E-mail</dt>
                <dd className="mt-1 text-xl font-bold"><a className="underline underline-offset-2 hover:text-[#2B4BFF]" href={`mailto:${LEGAL.contactEmail}`}>{LEGAL.contactEmail}</a></dd>
              </div>
            )}
            <div>
              <dt className="text-xs font-black uppercase tracking-wider text-[#2B4BFF]">Zone d'intervention</dt>
              <dd className="mt-1 text-lg font-bold">{AGENT.zone}</dd>
            </div>
            <div>
              <dt className="text-xs font-black uppercase tracking-wider text-[#2B4BFF]">Réseaux sociaux</dt>
              <dd className="mt-2 flex flex-wrap gap-3">
                {SOCIALS.map((s) => (
                  <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="rounded-full border-[3px] border-[#0B0F1F] bg-white px-4 py-1.5 text-sm font-black hover:bg-[#FFD60A]">
                    {s.label}<span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
                  </a>
                ))}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section aria-labelledby="about-title" id="about" className="mt-10 rounded-3xl border-[3px] border-[#0B0F1F] bg-white p-5 shadow-[5px_5px_0_#0B0F1F] sm:p-8">
        <span className="text-xs font-black uppercase tracking-wider text-[#2B4BFF]">Qui suis-je ?</span>
        <h2 id="about-title" className="mt-1 text-2xl font-black leading-tight tracking-tight sm:text-3xl">À propos de moi</h2>
        <div className="mt-4 space-y-4 text-base leading-relaxed text-stone-700">
          <p>
            Je suis Céline LEVRAT, conseillère immobilière indépendante à Lyon et dans le Beaujolais. Je fais partie de <strong className="text-[#0B0F1F]">NOVEA Immobilier</strong>,
            agence immobilière lyonnaise réputée.
          </p>
          <p>
            Chez NOVEA, nous sommes une équipe de 22 agents dans la région, en complète symbiose et dans un esprit collégial. C'est un vrai plus pour vous : nous partageons nos compétences,
            nous échangeons sur les biens et sur le marché local, et je reste votre interlocutrice du début à la fin. Que vous vendiez dans quelques mois ou que vous souhaitiez
            simplement connaître la valeur de votre bien, n'hésitez pas à me contacter : la visite est offerte et sans engagement.
          </p>
        </div>
      </section>

      <BlogCta />
      <p className="text-sm text-stone-600">Informations légales : <a className="underline" href="/mentions-legales">mentions légales</a>.</p>
    </main>
  </Shell>
);
