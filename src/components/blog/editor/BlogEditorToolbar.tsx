'use client';

import React from 'react';
import { type Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  Code2,
  Minus,
  Table as TableIcon,
  PlusSquare,
  MinusSquare,
  Trash2,
  Link2,
  ImageIcon,
  Tv,
  Undo2,
  Redo2,
  Strikethrough,
  Code,
  Eraser,
  Maximize2,
  Minimize2,
  Highlighter,
  Subscript,
  Superscript,
  AlertCircle,
  Columns,
  Sparkles
} from 'lucide-react';

interface ToolbarProps {
  editor: Editor | null;
  onOpenImageModal: () => void;
  onOpenEmbedModal: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenInlineAIPalette: () => void;
  onOpenLinkModal: () => void;
}

export const BlogEditorToolbar: React.FC<ToolbarProps> = ({
  editor,
  onOpenImageModal,
  onOpenEmbedModal,
  isFullscreen,
  onToggleFullscreen,
  onOpenInlineAIPalette,
  onOpenLinkModal
}) => {
  if (!editor) return null;

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // Custom inline markup helpers to prevent package bloat and ensure zero compile failures
  const applyHighlight = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    if (selectedText) {
      editor.chain().focus().insertContent(`<mark class="bg-amber-500/20 text-amber-300 px-1 rounded">${selectedText}</mark>`).run();
    } else {
      editor.chain().focus().insertContent('<mark class="bg-amber-500/20 text-amber-300 px-1 rounded">Highlighted Text</mark>').run();
    }
  };

  const applySubscript = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    editor.chain().focus().insertContent(`<sub>${selectedText || 'sub'}</sub>`).run();
  };

  const applySuperscript = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');
    editor.chain().focus().insertContent(`<sup>${selectedText || 'sup'}</sup>`).run();
  };

  const insertCallout = () => {
    editor.chain().focus().insertContent(
      `<div class="p-4 rounded-xl border bg-blue-500/10 border-blue-500/20 text-blue-300 my-4 flex gap-3 items-start">
        <span class="text-lg">ℹ️</span>
        <div><strong>Info Alert:</strong> Place callout or focus information here...</div>
      </div>`
    ).run();
  };

  const insertColumns = () => {
    editor.chain().focus().insertContent(
      `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
        <div class="border border-dashed border-white/10 p-4 rounded-xl bg-white/5 text-white/70">Left Column block...</div>
        <div class="border border-dashed border-white/10 p-4 rounded-xl bg-white/5 text-white/70">Right Column block...</div>
      </div>`
    ).run();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0a0f26]/95 backdrop-blur-md sticky top-0 z-40 border-b border-white/10 rounded-t-xl select-none">
      
      {/* Action Control Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Undo/Redo Group */}
        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded transition text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded transition text-white/50 hover:bg-white/5 hover:text-white disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Headings Group */}
        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
          {([1, 2, 3, 4] as const).map(l => (
            <button
              key={l}
              onClick={() => editor.chain().focus().toggleHeading({ level: l }).run()}
              className={`p-1.5 rounded transition-all text-xs font-bold ${
                editor.isActive('heading', { level: l })
                  ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]'
                  : 'text-white/60 hover:bg-white/5 hover:text-white'
              }`}
              title={`Heading ${l}`}
            >
              {l === 1 ? <Heading1 className="w-3.5 h-3.5" /> : l === 2 ? <Heading2 className="w-3.5 h-3.5" /> : l === 3 ? <Heading3 className="w-3.5 h-3.5" /> : <Heading4 className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* Inline Formatting Group */}
        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('bold') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('italic') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('underline') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Underline"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('strike') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('code') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="p-1.5 rounded text-white/50 hover:bg-white/5 hover:text-rose-400 transition"
            title="Clear Formatting"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Advanced Typography Additions */}
        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            onClick={applyHighlight}
            className="p-1.5 rounded transition-all text-white/60 hover:bg-amber-500/10 hover:text-amber-400"
            title="Text Highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={applySubscript}
            className="p-1.5 rounded transition-all text-white/60 hover:bg-white/5 hover:text-white"
            title="Subscript"
          >
            <Subscript className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={applySuperscript}
            className="p-1.5 rounded transition-all text-white/60 hover:bg-white/5 hover:text-white"
            title="Superscript"
          >
            <Superscript className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Structural Blocks Group */}
        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('bulletList') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('orderedList') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Ordered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('blockquote') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded transition-all ${editor.isActive('codeBlock') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Code Block"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded text-white/60 hover:bg-white/5 hover:text-white transition"
            title="Divider Line"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Specialized Container Insertions */}
        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            onClick={insertCallout}
            className="p-1.5 rounded text-white/60 hover:bg-white/5 hover:text-blue-400 transition"
            title="Insert Alert Banner/Callout"
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={insertColumns}
            className="p-1.5 rounded text-white/60 hover:bg-white/5 hover:text-purple-400 transition"
            title="Split Layout Columns"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Media & Insertions Group */}
        <div className="flex items-center gap-0.5 bg-white/5 p-1 rounded-lg border border-white/5">
          <button
            onClick={onOpenLinkModal}
            className={`p-1.5 rounded transition-all ${editor.isActive('link') ? 'bg-primary text-white shadow-[0_0_10px_rgba(59,130,246,0.4)]' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Hyperlink"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenImageModal}
            className="p-1.5 rounded text-white/60 hover:bg-white/5 hover:text-white transition"
            title="WebP Graphic"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenEmbedModal}
            className="p-1.5 rounded text-white/60 hover:bg-white/5 hover:text-white transition"
            title="Responsive Video Embed"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={addTable}
            className={`p-1.5 rounded transition ${editor.isActive('table') ? 'bg-primary/20 text-primary border border-primary/20' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
            title="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tables Action Pills */}
        {editor.isActive('table') && (
          <div className="flex items-center gap-0.5 bg-emerald-500/5 p-1 rounded-lg border border-emerald-500/10">
            <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition" title="Add Column"><PlusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 rounded text-emerald-400 hover:bg-emerald-500/10 transition rotate-90" title="Add Row"><PlusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 transition" title="Delete Column"><MinusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 rounded text-rose-400 hover:bg-rose-500/10 transition rotate-90" title="Delete Row"><MinusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 rounded text-rose-500 hover:bg-rose-500/10 transition" title="Delete Table"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Right Tools Group */}
      <div className="flex items-center gap-2">
        {/* Inline AI Engine Trigger */}
        <button
          onClick={onOpenInlineAIPalette}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border border-violet-500/30 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-[0_0_15px_rgba(124,58,237,0.3)] transition flex items-center gap-1.5 shrink-0"
          title="Ask LeadsMind Copilot"
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>AI Assist</span>
        </button>

        <span className="w-[1px] h-5 bg-white/10" />

        {/* Fullscreen Trigger */}
        <button
          onClick={onToggleFullscreen}
          className="bg-white/5 border border-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg text-xs font-bold text-white/70 hover:text-white transition flex items-center gap-1.5 shrink-0"
          title="Zen Focus Mode"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit Focus</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus Mode</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
export default BlogEditorToolbar;
