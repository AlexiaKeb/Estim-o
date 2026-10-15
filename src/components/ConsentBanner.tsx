import React, { useState } from 'react';
import { getConsent, setConsent, trackingConfigured } from '../utils/tracking';

/** Bandeau de consentement : n'apparaît que si un suivi publicitaire est configuré. Refuser est aussi simple qu'accepter. */
export const ConsentBanner: React.FC = () => {
  const [visible, setVisible] = useState(trackingConfigured && getConsent() === null);
  if (!visible) return null;
  const choose = (v: 'granted' | 'denied') => {
    setConsent(v);
    setVisible(false);
  };
  return (
    <div
      role="dialog"
      aria-label="Préférences de confidentialité"
      className="fixed bottom-0 inset-x-0 z-[45] p-3 sm:p-4"
    >
      <div className="max-w-3xl mx-auto bg-[#FFF7E6] border-[3px] border-[#0B0F1F] shadow-[6px_6px_0_#0B0F1F] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-stone-600 leading-relaxed flex-1">
          Avec votre accord, nous mesurons la fréquentation du site et l'efficacité de nos annonces Google (Google Analytics, cookies publicitaires). Aucun cookie
          n'est déposé sans votre choix.{' '}
          <a href="/confidentialite" className="underline text-stone-800">En savoir plus</a>
        </p>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => choose('denied')}
            className="px-4 py-2.5 rounded-xl border-[3px] border-[#0B0F1F] bg-white text-sm font-black text-[#0B0F1F] hover:bg-[#FFD60A]"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => choose('granted')}
            className="px-4 py-2.5 rounded-xl bg-stone-900 text-white text-sm font-semibold hover:bg-[#0B0F1F]"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
};
