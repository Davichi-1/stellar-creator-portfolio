import DOMPurify from 'isomorphic-dompurify';
import { isAllowedEmbedSrc } from './video-embed';

let hooksInstalled = false;

function installHooks() {
  if (hooksInstalled) return;
  hooksInstalled = true;

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'IFRAME') {
      // Only the YouTube / Loom embed URLs produced by the editor survive.
      if (!isAllowedEmbedSrc(node.getAttribute('src'))) {
        node.parentNode?.removeChild(node);
        return;
      }
      node.setAttribute('loading', 'lazy');
      node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    }

    if (node.nodeName === 'A' && node.getAttribute('target')) {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}

/**
 * Sanitize HTML produced by (or destined for) the rich-text editor.
 *
 * Runs on both the client (before `onChange`) and the server (before the
 * project is persisted), so stored HTML never contains scripts, inline event
 * handlers, or iframes pointing anywhere except YouTube / Loom embeds.
 */
export function sanitizeRichText(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    ADD_ATTR: ['allowfullscreen', 'frameborder', 'target', 'title', 'loading', 'referrerpolicy'],
  });
}

/** Visible text of an HTML fragment; used to reject "empty" editor output. */
export function richTextToPlainText(html: string): string {
  const fragment = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: true,
  });
  return (fragment.textContent ?? '').trim();
}

/** True when the HTML has visible text or at least one video embed. */
export function hasRichTextContent(html: string): boolean {
  return richTextToPlainText(html).length > 0 || html.includes('data-video-embed');
}
