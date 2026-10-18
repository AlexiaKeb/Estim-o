import {StrictMode} from 'react';
import type {ReactElement} from 'react';
import App from './App.tsx';
import {createRoot} from 'react-dom/client';
import './index.css';
import { ConsentBanner } from './components/ConsentBanner.tsx';
import { ChunkErrorBoundary } from './components/ChunkErrorBoundary.tsx';
import { initTracking } from './utils/tracking.ts';

initTracking();
const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();

// Les pages secondaires (blog, pages légales) sont chargées à la demande : la page d'accueil reste légère.
// Le blog est déjà dans le HTML envoyé par le serveur : le contenu s'affiche avant même le chargement du script.
async function pageFor(p: string): Promise<ReactElement> {
  if (p === '/mentions-legales' || p === '/confidentialite' || p === '/honoraires') {
    const m = await import('./components/LegalPages.tsx');
    return p === '/mentions-legales' ? <m.MentionsLegales /> : p === '/honoraires' ? <m.Honoraires /> : <m.Confidentialite />;
  }
  if (p === '/contact') {
    const m = await import('./components/BlogPages.tsx');
    return <m.ContactPage />;
  }
  if (p === '/faq') {
    const m = await import('./components/BlogPages.tsx');
    return <m.FaqPage />;
  }
  if (p === '/blog' || p.startsWith('/blog/')) {
    const [pages, data] = await Promise.all([import('./components/BlogPages.tsx'), import('./data/blog.ts')]);
    // The server sends the articles with the page (including those written in the dashboard)
    let served: any = null;
    try {
      served = JSON.parse(document.getElementById('blog-data')?.textContent || 'null');
    } catch {
      /* page sans données */
    }
    if (p === '/blog') return <pages.BlogIndex posts={served?.posts || data.BLOG_POSTS} />;
    const slug = p.slice('/blog/'.length);
    const post = served?.post?.slug === slug ? served.post : data.getPost(slug);
    return post ? <pages.BlogArticle post={post} all={[...(served?.related || []), ...data.BLOG_POSTS]} /> : <pages.BlogNotFound />;
  }
  return <App />;
}

pageFor(path).then((page) => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ChunkErrorBoundary>{page}</ChunkErrorBoundary>
      <ConsentBanner />
    </StrictMode>,
  );
});
