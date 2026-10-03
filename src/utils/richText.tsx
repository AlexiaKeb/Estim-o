import React from 'react';

/** Renders **bold** segments from chat messages as <strong>, everything else as plain text (no HTML injection). */
export function renderRichText(text: string): React.ReactNode[] {
  return String(text ?? '')
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .map((part, i) =>
      part.startsWith('**') && part.endsWith('**') && part.length > 4 ? (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      ) : (
        <React.Fragment key={i}>{part}</React.Fragment>
      ),
    );
}
