import { Node, mergeAttributes } from '@tiptap/core';
import { isAllowedEmbedSrc, parseVideoUrl, providerFromEmbedSrc } from './video-embed';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    videoEmbed: {
      /** Insert a YouTube / Loom embed; returns false for unsupported URLs. */
      setVideoEmbed: (options: { url: string }) => ReturnType;
    };
  }
}

/**
 * Block node that renders a responsive YouTube / Loom iframe.
 *
 * Serialised as `<div data-video-embed="youtube"><iframe src="..."></div>` so
 * it round-trips through `editor.getHTML()` and the sanitizer allow-list.
 */
export const VideoEmbed = Node.create({
  name: 'videoEmbed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      provider: { default: 'youtube' },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-video-embed]',
        getAttrs: (element) => {
          const src = (element as HTMLElement).querySelector('iframe')?.getAttribute('src');
          if (!isAllowedEmbedSrc(src)) return false;
          return { src, provider: providerFromEmbedSrc(src as string) };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const { src, provider } = node.attrs as { src: string; provider: string };
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-video-embed': provider,
        class: 'video-embed my-4',
      }),
      [
        'iframe',
        {
          src,
          title: `${provider === 'loom' ? 'Loom' : 'YouTube'} video`,
          allowfullscreen: 'true',
          frameborder: '0',
          loading: 'lazy',
          class: 'w-full aspect-video rounded-md border border-input',
        },
      ],
    ];
  },

  addCommands() {
    return {
      setVideoEmbed:
        ({ url }) =>
        ({ commands }) => {
          const video = parseVideoUrl(url);
          if (!video) return false;
          return commands.insertContent({
            type: this.name,
            attrs: { src: video.embedUrl, provider: video.provider },
          });
        },
    };
  },
});
