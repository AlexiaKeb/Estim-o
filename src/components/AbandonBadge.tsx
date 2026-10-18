import React from 'react';
import { AUTO_FOLLOWUP_STEP } from '../data/autoFollowup';

export const isAbandonStep = (step?: string | null) => step === AUTO_FOLLOWUP_STEP;

/** Red tag that sets the automatic "estimate without appointment" e-mail apart from every other message. */
export const AbandonBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center rounded-md border-2 border-[#B91C1C] bg-[#DC2626] px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white ${className}`}>Mail d'abandon</span>
);
