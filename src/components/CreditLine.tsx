import React from 'react';

/** Crédit de création très discret : renvoie vers le contact de la créatrice. */
export const CreditLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`text-[11px] text-slate-500 ${className}`}>
    App conçue par{' '}
    <a
      href="https://www.facebook.com/alexiakebir/"
      target="_blank"
      rel="noopener noreferrer"
      className="text-slate-400 hover:text-white hover:underline underline-offset-2"
    >
      La Digitale School
    </a>
  </span>
);
