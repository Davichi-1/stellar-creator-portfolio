import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { parseVideoUrl, isAllowedEmbedSrc } from '@/lib/rich-text/video-embed';
import { sanitizeRichText, richTextToPlainText, hasRichTextContent } from '@/lib/rich-text/sanitize';
import { VideoEmbed } from '@/lib/rich-text/video-embed-extension';
import { RichTextContent } from '@/components/ui/rich-text';

const LOOM_ID = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

describe('parseVideoUrl', () => {
  it('normalises the common YouTube URL shapes to a nocookie embed', () => {
    const expected = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10s',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      expect(parseVideoUrl(url)?.embedUrl).toBe(expected);
    }
  });

  it('converts Loom share links to embed links', () => {
    expect(parseVideoUrl(`https://www.loom.com/share/${LOOM_ID}`)).toEqual({
      provider: 'loom',
      id: LOOM_ID,
      embedUrl: `https://www.loom.com/embed/${LOOM_ID}`,
    });
  });

  it('rejects look-alike hosts, bad ids and non-http protocols', () => {
    expect(parseVideoUrl('https://evil.example/watch?v=dQw4w9WgXcQ&u=youtube.com')).toBeNull();
    expect(parseVideoUrl('https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(parseVideoUrl('https://www.youtube.com/watch?v=short')).toBeNull();
    expect(parseVideoUrl('javascript:alert(1)')).toBeNull();
    expect(parseVideoUrl('not a url')).toBeNull();
  });

  it('only allows canonical embed sources', () => {
    expect(isAllowedEmbedSrc('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ')).toBe(true);
    expect(isAllowedEmbedSrc(`https://www.loom.com/embed/${LOOM_ID}`)).toBe(true);
    expect(isAllowedEmbedSrc('https://evil.example/embed/dQw4w9WgXcQ')).toBe(false);
    expect(isAllowedEmbedSrc('https://www.youtube.com/embed/../../evil')).toBe(false);
    expect(isAllowedEmbedSrc(null)).toBe(false);
  });
});

describe('sanitizeRichText', () => {
  it('strips scripts and inline event handlers but keeps formatting', () => {
    const html = sanitizeRichText('<h2>Title</h2><p onclick="x()">Hi <strong>there</strong></p><script>alert(1)</script>');
    expect(html).toContain('<h2>Title</h2>');
    expect(html).toContain('<strong>there</strong>');
    expect(html).not.toContain('script');
    expect(html).not.toContain('onclick');
  });

  it('keeps allow-listed video iframes and drops every other iframe', () => {
    const good = '<div data-video-embed="youtube"><iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe></div>';
    const bad = '<iframe src="https://evil.example/phish"></iframe><iframe src="javascript:alert(1)"></iframe>';
    const out = sanitizeRichText(good + bad);
    expect(out).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    expect(out).not.toContain('evil.example');
    expect(out).not.toContain('javascript:');
    expect(out.match(/<iframe/g)).toHaveLength(1);
  });

  it('reports visible text so empty editor output can be rejected', () => {
    expect(richTextToPlainText('<p></p>')).toBe('');
    expect(richTextToPlainText('<p>Hello <em>world</em></p>')).toBe('Hello world');
    expect(richTextToPlainText('<p>A &amp; B</p>')).toBe('A & B');
    expect(hasRichTextContent('<p></p>')).toBe(false);
    expect(hasRichTextContent('<p>Details</p>')).toBe(true);
    expect(hasRichTextContent('<div data-video-embed="youtube"></div>')).toBe(true);
  });
});

describe('VideoEmbed TipTap extension', () => {
  const createEditor = (content = '') =>
    new Editor({ extensions: [StarterKit, VideoEmbed], content });

  it('inserts a supported URL and serialises to sanitizer-safe HTML', () => {
    const editor = createEditor('<p>Intro</p>');
    expect(editor.commands.setVideoEmbed({ url: 'https://youtu.be/dQw4w9WgXcQ' })).toBe(true);
    const html = editor.getHTML();
    expect(html).toContain('data-video-embed="youtube"');
    expect(sanitizeRichText(html)).toContain('youtube-nocookie.com/embed/dQw4w9WgXcQ');
    editor.destroy();
  });

  it('refuses unsupported URLs', () => {
    const editor = createEditor();
    expect(editor.commands.setVideoEmbed({ url: 'https://vimeo.com/12345' })).toBe(false);
    expect(editor.getHTML()).not.toContain('iframe');
    editor.destroy();
  });

  it('round-trips stored HTML back into an embed node', () => {
    const stored = `<div data-video-embed="loom"><iframe src="https://www.loom.com/embed/${LOOM_ID}"></iframe></div>`;
    const editor = createEditor(stored);
    expect(editor.getHTML()).toContain(`https://www.loom.com/embed/${LOOM_ID}`);
    editor.destroy();
  });
});

describe('RichTextContent', () => {
  it('renders stored HTML without unsafe markup', () => {
    const { container } = render(
      <RichTextContent html={'<p>Case study</p><img src=x onerror="alert(1)"><iframe src="https://evil.example"></iframe>'} />,
    );
    expect(container.textContent).toContain('Case study');
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
  });
});
