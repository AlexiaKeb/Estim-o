import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, Link2, Heading2, Eraser } from 'lucide-react';
import { isHtmlBody, plainToHtml, sanitizeEmailHtml } from '../utils/emailHtml';

export interface RichEmailEditorHandle {
  /** Inserts text (e.g. {Prénom}) at the cursor. */
  insertText: (text: string) => void;
}

interface Props {
  id: string;
  value: string;
  onChange: (html: string) => void;
  ariaLabel?: string;
}

const toHtml = (v: string) => (isHtmlBody(v) ? sanitizeEmailHtml(v) : plainToHtml(v));

/** A small text editor for e-mails: bold, italic, underline, title, lists, link. Stores clean, simple HTML. */
export const RichEmailEditor = forwardRef<RichEmailEditorHandle, Props>(({ id, value, onChange, ariaLabel }, ref) => {
  const el = useRef<HTMLDivElement>(null);
  const lastEmitted = useRef<string | null>(null);

  // Load the content when it changes from outside (another template, another step), never while typing
  useEffect(() => {
    if (!el.current || value === lastEmitted.current) return;
    el.current.innerHTML = toHtml(value);
    lastEmitted.current = value;
  }, [value]);

  useEffect(() => {
    try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch { /* ignoré */ }
  }, []);

  const emit = () => {
    if (!el.current) return;
    const html = sanitizeEmailHtml(el.current.innerHTML);
    lastEmitted.current = html;
    onChange(html);
  };

  const focusEditor = () => {
    const node = el.current;
    if (!node) return;
    const sel = window.getSelection();
    if (document.activeElement !== node || !sel || sel.rangeCount === 0 || !node.contains(sel.anchorNode)) {
      node.focus();
      const r = document.createRange();
      r.selectNodeContents(node);
      r.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(r);
    }
  };

  const run = (cmd: string, arg?: string) => {
    focusEditor();
    document.execCommand(cmd, false, arg);
    emit();
  };

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => run('insertText', text),
  }));

  const addLink = () => {
    focusEditor();
    const url = window.prompt('Adresse du lien (https://…, mailto:… ou tel:…) :', 'https://');
    if (!url) return;
    if (!/^(https?:\/\/|mailto:|tel:)\S+$/i.test(url.trim())) {
      window.alert("Adresse invalide : elle doit commencer par https://, mailto: ou tel:");
      return;
    }
    const sel = window.getSelection();
    if (sel && sel.isCollapsed) document.execCommand('insertHTML', false, `<a href="${url.trim().replace(/"/g, '')}">${url.trim().replace(/^(mailto:|tel:)/i, '')}</a>`);
    else document.execCommand('createLink', false, url.trim());
    emit();
  };

  const btn = 'flex h-9 w-9 items-center justify-center rounded-lg border-2 border-[#0B0F1F] bg-white text-[#0B0F1F] hover:bg-[#FFD60A] focus:outline-none focus-visible:ring-4 focus-visible:ring-[#2B4BFF]/40';
  const tool = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button key={label} type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick} className={btn}>
      {icon}
    </button>
  );

  return (
    <div className="overflow-hidden rounded-xl border-[3px] border-[#0B0F1F] bg-white focus-within:ring-4 focus-within:ring-[#FFD60A]">
      <div role="toolbar" aria-label="Mise en forme" className="flex flex-wrap items-center gap-1.5 border-b-[3px] border-[#0B0F1F] bg-[#FFF7E6] p-2">
        {tool('Gras', <Bold className="h-4 w-4" />, () => run('bold'))}
        {tool('Italique', <Italic className="h-4 w-4" />, () => run('italic'))}
        {tool('Souligné', <Underline className="h-4 w-4" />, () => run('underline'))}
        <span className="mx-1 h-6 w-px bg-[#0B0F1F]/30" aria-hidden="true" />
        {tool('Titre', <Heading2 className="h-4 w-4" />, () => run('formatBlock', 'h2'))}
        {tool('Liste à puces', <List className="h-4 w-4" />, () => run('insertUnorderedList'))}
        {tool('Liste numérotée', <ListOrdered className="h-4 w-4" />, () => run('insertOrderedList'))}
        {tool('Lien', <Link2 className="h-4 w-4" />, addLink)}
        <span className="mx-1 h-6 w-px bg-[#0B0F1F]/30" aria-hidden="true" />
        {tool('Effacer la mise en forme', <Eraser className="h-4 w-4" />, () => { run('removeFormat'); run('formatBlock', 'p'); run('unlink'); })}
      </div>
      <div
        id={id}
        ref={el}
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel || 'Message'}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        onInput={emit}
        onBlur={emit}
        onPaste={(e) => {
          e.preventDefault();
          const t = e.clipboardData.getData('text/plain');
          document.execCommand('insertText', false, t);
        }}
        className="rich-email min-h-[14rem] max-h-[28rem] overflow-y-auto px-4 py-3 text-base leading-relaxed text-[#0B0F1F] focus:outline-none"
      />
    </div>
  );
});
RichEmailEditor.displayName = 'RichEmailEditor';
