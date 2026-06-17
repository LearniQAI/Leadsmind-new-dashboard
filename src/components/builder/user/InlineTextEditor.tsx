"use client";

import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';

interface InlineTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const InlineTextEditor = ({
  value,
  onChange,
  className = '',
  style = {}
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
      <EditorContent editor={editor} className="outline-none" />
    </div>
  );
};
