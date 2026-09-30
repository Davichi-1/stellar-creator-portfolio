'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useState } from 'react';
import { sanitizeRichText } from '@/lib/rich-text/sanitize';
import { VideoEmbed } from '@/lib/rich-text/video-embed-extension';
import { parseVideoUrl } from '@/lib/rich-text/video-embed';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function RichTextEditor({ value = '', onChange, placeholder = 'Write project details...', className }: RichTextEditorProps) {
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedError, setEmbedError] = useState<string | null>(null);

  const editor = useEditor({
    // Avoid SSR/client markup mismatch in the App Router.
    immediatelyRender: false,
    extensions: [
      StarterKit,
      VideoEmbed,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange?.(sanitizeRichText(editor.getHTML()));
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none min-h-[160px] px-3 py-2 focus:outline-none',
      },
    },
  });

  if (!editor) return null;

  const btn = (action: () => boolean, label: string, active?: boolean) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); action(); }}
      aria-label={label}
      className={`px-2 py-1 text-xs rounded hover:bg-muted transition-colors ${active ? 'bg-muted font-bold' : ''}`}
    >
      {label}
    </button>
  );

  return (
    <div className={`border border-input rounded-md bg-background overflow-hidden ${className ?? ''}`}>
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 border-b border-input px-2 py-1.5 bg-muted/30">
        {btn(() => editor.chain().focus().toggleBold().run(), 'B', editor.isActive('bold'))}
        {btn(() => editor.chain().focus().toggleItalic().run(), 'I', editor.isActive('italic'))}
        {btn(() => editor.chain().focus().toggleStrike().run(), 'S̶', editor.isActive('strike'))}
        <span className="w-px bg-border mx-1" />
        {btn(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 'H2', editor.isActive('heading', { level: 2 }))}
        {btn(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 'H3', editor.isActive('heading', { level: 3 }))}
        <span className="w-px bg-border mx-1" />
        {btn(() => editor.chain().focus().toggleBulletList().run(), '• List', editor.isActive('bulletList'))}
        {btn(() => editor.chain().focus().toggleOrderedList().run(), '1. List', editor.isActive('orderedList'))}
        <span className="w-px bg-border mx-1" />
        {btn(() => editor.chain().focus().toggleBlockquote().run(), '❝', editor.isActive('blockquote'))}
        {btn(() => editor.chain().focus().toggleCodeBlock().run(), '</>', editor.isActive('codeBlock'))}
        <span className="w-px bg-border mx-1" />
        <button
          type="button"
          aria-label="Insert link"
          onMouseDown={(e) => {
            e.preventDefault();
            const url = window.prompt('Enter URL');
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className={`px-2 py-1 text-xs rounded hover:bg-muted transition-colors ${editor.isActive('link') ? 'bg-muted font-bold' : ''}`}
        >
          🔗
        </button>
        <button
          type="button"
          aria-label="Insert YouTube/Loom embed"
          aria-expanded={embedOpen}
          onMouseDown={(e) => {
            e.preventDefault();
            setEmbedOpen((open) => !open);
            setEmbedError(null);
          }}
          className={`px-2 py-1 text-xs rounded hover:bg-muted transition-colors ${embedOpen ? 'bg-muted font-bold' : ''}`}
        >
          ▶ Embed
        </button>
      </div>
      {embedOpen && (
        <div className="flex flex-wrap items-center gap-2 border-b border-input px-2 py-1.5 bg-muted/20">
          <input
            type="url"
            value={embedUrl}
            onChange={(e) => { setEmbedUrl(e.target.value); setEmbedError(null); }}
            placeholder="Paste a YouTube or Loom link"
            aria-label="YouTube or Loom URL"
            className="min-w-0 flex-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            className="px-2 py-1 text-xs rounded bg-primary text-primary-foreground"
            onClick={() => {
              if (!parseVideoUrl(embedUrl) || !editor.chain().focus().setVideoEmbed({ url: embedUrl }).run()) {
                setEmbedError('Only YouTube and Loom links are supported.');
                return;
              }
              setEmbedUrl('');
              setEmbedOpen(false);
            }}
          >
            Insert
          </button>
          {embedError && <p role="alert" className="w-full text-xs text-destructive">{embedError}</p>}
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}

/** Read-only renderer for sanitized HTML stored from the editor */
export function RichTextContent({ html, className }: { html: string; className?: string }) {
  const clean = sanitizeRichText(html);
  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
