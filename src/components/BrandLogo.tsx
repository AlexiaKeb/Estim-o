import React from 'react';
import { Building2 } from 'lucide-react';
import { BRAND } from '../data/siteContent';

/** Logo + nom + sous-titre : identique à celui de la page d'accueil, utilisé sur les pages secondaires (rendu aussi côté serveur). */
export const BrandLogo: React.FC = () => (
  <a href="/" className="flex items-center gap-2.5 select-none" aria-label={`${BRAND.name} : retour à l'accueil`}>
    <span className="w-9 h-9 rounded-xl bg-stone-900 text-stone-100 flex items-center justify-center shadow-xs">
      <Building2 className="w-[18px] h-[18px]" />
    </span>
    <span>
      <span className="block text-sm font-bold text-stone-900 tracking-tight leading-tight">{BRAND.name}</span>
      <span className="hidden sm:block text-[11px] text-stone-500 leading-tight">{BRAND.tagline}</span>
    </span>
  </a>
);
