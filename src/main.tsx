import {StrictMode} from 'react';
import type {ReactElement} from 'react';
import App from './App.tsx';
import {createRoot} from 'react-dom/client';
import './index.css';
import { ConsentBanner } from './components/ConsentBanner.tsx';
import { initTracking } from './utils/tracking.ts';

initTracking();
const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();

// Les pages secondaires (blog, pages légales) sont chargées à la demande : la page d'accueil reste légère.
// Le blog est déjà dans le HTML envoyé par le serveur : le contenu s'affiche avant même le chargement du script.
async function pageFor(p: string): Promise<ReactElement> {
  if (p === '/mentions-legales' || p === '/confidentialite') {
    const m = await import('./components/LegalPages.tsx');
    return p === '/mentions-legales' ? <m.MentionsLegales /> : <m.Confidentialite />;
  }
  if (p === '/blog' || p.startsWith('/blog/')) {
    const [pages, data] = await Promise.all([import('./components/BlogPages.tsx'), import('./data/blog.ts')]);
    if (p === '/blog') return <pages.BlogIndex />;
    const post = data.getPost(p.slice('/blog/'.length));
    return post ? <pages.BlogArticle post={post} /> : <pages.BlogNotFound />;
  }
  if (p === '/estimation-immobiliere' || p.startsWith('/estimation-immobiliere/')) {
    const [pages, areas] = await Promise.all([import('./components/AreaPages.tsx'), import('./data/areas.ts')]);
    if (p === '/estimation-immobiliere') return <pages.AreaHub />;
    const area = areas.getArea(p.slice('/estimation-immobiliere/'.length));
    if (!area) return <pages.AreaHub />;
    let stats = null;
    try {
      stats = JSON.parse(document.getElementById('area-data')?.textContent || 'null')?.stats ?? null;
    } catch {
      /* page rendue sans données */
    }
    return <pages.AreaPage area={area} stats={stats} />;
  }
  return <App />;
}

pageFor(path).then((page) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {page}
      <ConsentBanner />
    </StrictMode>,
  );
});
