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
  Sparkles,
  Eye,
  EyeOff
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  editor: Editor | null;
  onOpenImageModal: () => void;
  onOpenEmbedModal: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenInlineAIPalette: () => void;
  onOpenLinkModal: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
}

export const BlogEditorToolbar: React.FC<ToolbarProps> = ({
  editor,
  onOpenImageModal,
  onOpenEmbedModal,
  isFullscreen,
  onToggleFullscreen,
  onOpenInlineAIPalette,
  onOpenLinkModal,
  isZenMode,
  onToggleZenMode
}) => {
  if (!editor) return null;

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  // Custom inline markup helpers to prevent package bloat and ensure zero compile failures.
  // NOTE: these insert HTML directly into the published post body (rendered
  // on the public blog page, a separate out-of-scope surface from this
  // dashboard editor chrome) — their embedded classes are intentionally left
  // matching that surface's existing styling, not converted to dash tokens.
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

  const groupClass = "flex items-center gap-0.5 bg-dash-surface p-1 rounded-lg border border-dash-border";
  const btnClass = "p-1.5 rounded transition-colors motion-reduce:transition-none";
  const activeBtnClass = (isActive: boolean) =>
    cn(btnClass, isActive ? 'bg-dash-accent text-white' : '!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text');

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b border-dash-border rounded-t-xl select-none">

      {/* Action Control Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Undo/Redo Group */}
        <div className={groupClass}>
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text disabled:opacity-30")}
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text disabled:opacity-30")}
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Headings Group */}
        <div className={groupClass}>
          {([1, 2, 3, 4] as const).map(l => (
            <button
              key={l}
              onClick={() => editor.chain().focus().toggleHeading({ level: l }).run()}
              className={cn(activeBtnClass(editor.isActive('heading', { level: l })), "text-xs font-bold")}
              title={`Heading ${l}`}
            >
              {l === 1 ? <Heading1 className="w-3.5 h-3.5" /> : l === 2 ? <Heading2 className="w-3.5 h-3.5" /> : l === 3 ? <Heading3 className="w-3.5 h-3.5" /> : <Heading4 className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>

        {/* Inline Formatting Group */}
        <div className={groupClass}>
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={activeBtnClass(editor.isActive('bold'))}
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={activeBtnClass(editor.isActive('italic'))}
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={activeBtnClass(editor.isActive('underline'))}
            title="Underline"
          >
            <UnderlineIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={activeBtnClass(editor.isActive('strike'))}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={activeBtnClass(editor.isActive('code'))}
            title="Inline Code"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:text-red")}
            title="Clear Formatting"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Advanced Typography Additions */}
        <div className={groupClass}>
          <button
            onClick={applyHighlight}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-amber-50 hover:text-amber-600")}
            title="Text Highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={applySubscript}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text")}
            title="Subscript"
          >
            <Subscript className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={applySuperscript}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text")}
            title="Superscript"
          >
            <Superscript className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Structural Blocks Group */}
        <div className={groupClass}>
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={activeBtnClass(editor.isActive('bulletList'))}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={activeBtnClass(editor.isActive('orderedList'))}
            title="Ordered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={activeBtnClass(editor.isActive('blockquote'))}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={activeBtnClass(editor.isActive('codeBlock'))}
            title="Code Block"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text")}
            title="Divider Line"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Specialized Container Insertions */}
        <div className={groupClass}>
          <button
            onClick={insertCallout}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:text-dash-accent")}
            title="Insert Alert Banner/Callout"
          >
            <AlertCircle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={insertColumns}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:text-purple-600")}
            title="Split Layout Columns"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Media & Insertions Group */}
        <div className={groupClass}>
          <button
            onClick={onOpenLinkModal}
            className={activeBtnClass(editor.isActive('link'))}
            title="Hyperlink"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenImageModal}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text")}
            title="WebP Graphic"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onOpenEmbedModal}
            className={cn(btnClass, "!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text")}
            title="Responsive Video Embed"
          >
            <Tv className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={addTable}
            className={cn(
              btnClass,
              editor.isActive('table') ? 'bg-dash-accent/20 text-dash-accent border border-dash-accent/20' : '!text-dash-textMuted hover:bg-dash-border/40 hover:!text-dash-text'
            )}
            title="Insert Table"
          >
            <TableIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tables Action Pills */}
        {editor.isActive('table') && (
          <div className="flex items-center gap-0.5 bg-green/5 p-1 rounded-lg border border-green/10">
            <button onClick={() => editor.chain().focus().addColumnAfter().run()} className="p-1.5 rounded text-green hover:bg-green/10 transition-colors motion-reduce:transition-none" title="Add Column"><PlusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().addRowAfter().run()} className="p-1.5 rounded text-green hover:bg-green/10 transition-colors motion-reduce:transition-none rotate-90" title="Add Row"><PlusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().deleteColumn().run()} className="p-1.5 rounded text-red hover:bg-red/10 transition-colors motion-reduce:transition-none" title="Delete Column"><MinusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().deleteRow().run()} className="p-1.5 rounded text-red hover:bg-red/10 transition-colors motion-reduce:transition-none rotate-90" title="Delete Row"><MinusSquare className="w-3.5 h-3.5" /></button>
            <button onClick={() => editor.chain().focus().deleteTable().run()} className="p-1.5 rounded text-red hover:bg-red/10 transition-colors motion-reduce:transition-none" title="Delete Table"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {/* Right Tools Group */}
      <div className="flex items-center gap-2">
        {/* Inline AI Engine Trigger */}
        <button
          onClick={onOpenInlineAIPalette}
          className="bg-purple-600 hover:bg-purple-700 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-colors motion-reduce:transition-none flex items-center gap-1.5 shrink-0"
          title="Ask LeadsMind Copilot"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI assist</span>
        </button>

        <span className="w-[1px] h-5 bg-dash-border" />

        {/* Zen Mode Trigger */}
        <button
          onClick={onToggleZenMode}
          className={cn(
            "border px-3 py-1.5 rounded-lg text-xs font-bold transition-colors motion-reduce:transition-none flex items-center gap-1.5 shrink-0",
            isZenMode
              ? 'bg-dash-accent border-dash-accent text-white'
              : 'bg-dash-surface border-dash-border !text-dash-textMuted hover:!text-dash-text'
          )}
          title="Toggle Zen Focus Mode"
        >
          {isZenMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          <span>{isZenMode ? 'Exit zen' : 'Zen mode'}</span>
        </button>

        <span className="w-[1px] h-5 bg-dash-border" />

        {/* Fullscreen Trigger */}
        <button
          onClick={onToggleFullscreen}
          className="bg-dash-surface border border-dash-border hover:bg-dash-border/40 px-3 py-1.5 rounded-lg text-xs font-bold !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none flex items-center gap-1.5 shrink-0"
          title="Focus Mode"
        >
          {isFullscreen ? (
            <>
              <Minimize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exit focus</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus mode</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
export default BlogEditorToolbar;
