import React from 'react';

/** Crédit de création très discret : renvoie vers le contact de la créatrice. */
export const CreditLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`text-[11px] text-stone-400 ${className}`}>
    App conçue par{' '}
    <a
      href="https://www.facebook.com/alexiakebir/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-stone-500 hover:text-stone-800 hover:underline underline-offset-2"
    >
      La Digitale School
    </a>
  </span>
);
