import React from 'react';
import { AGENT } from '../data/siteContent';
import { AREAS, Area } from '../data/areas';
import { BlogCta, Shell } from './BlogPages';
import type { AreaStats, TypeStats } from '../../server/market';

// Pages « prix et estimation » par secteur. Rendues côté serveur (aucun hook) avec des chiffres calculés sur les ventes réelles.

const fmt = (n: number) => n.toLocaleString('fr-FR');
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const monthYear = (iso: string) => `${MONTHS[parseInt(iso.slice(5, 7), 10) - 1]} ${iso.slice(0, 4)}`;

export function areaFaq(area: Area, stats: AreaStats | null): Array<{ q: string; a: string }> {
  const faq: Array<{ q: string; a: string }> = [];
  if (stats?.apartment) {
    faq.push({
      q: `Quel est le prix au m² des appartements ${area.inName} ?`,
      a: `D'après ${fmt(stats.apartment.n)} ventes d'appartements enregistrées entre ${monthYear(stats.periodFrom)} et ${monthYear(stats.periodTo)}, le prix médian est de ${fmt(stats.apartment.medianM2)} € le m². La moitié des ventes se situe entre ${fmt(stats.apartment.p25M2)} et ${fmt(stats.apartment.p75M2)} € le m².`,
    });
  }
  if (stats?.house) {
    faq.push({
      q: `Quel est le prix au m² des maisons ${area.inName} ?`,
      a: `D'après ${fmt(stats.house.n)} ventes de maisons enregistrées sur la même période, le prix médian est de ${fmt(stats.house.medianM2)} € le m² habitable, avec une moitié des ventes entre ${fmt(stats.house.p25M2)} et ${fmt(stats.house.p75M2)} € le m².`,
    });
  }
  faq.push(
    {
      q: 'Ces prix sont-ils des prix de vente réels ?',
      a: "Oui : ils proviennent de la base publique « Demandes de valeurs foncières » (DVF), qui recense les ventes réellement conclues à partir des actes notariés. Ce ne sont pas des prix d'annonces.",
    },
    {
      q: `Comment estimer précisément mon bien ${area.inName} ?`,
      a: `Le prix médian est un repère de secteur. Le prix de votre bien dépend aussi de son état, de l'étage, de la vue, de la luminosité et des extérieurs. Vous pouvez obtenir une fourchette en 2 minutes avec le simulateur, puis la faire confirmer par une visite gratuite avec ${AGENT.firstName}.`,
    },
  );
  return faq;
}

const StatCard: React.FC<{ title: string; s: TypeStats }> = ({ title, s }) => (
  <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-xs">
    <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">{title}</p>
    <p className="mt-1 text-3xl font-extrabold text-[#0f1f3d]">{fmt(s.medianM2)} € <span className="text-base font-semibold text-stone-500">/ m²</span></p>
    <p className="mt-1 text-sm text-stone-600">Prix médian. La moitié des ventes entre {fmt(s.p25M2)} et {fmt(s.p75M2)} € le m².</p>
    <p className="mt-1 text-xs text-stone-500">{fmt(s.n)} ventes · prix de vente médian {fmt(s.medianPrice)} €</p>
  </div>
);

export const AreaPage: React.FC<{ area: Area; stats: AreaStats | null }> = ({ area, stats }) => {
  const faq = areaFaq(area, stats);
  const others = AREAS.filter((a) => a.slug !== area.slug && (a.group === area.group || area.group === 'Lyon')).slice(0, 10);
  return (
    <Shell>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <nav aria-label="Fil d'Ariane" className="text-xs text-stone-500 mb-4">
          <a href="/" className="hover:underline">Accueil</a> › <a href="/estimation-immobiliere" className="hover:underline">Estimation immobilière</a> › <span>{area.name}</span>
        </nav>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 leading-tight [text-wrap:balance]">
          Prix immobilier et estimation {area.inName}
        </h1>
        {stats ? (
          <p className="mt-4 text-lg text-stone-700 leading-relaxed">
            Quel est le prix d'un bien {area.inName} ? Voici les chiffres calculés sur <strong>{fmt(stats.totalSales)} ventes réellement enregistrées</strong> entre {monthYear(stats.periodFrom)} et {monthYear(stats.periodTo)} (source : base DVF de l'État), pas sur des prix d'annonces.
          </p>
        ) : (
          <p className="mt-4 text-lg text-stone-700 leading-relaxed">
            Les statistiques de ventes de ce secteur ne sont pas disponibles pour le moment. Vous pouvez tout de même obtenir une estimation personnalisée de votre bien en deux minutes.
          </p>
        )}

        {stats && (
          <section aria-labelledby="stats-title" className="mt-8">
            <h2 id="stats-title" className="text-xl sm:text-2xl font-bold text-stone-900">Prix au m² {area.inName}</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              {stats.apartment && <StatCard title="Appartements" s={stats.apartment} />}
              {stats.house && <StatCard title="Maisons" s={stats.house} />}
            </div>
            {stats.trend && (
              <p className="mt-4 text-sm text-stone-700 rounded-xl bg-stone-100 border border-stone-200 px-4 py-3">
                <strong>Évolution :</strong> le prix médian au m² des appartements est de {stats.trend.pct > 0 ? '+' : ''}
                {stats.trend.pct.toLocaleString('fr-FR')} % sur les 12 derniers mois par rapport aux 12 mois précédents ({fmt(stats.trend.nRecent)} et {fmt(stats.trend.nBefore)} ventes). Une évolution calculée sur un secteur donné reste indicative.
              </p>
            )}
          </section>
        )}

        {stats?.apartment && stats.apartment.bySize.length > 0 && (
          <section aria-labelledby="size-title" className="mt-10">
            <h2 id="size-title" className="text-xl sm:text-2xl font-bold text-stone-900">Prix des appartements selon la taille {area.inName}</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
              <table className="w-full text-sm text-left">
                <caption className="sr-only">Prix médians des appartements vendus {area.inName}, par nombre de pièces</caption>
                <thead className="bg-stone-100 text-stone-600">
                  <tr>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Type</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Ventes</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Prix de vente médian</th>
                    <th scope="col" className="px-4 py-2.5 font-semibold">Prix médian au m²</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.apartment.bySize.map((r) => (
                    <tr key={r.label} className="border-t border-stone-200">
                      <th scope="row" className="px-4 py-2.5 font-medium text-stone-900">{r.label}</th>
                      <td className="px-4 py-2.5">{fmt(r.n)}</td>
                      <td className="px-4 py-2.5">{fmt(r.medianPrice)} €</td>
                      <td className="px-4 py-2.5">{fmt(r.medianM2)} €</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <BlogCta />

        {area.localNote && (
          <section className="mt-8">
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900">Le marché {area.inName} vu par {AGENT.firstName}</h2>
            <p className="mt-3 text-stone-700 leading-relaxed">{area.localNote}</p>
          </section>
        )}

        <section aria-labelledby="read-title" className="mt-10">
          <h2 id="read-title" className="text-xl sm:text-2xl font-bold text-stone-900">Comment lire ces chiffres</h2>
          <ul className="mt-3 list-disc pl-6 space-y-1.5 text-stone-700 leading-relaxed">
            <li>Il s'agit de <strong>médianes</strong> : la moitié des biens s'est vendue en dessous, l'autre moitié au-dessus.</li>
            <li>Un prix au m² de secteur est un repère : l'état du bien, l'étage, la vue, la luminosité et les extérieurs peuvent l'éloigner nettement.</li>
            <li>Les ventes très atypiques et celles qui regroupent plusieurs logements sont écartées du calcul.</li>
            <li>Les données sont publiées avec un délai : les toutes dernières ventes n'y figurent pas encore.</li>
          </ul>
          <p className="mt-3 text-stone-700">Pour aller plus loin : <a className="underline" href="/blog/prix-immobilier-dvf-ventes-reelles-quartier">comment lire la base DVF</a> et <a className="underline" href="/blog/estimer-appartement-lyon-criteres-prix">les critères qui font varier le prix</a>.</p>
        </section>

        <section aria-labelledby="faq-title" className="mt-10">
          <h2 id="faq-title" className="text-xl sm:text-2xl font-bold text-stone-900">Questions fréquentes sur le prix {area.inName}</h2>
          <dl className="mt-4 space-y-4">
            {faq.map((f) => (
              <div key={f.q} className="rounded-xl bg-white border border-stone-200 p-4">
                <dt className="font-semibold text-stone-900">{f.q}</dt>
                <dd className="mt-1 text-stone-700 leading-relaxed">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="other-title" className="mt-10">
          <h2 id="other-title" className="text-lg font-bold text-stone-900">Autres secteurs</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {others.map((a) => (
              <li key={a.slug}><a href={`/estimation-immobiliere/${a.slug}`} className="inline-block rounded-full border border-stone-200 bg-white px-3 py-1 hover:border-stone-400">{a.name}</a></li>
            ))}
          </ul>
        </section>
      </main>
    </Shell>
  );
};

export const AreaHub: React.FC = () => (
  <Shell>
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-stone-900 [text-wrap:balance]">Estimation immobilière à Lyon et autour : prix par secteur</h1>
      <p className="mt-4 text-stone-700 text-lg leading-relaxed max-w-3xl">
        Choisissez votre secteur pour voir les prix au m² réellement constatés, calculés sur les ventes enregistrées par l'État (base DVF), puis estimez gratuitement votre bien.
      </p>
      {(['Lyon', 'Métropole de Lyon', 'Beaujolais'] as const).map((g) => (
        <section key={g} className="mt-8">
          <h2 className="text-xl font-bold text-stone-900">{g === 'Lyon' ? 'Les arrondissements de Lyon' : g === 'Métropole de Lyon' ? 'Métropole de Lyon' : 'Beaujolais'}</h2>
          <ul className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
            {AREAS.filter((a) => a.group === g).map((a) => (
              <li key={a.slug}>
                <a href={`/estimation-immobiliere/${a.slug}`} className="block rounded-xl bg-white border border-stone-200 px-4 py-3 font-medium text-stone-900 hover:shadow-md transition-shadow">
                  {a.name}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <BlogCta />
    </main>
  </Shell>
);
