// Rich text for e-mails, shared by the editor (browser) and the sender (server). No DOM needed.
// The editor produces a small safe subset of HTML; the server sanitises it again before sending.


export const htmlEscape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** True when a message was written with the editor (otherwise it is an older plain-text message). */
export const isHtmlBody = (s: string) => /<(p|br|strong|b|em|i|u|a|ul|ol|li|h2|div)(\s[^>]*)?\/?>/i.test(s);

/** Plain text -> HTML paragraphs (blank line = new paragraph, line break kept). */
export function plainToHtml(text: string): string {
  const t = (text || '').trim();
  if (!t) return '';
  return t
    .split(/\n{2,}/)
    .map((p) => `<p>${htmlEscape(p).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

const safeHref = (raw: string): string | null => {
  const href = raw.trim().replace(/&amp;/g, '&');
  return /^(https?:\/\/|mailto:|tel:)[^\s"'<>]+$/i.test(href) ? href : null;
};

/** Keeps only: p, br, strong, em, u, ul, ol, li, h2, a[href=https|mailto|tel]. Everything else is removed (its text stays). */
export function sanitizeEmailHtml(input: string): string {
  let html = (input || '')
    .replace(/<(script|style|iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  html = html.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (_m, close: string, rawName: string, attrs: string) => {
    let name = rawName.toLowerCase();
    if (name === 'b') name = 'strong';
    if (name === 'i') name = 'em';
    if (name === 'div') name = 'p';
    if (name === 'h1' || name === 'h3') name = 'h2';
    if (!['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h2', 'a'].includes(name)) return '';
    if (name === 'br') return close ? '' : '<br>';
    if (close) return `</${name}>`;
    if (name === 'a') {
      const m = attrs.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
      const href = m ? safeHref(m[2] ?? m[3] ?? m[4] ?? '') : null;
      return href ? `<a href="${htmlEscape(href)}">` : '<a>';
    }
    return `<${name}>`;
  });
  // A lone "<" that is not a tag must not become one
  html = html.replace(/<(?![/a-zA-Z])/g, '&lt;');
  // Lists and titles must not sit inside a paragraph
  html = html.replace(/<p>\s*(<(?:ul|ol|h2)>)/g, '$1').replace(/(<\/(?:ul|ol|h2)>)\s*<\/p>/g, '$1');
  // Empty links (unsafe href) become plain text
  html = html.replace(/<a>([\s\S]*?)<\/a>/g, '$1');
  // Contenteditable leaves empty paragraphs behind: keep at most the spacing a human wants
  html = html.replace(/<p>\s*<\/p>/g, '<p><br></p>');
  return html.trim();
}

const decode = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

/** Readable plain-text version (for the text part of the e-mail and for length checks). */
export function htmlToText(html: string): string {
  const withLinks = html.replace(/<a href="([^"]*)">([\s\S]*?)<\/a>/g, (_m, href: string, label: string) => {
    const l = label.replace(/<[^>]+>/g, '').trim();
    const h = decode(href);
    return !l || l === h ? h : `${l} (${h})`;
  });
  return decode(
    withLinks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|h2)>/gi, '\n\n')
      .replace(/<li>/gi, '• ')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/(ul|ol)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Length of the visible text, whatever the format (used to refuse empty messages). */
export const emailTextLength = (body: string) => (isHtmlBody(body) ? htmlToText(body) : body).trim().length;
