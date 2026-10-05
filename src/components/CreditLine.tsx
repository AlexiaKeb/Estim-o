import React from 'react';

/** Crédit de création : renvoie vers la page de la créatrice, pour les agents d'autres villes qui voudraient le même outil. */
export const CreditLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <p className={`text-xs text-stone-500 ${className}`}>
    Site conçu par{' '}
    <a
      href="https://www.facebook.com/alexiakebir/"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-stone-700 underline underline-offset-2 hover:text-stone-900"
    >
      Alexia Kebir
    </a>
    {' '}· Agent immobilier dans une autre ville ? Je crée le même outil d'estimation pour vous.
  </p>
);
