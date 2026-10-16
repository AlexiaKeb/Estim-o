import React from 'react';

/** Crédit de création très discret : renvoie vers le contact de la créatrice. */
export const CreditLine: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`whitespace-nowrap text-[11px] text-white/60 ${className}`}>
    App conçue par{' '}
    <a
      href="https://www.facebook.com/alexiakebir/"
      target="_blank"
      rel="noopener noreferrer"
      className="whitespace-nowrap text-white/80 hover:text-[#FFD60A] hover:underline underline-offset-2"
    >
      La Digitale School
    </a>
  </span>
);
