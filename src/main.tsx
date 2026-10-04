import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { MentionsLegales, Confidentialite } from './components/LegalPages.tsx';
import { ConsentBanner } from './components/ConsentBanner.tsx';
import { initTracking } from './utils/tracking.ts';

initTracking();
const path = window.location.pathname.replace(/\/+$/, '').toLowerCase();
const page =
  path === '/mentions-legales' ? <MentionsLegales /> : path === '/confidentialite' ? <Confidentialite /> : <App />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {page}
    <ConsentBanner />
  </StrictMode>,
);
