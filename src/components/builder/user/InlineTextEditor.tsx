"use client";

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { List, ListOrdered } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InlineTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
  /**
   * A structural change (the BubbleMenu list-toggle buttons) commits to the Craft node store
   * immediately, bypassing onChange's own throttle. `onChange` throttles every keystroke into
   * one undo step (existing behaviour, untouched); a deliberate one-off button click is already
   * a single discrete action and has no reason to lag — and the properties panel (a separate
   * React tree, reading the same node's props) needs the committed value right away to show
   * the right active state, the same way every other panel control already does.
   */
  onImmediateChange?: (val: string) => void;
  /**
   * Paragraph-only opt-in (Bullet/Numbered list support). StarterKit already bundles the
   * BulletList / OrderedList / ListItem / ListKeymap extensions for every caller of this shared
   * editor (Heading, Navbar, Footer, Text, Paragraph) — Enter/Tab/Shift-Tab/Backspace list editing
   * already works everywhere. This flag only controls whether the selection toolbar that lets a
   * user actually TURN text into a list is shown. Left false (the default) every other caller is
   * pixel-for-pixel unchanged.
   */
  enableListToolbar?: boolean;
}

export const InlineTextEditor = ({
  value,
  onChange,
  className = '',
  style = {},
  enableListToolbar = false,
  onImmediateChange,
}: InlineTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: 'outline-none focus:outline-none w-full h-full border-none bg-transparent m-0 p-0',
      }
    }
  });

  // Sync content if props change from outer scope (e.g. undo/redo)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={`w-full h-full ${className}`} style={style}>
      {enableListToolbar && (
        // Standard rich-text-editor pattern: a small floating toolbar over a non-empty text
        // selection. No such toolbar exists elsewhere in this builder to extend, so this is new —
        // styled to match the app's existing floating-surface language (white, bordered, shadowed;
        // same treatment as DropdownMenuContent / TooltipContent).
        <BubbleMenu
          editor={editor}
          options={{ placement: 'top', offset: 8 }}
          shouldShow={({ state }) => !state.selection.empty}
        >
          <div className="flex items-center gap-0.5 rounded-lg border border-dash-border bg-white p-1 shadow-xl">
            <button
              type="button"
              aria-label="Bullet list"
              aria-pressed={editor.isActive('bulletList')}
              onMouseDown={(e) => e.preventDefault()} // keep the text selection while clicking
              onClick={() => { editor.chain().focus().toggleBulletList().run(); onImmediateChange?.(editor.getHTML()); }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                editor.isActive('bulletList') ? 'bg-dash-accent/10 text-dash-accent' : 'text-dash-textMuted hover:bg-dash-surface hover:text-dash-text'
              )}
            >
              <List size={15} />
            </button>
            <button
              type="button"
              aria-label="Numbered list"
              aria-pressed={editor.isActive('orderedList')}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { editor.chain().focus().toggleOrderedList().run(); onImmediateChange?.(editor.getHTML()); }}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
                editor.isActive('orderedList') ? 'bg-dash-accent/10 text-dash-accent' : 'text-dash-textMuted hover:bg-dash-surface hover:text-dash-text'
              )}
            >
              <ListOrdered size={15} />
            </button>
          </div>
        </BubbleMenu>
      )}
      <EditorContent editor={editor} className="outline-none" />
    </div>
  );
};
