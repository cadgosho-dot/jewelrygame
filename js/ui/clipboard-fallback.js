// DOM-only fallback used when the modern Clipboard API is unavailable or denied.
// Copy decisions, user feedback and game state remain owned by app.js.
export function fallbackCopyText(text, { documentRef = globalThis.document } = {}) {
  if (!documentRef || typeof documentRef.createElement !== 'function' || !documentRef.body?.appendChild) {
    throw new TypeError('documentRef with body/createElement is required');
  }

  const textarea = documentRef.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  textarea.style.top = '0';
  documentRef.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try { copied = documentRef.execCommand('copy'); } catch (_) { copied = false; }
  textarea.remove();
  return copied;
}
