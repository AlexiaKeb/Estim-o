import React from 'react';
import { Instagram, Linkedin, Facebook } from 'lucide-react';
import { SOCIALS } from '../data/siteContent';
import { CreditLine } from './CreditLine';

// Pied de page commun à toutes les pages (aucun hook : rendu aussi côté serveur pour le référencement)
export const SiteFooter: React.FC<{ hideSocials?: boolean; extra?: React.ReactNode }> = ({ hideSocials, extra }) => (
  <>
    {!hideSocials && (
      <section id="footer-socials" aria-label="Réseaux sociaux de Céline" className="border-t-[3px] border-[#0B0F1F] bg-white">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center gap-4 px-4 py-6 sm:flex-row sm:gap-8 sm:px-6 lg:px-8">
          <p className="text-lg font-black text-[#0B0F1F]">Suivez Céline sur les réseaux</p>
          <div className="flex flex-wrap justify-center gap-3">
            {SOCIALS.map((s) => (
              <a
                key={s.id}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#0B0F1F] bg-[#FFD60A] px-4 py-2 text-sm font-black text-[#0B0F1F] shadow-[3px_3px_0_#0B0F1F] transition-transform hover:-translate-y-0.5"
              >
                {s.id === 'instagram' ? <Instagram className="h-5 w-5" /> : s.id === 'linkedin' ? <Linkedin className="h-5 w-5" /> : <Facebook className="h-5 w-5" />}
                {s.label}
                <span className="sr-only"> (s'ouvre dans un nouvel onglet)</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    )}

    <footer className="bg-[#0B0F1F] py-8 pb-24 sm:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4">
        <nav aria-label="Liens du site" className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/80">
          <a href="/estimation" className="font-bold text-[#FFD60A] underline-offset-2 hover:underline">Simulateur</a>
          <a href="/blog" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Conseils</a>
          <a href="/contact" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Contact</a>
          <a href="/honoraires" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Honoraires</a>
          <a href="/mentions-legales" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Mentions légales</a>
          <a href="/confidentialite" className="hover:text-[#FFD60A] underline-offset-2 hover:underline">Politique de confidentialité</a>
          {extra}
        </nav>
        <CreditLine />
      </div>
    </footer>
  </>
);
