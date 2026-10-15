/**
 * Inserts `text` where the cursor (or the selection) is in a textarea, not at the end.
 * `setValue` receives the new content; the cursor is placed right after the inserted text.
 */
export function insertAtCursor(el: HTMLTextAreaElement | null, text: string, current: string, setValue: (v: string) => void): void {
  if (!el) {
    setValue(current + text);
    return;
  }
  const start = el.selectionStart ?? current.length;
  const end = el.selectionEnd ?? start;
  setValue(current.slice(0, start) + text + current.slice(end));
  const caret = start + text.length;
  window.requestAnimationFrame(() => {
    el.focus();
    el.setSelectionRange(caret, caret);
  });
}
