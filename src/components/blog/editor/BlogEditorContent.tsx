'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import Underline from '@tiptap/extension-underline';
import { IframeEmbed } from './IframeEmbed';
import { BlogEditorToolbar } from './BlogEditorToolbar';
import { inlineAiEdit } from '@/app/actions/blogStudio';
import {
  Sparkles, Bold, Italic, Underline as UnderlineIcon, Link2, Trash2,
  ArrowUp, ArrowDown, Copy, Check, Info, AlertTriangle, AlertCircle,
  HelpCircle, FileText, ChevronRight, Settings, MessageSquare
} from 'lucide-react';

interface EditorContentProps {
  content: string;
  onChange: (html: string, plain: string) => void;
  onOpenImageModal: () => void;
  onOpenEmbedModal: () => void;
  editorRef: React.MutableRefObject<any>;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const BlogEditorContent: React.FC<EditorContentProps> = ({
  content,
  onChange,
  onOpenImageModal,
  onOpenEmbedModal,
  editorRef,
  isZenMode = false,
  onToggleZenMode
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Hover block drag handles state
  const [hoveredBlock, setHoveredBlock] = useState<{ element: HTMLElement; top: number; id: string } | null>(null);
  const [showBlockMenu, setShowBlockMenu] = useState(false);

  // Slash commands menu state
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashPosition, setSlashPosition] = useState({ x: 0, y: 0 });

  // Floating selection bubble bar state
  const [showBubbleBar, setShowBubbleBar] = useState(false);
  const [bubblePosition, setBubblePosition] = useState({ x: 0, y: 0 });
  const [selectedText, setSelectedText] = useState('');

  // Floating AI Copilot palette state
  const [showAiPalette, setShowAiPalette] = useState(false);
  const [aiPosition, setAiPosition] = useState({ x: 0, y: 0 });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiCustomPrompt, setAiCustomPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  // Link Modal States
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');

  // Image Modal States
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [directImageUrl, setDirectImageUrl] = useState('');
  const [directImageAlt, setDirectImageAlt] = useState('');

  // SEO Audit panel state
  const [showSeoPanel, setShowSeoPanel] = useState(false);
  const [targetKeyword, setTargetKeyword] = useState('optimised');

  // Inline Pinned Comments State
  const [comments, setComments] = useState<{ id: string; blockId: string; text: string }[]>([]);
  const [newComment, setNewComment] = useState('');
  const [activeCommentBlockId, setActiveCommentBlockId] = useState<string | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-primary hover:underline cursor-pointer' } }),
      Image.configure({ HTMLAttributes: { class: 'rounded-xl max-w-full my-6 border border-white/10 mx-auto block shadow-lg transition-all duration-300' } }),
      Table.configure({ resizable: true, HTMLAttributes: { class: 'border-collapse table-auto w-full my-6 border border-white/10 text-xs rounded-xl overflow-hidden' } }),
      TableRow,
      TableHeader.configure({ HTMLAttributes: { class: 'bg-[#0c1535] text-white border-b border-white/15 px-3 py-2 font-bold text-left' } }),
      TableCell.configure({ HTMLAttributes: { class: 'border border-white/10 px-3 py-2 bg-[#080f28]/60 text-white/90' } }),
      IframeEmbed,
    ],
    content: content || '<p>Write your amazing story here...</p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const plain = editor.getText();
      onChange(html, plain);
      const words = plain.split(/\s+/).filter(Boolean).length;
      setWordCount(words);
      setCharCount(plain.length);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[480px] p-8 focus:outline-none text-white/90 font-dm-sans leading-relaxed text-sm',
      },
      handleKeyDown: (view, event) => {
        if (event.key === '/') {
          const selection = view.state.selection;
          const $pos = selection.$from;
          // Only trigger slash commands menu at the beginning of empty paragraphs
          const isStartOfParagraph = $pos.parentOffset === 0;
          if (isStartOfParagraph) {
            setTimeout(() => {
              const currentSel = view.state.selection;
              const coords = view.coordsAtPos(currentSel.from);
              const container = editorContainerRef.current;
              if (container) {
                const containerRect = container.getBoundingClientRect();
                setSlashPosition({
                  x: coords.left - containerRect.left + container.scrollLeft,
                  y: coords.bottom - containerRect.top + container.scrollTop + 10
                });
                setShowSlashMenu(true);
              }
            }, 10);
          }
        } else if (event.key === 'Escape') {
          setShowSlashMenu(false);
          setShowAiPalette(false);
          setShowBubbleBar(false);
        }
        return false;
      }
    }
  });

  // selection highlight monitor and backspace slash monitor
  useEffect(() => {
    if (!editor) return;
    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      
      // Auto-close slash menu if slash character is deleted
      if (showSlashMenu) {
        const textBefore = editor.state.doc.textBetween(Math.max(0, from - 1), from);
        if (textBefore !== '/') {
          setShowSlashMenu(false);
        }
      }

      if (from !== to) {
        const text = editor.state.doc.textBetween(from, to, ' ');
        setSelectedText(text);
        const coords = editor.view.coordsAtPos(from);
        const toCoords = editor.view.coordsAtPos(to);
        const container = editorContainerRef.current;
        if (container) {
          const containerRect = container.getBoundingClientRect();
          setBubblePosition({
            x: (coords.left + toCoords.left) / 2 - containerRect.left + container.scrollLeft,
            y: coords.top - containerRect.top + container.scrollTop - 45
          });
          setShowBubbleBar(true);
        }
      } else {
        setShowBubbleBar(false);
      }
    };
    editor.on('selectionUpdate', updateSelection);
    return () => {
      editor.off('selectionUpdate', updateSelection);
    };
  }, [editor, showSlashMenu]);

  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      const plain = editor.getText();
      setWordCount(plain.split(/\s+/).filter(Boolean).length);
      setCharCount(plain.length);
    }
  }, [editor, editorRef, content]);

  // Hover block listener for Notion six-dot menu
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!editorContainerRef.current) return;
    const target = e.target as HTMLElement;
    const block = target.closest('p, h2, h3, h4, blockquote, pre, table, img');
    if (block) {
      const container = editorContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const blockRect = block.getBoundingClientRect();
      setHoveredBlock({
        element: block as HTMLElement,
        top: blockRect.top - containerRect.top + container.scrollTop + 4,
        id: block.innerHTML.substring(0, 30) || 'block'
      });
    }
  };

  // Block handlers
  const moveBlock = (direction: 'up' | 'down') => {
    if (!hoveredBlock || !editor) return;
    const el = hoveredBlock.element;
    if (direction === 'up' && el.previousElementSibling) {
      el.parentNode?.insertBefore(el, el.previousElementSibling);
    } else if (direction === 'down' && el.nextElementSibling) {
      el.parentNode?.insertBefore(el.nextElementSibling, el);
    }
    editor.commands.focus();
    onChange(editor.getHTML(), editor.getText());
    setShowBlockMenu(false);
  };

  const duplicateBlock = () => {
    if (!hoveredBlock || !editor) return;
    const clone = hoveredBlock.element.cloneNode(true) as HTMLElement;
    hoveredBlock.element.parentNode?.insertBefore(clone, hoveredBlock.element.nextSibling);
    onChange(editor.getHTML(), editor.getText());
    setShowBlockMenu(false);
  };

  const deleteBlock = () => {
    if (!hoveredBlock || !editor) return;
    hoveredBlock.element.remove();
    onChange(editor.getHTML(), editor.getText());
    setShowBlockMenu(false);
  };

  // Slash commands executors
  const executeSlashCommand = (type: string) => {
    if (!editor) return;
    const pos = editor.state.selection.from;
    editor.commands.deleteRange({ from: pos - 1, to: pos });
    
    if (type === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
    else if (type === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
    else if (type === 'table') editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    else if (type === 'callout') {
      editor.chain().focus().insertContent(
        `<div class="p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-300 my-4 flex gap-3 items-start">
          <span class="text-lg">✅</span>
          <div><strong>Success Callout:</strong> Complete your alert banner information here.</div>
        </div>`
      ).run();
    } else if (type === 'columns') {
      editor.chain().focus().insertContent(
        `<div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
          <div class="border border-dashed border-white/10 p-4 rounded-xl bg-[#080f28]">Left Grid column details...</div>
          <div class="border border-dashed border-white/10 p-4 rounded-xl bg-[#080f28]">Right Grid column details...</div>
        </div>`
      ).run();
    } else if (type === 'image') {
      setShowImageModal(true);
    }
    setShowSlashMenu(false);
  };

  // Inline AI Assistant execution
  const executeAiCopilot = async (action: 'elaborate' | 'condense' | 'tone-professional' | 'tone-casual' | 'tone-empathetic' | 'tone-analytical' | 'south-africanize' | 'continue') => {
    if (!editor) return;
    setAiLoading(true);
    setShowAiPalette(true);
    setAiResponse('');

    const targetText = action === 'continue' ? editor.getText().substring(Math.max(0, editor.getText().length - 1500)) : selectedText;
    const res = await inlineAiEdit({ text: targetText, action });
    
    setAiLoading(false);
    if (res.data) {
      setAiResponse(res.data);
      if (action === 'continue') {
        editor.chain().focus().insertContent(`<p>${res.data}</p>`).run();
      } else {
        editor.chain().focus().insertContent(res.data).run();
      }
    } else {
      setAiResponse(res.error || 'AI synthesis error occurred.');
    }
  };

  // Pinned comments handler
  const addComment = () => {
    if (!newComment || !activeCommentBlockId) return;
    setComments([...comments, { id: Math.random().toString(), blockId: activeCommentBlockId, text: newComment }]);
    setNewComment('');
  };

  // SEO calculators
  const plainText = editor?.getText() || '';
  const kwMatches = plainText.toLowerCase().split(targetKeyword.toLowerCase()).length - 1;
  const kwDensity = wordCount > 0 ? ((kwMatches / wordCount) * 100).toFixed(1) : '0.0';
  
  // Heading hierarchy check
  const htmlPayload = editor?.getHTML() || '';
  const headingOrder: number[] = [];
  const matches = htmlPayload.matchAll(/<h([1-4])>/g);
  for (const m of matches) {
    headingOrder.push(parseInt(m[1]));
  }
  let headingIssue = false;
  for (let i = 0; i < headingOrder.length - 1; i++) {
    if (headingOrder[i + 1] - headingOrder[i] > 1) {
      headingIssue = true;
    }
  }

  // Image missing Alt check
  const imgAltMatches = [...htmlPayload.matchAll(/<img[^>]*>/g)];
  const missingAlts = imgAltMatches.filter(img => !img[0].includes('alt="') || img[0].includes('alt=""')).length;

  const readTime = Math.ceil(wordCount / 225);

  return (
    <div className={`flex flex-col border border-white/10 rounded-xl bg-[#080f28] overflow-hidden ${
      isFullscreen ? 'fixed inset-0 z-[9999] w-screen h-screen bg-[#04091a] p-4 sm:p-6' : 'min-h-[550px]'
    } transition-all duration-300 relative`} onMouseMove={handleMouseMove}>
      
      <div className={isZenMode ? "opacity-0 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300 absolute top-0 left-0 right-0 z-50 bg-[#0a0f26]" : "relative"}>
        <BlogEditorToolbar
          editor={editor}
          onOpenImageModal={() => setShowImageModal(true)}
          onOpenEmbedModal={onOpenEmbedModal}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          onOpenInlineAIPalette={() => {
            setAiPosition({ x: window.innerWidth / 2 - 200, y: 150 });
            setShowAiPalette(true);
          }}
          onOpenLinkModal={() => {
            const prev = editor?.getAttributes('link').href || '';
            setLinkUrl(prev);
            setShowLinkModal(true);
          }}
          isZenMode={isZenMode}
          onToggleZenMode={onToggleZenMode || (() => {})}
        />
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Editor Scrolling Content Area Container holds absolute aligned layers */}
        <div ref={editorContainerRef} className={`flex-1 overflow-y-auto max-h-[680px] bg-[#04091a]/40 relative ${isZenMode ? 'pt-16' : ''}`}>
          
          <div className={isZenMode ? "max-w-2xl mx-auto w-full" : ""}>
            <EditorContent editor={editor} />
          </div>

          {/* Notion-style Block Drag Handle Gutter */}
          {hoveredBlock && !isFullscreen && (
            <div 
              className="absolute left-2 w-6 h-6 flex items-center justify-center cursor-pointer text-white/40 hover:text-white bg-[#0c1535] border border-white/10 rounded z-30 transition-all duration-150"
              style={{ top: `${hoveredBlock.top}px` }}
              onClick={() => setShowBlockMenu(!showBlockMenu)}
            >
              <div className="grid grid-cols-2 gap-0.5 w-2">
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
                <span className="w-1 h-1 bg-current rounded-full" />
              </div>
            </div>
          )}

          {/* Notion Block Action Controller Menu */}
          {showBlockMenu && hoveredBlock && (
            <div 
              className="absolute left-9 bg-[#0c1535] border border-white/10 p-1.5 rounded-xl shadow-2xl z-50 flex flex-col gap-1 w-44 select-none backdrop-blur-md"
              style={{ top: `${hoveredBlock.top}px` }}
            >
              <button onClick={() => moveBlock('up')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2"><ArrowUp className="w-3.5 h-3.5 text-blue-400" /> Move Up</button>
              <button onClick={() => moveBlock('down')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2"><ArrowDown className="w-3.5 h-3.5 text-blue-400" /> Move Down</button>
              <button onClick={duplicateBlock} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2"><Copy className="w-3.5 h-3.5 text-emerald-400" /> Duplicate</button>
              <button onClick={() => { setActiveCommentBlockId(hoveredBlock.id); setShowBlockMenu(false); }} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2"><MessageSquare className="w-3.5 h-3.5 text-purple-400" /> Add Comment</button>
              <div className="h-[1px] bg-white/15 my-1" />
              <button onClick={deleteBlock} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete Block</button>
            </div>
          )}

          {/* Inline Comment Pin Panel */}
          {activeCommentBlockId && (
            <div className="absolute right-4 top-20 w-72 bg-[#0c1535]/95 border border-white/10 p-4 rounded-xl shadow-2xl z-50 backdrop-blur-md">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-extrabold text-white/80 uppercase">Pin Post Comment</span>
                <button onClick={() => setActiveCommentBlockId(null)} className="text-white/40 hover:text-white text-xs">✕</button>
              </div>
              <textarea
                className="w-full bg-[#080f28] border border-white/10 rounded-lg p-2 text-xs text-white placeholder-white/20 focus:outline-none mb-3 resize-none h-16"
                placeholder="Write feedback, reminders or editorial annotations..."
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
              />
              <button onClick={addComment} className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-1.5 rounded-lg text-xs transition">Attach Pin</button>
              <div className="mt-3 max-h-32 overflow-y-auto flex flex-col gap-1.5 border-t border-white/5 pt-2">
                {comments.filter(c => c.blockId === activeCommentBlockId).map(c => (
                  <div key={c.id} className="bg-[#080f28]/60 p-2 rounded-lg border border-white/5 text-[10px] text-white/70">
                    {c.text}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart Floating Selection Bubble Bar */}
          {showBubbleBar && (
            <div 
              className="absolute bg-[#0a0f26]/95 border border-white/15 p-1 rounded-xl shadow-2xl z-[60] flex items-center gap-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100"
              style={{ left: `${bubblePosition.x}px`, top: `${bubblePosition.y}px`, transform: 'translateX(-50%)' }}
            >
              <button onClick={() => editor?.chain().focus().toggleBold().run()} className="p-1.5 rounded hover:bg-white/5 text-white/70 hover:text-white"><Bold className="w-3.5 h-3.5" /></button>
              <button onClick={() => editor?.chain().focus().toggleItalic().run()} className="p-1.5 rounded hover:bg-white/5 text-white/70 hover:text-white"><Italic className="w-3.5 h-3.5" /></button>
              <button onClick={() => {
                const prev = editor?.getAttributes('link').href || '';
                setLinkUrl(prev);
                setShowLinkModal(true);
              }} className="p-1.5 rounded hover:bg-white/5 text-white/70 hover:text-white"><Link2 className="w-3.5 h-3.5" /></button>
              <span className="w-[1px] h-4 bg-white/10" />
              <button onClick={() => {
                setAiPosition({ x: bubblePosition.x - 200, y: bubblePosition.y + 40 });
                setShowAiPalette(true);
              }} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 px-2 py-1.5 rounded-lg text-[10px] font-bold text-white flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Assist</button>
            </div>
          )}

          {/* Slash Commands Dropdown Menu */}
          {showSlashMenu && (
            <div 
              className="absolute bg-[#0c1535]/95 border border-white/10 p-1.5 rounded-xl shadow-2xl z-50 flex flex-col gap-0.5 w-52 backdrop-blur-md select-none"
              style={{ left: `${slashPosition.x}px`, top: `${slashPosition.y}px` }}
            >
              <span className="text-[9px] font-extrabold text-white/30 uppercase tracking-widest px-2.5 py-1">Insert Block Element</span>
              <button onClick={() => executeSlashCommand('h2')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2">H2 Subheading</button>
              <button onClick={() => executeSlashCommand('h3')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2">H3 Subheading</button>
              <button onClick={() => executeSlashCommand('table')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2">Data Table Grid</button>
              <button onClick={() => executeSlashCommand('callout')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2">Success Callout Block</button>
              <button onClick={() => executeSlashCommand('columns')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2">Dual Grid Columns</button>
              <button onClick={() => executeSlashCommand('image')} className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-white/80 hover:bg-white/5 flex items-center gap-2">WebP Image Graphic</button>
            </div>
          )}

          {/* Floating AI Copilot Console */}
          {showAiPalette && (
            <div 
              className="absolute bg-[#0a0f26]/95 border border-white/15 p-4 rounded-2xl shadow-[0_0_50px_rgba(124,58,237,0.15)] z-[70] w-[420px] backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 duration-200"
              style={{ left: `${aiPosition.x}px`, top: `${aiPosition.y}px` }}
            >
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
                  <span className="text-xs font-extrabold text-white tracking-widest uppercase">LeadsMind AI Copilot</span>
                </div>
                <button onClick={() => setShowAiPalette(false)} className="text-white/40 hover:text-white text-xs">✕</button>
              </div>

              <div className="grid grid-cols-2 gap-1.5 mb-3">
                <button onClick={() => executeAiCopilot('elaborate')} className="bg-[#0c1535] hover:bg-violet-600/20 hover:border-violet-500/20 border border-white/5 py-1.5 px-2.5 rounded-lg text-[10px] font-bold text-left text-white/80">🤖 Expand / Elaborate</button>
                <button onClick={() => executeAiCopilot('condense')} className="bg-[#0c1535] hover:bg-violet-600/20 hover:border-violet-500/20 border border-white/5 py-1.5 px-2.5 rounded-lg text-[10px] font-bold text-left text-white/80">✂️ Tighten / Condense</button>
                <button onClick={() => executeAiCopilot('south-africanize')} className="bg-[#0c1535] hover:bg-violet-600/20 hover:border-violet-500/20 border border-white/5 py-1.5 px-2.5 rounded-lg text-[10px] font-bold text-left text-white/80">🇿🇦 South Africanize</button>
                <button onClick={() => executeAiCopilot('continue')} className="bg-[#0c1535] hover:bg-violet-600/20 hover:border-violet-500/20 border border-white/5 py-1.5 px-2.5 rounded-lg text-[10px] font-bold text-left text-white/80">✍️ Continue Writing</button>
              </div>

              <div className="flex flex-col gap-1 mb-3 border-t border-white/5 pt-2">
                <span className="text-[9px] font-extrabold text-white/30 uppercase tracking-widest">Adjust Persona Tone</span>
                <div className="grid grid-cols-4 gap-1">
                  {['professional', 'casual', 'empathetic', 'analytical'].map(t => (
                    <button key={t} onClick={() => executeAiCopilot(`tone-${t}` as any)} className="bg-[#0c1535] hover:bg-white/5 border border-white/5 py-1 px-1.5 rounded text-[9px] font-bold text-white/70 capitalize">{t}</button>
                  ))}
                </div>
              </div>

              {aiLoading && (
                <div className="bg-[#080f28] p-3 rounded-lg border border-violet-500/20 text-[10px] font-bold text-violet-400 flex items-center justify-center gap-2 my-2 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                  <span>LeadsMind synthesis engine writing...</span>
                </div>
              )}

              {aiResponse && !aiLoading && (
                <div className="bg-[#080f28] p-3 rounded-lg border border-white/10 text-[10px] text-white/80 my-2 max-h-32 overflow-y-auto select-text font-mono leading-relaxed">
                  {aiResponse}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Collapsible live SEO Audit & Metrics Sidebar */}
        {showSeoPanel && (
          <div className="w-80 bg-[#0a0f26]/95 border-l border-white/10 p-5 flex flex-col gap-4 select-none shrink-0 animate-in slide-in-from-right duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <div className="flex items-center gap-1.5">
                <Settings className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold text-white uppercase tracking-widest">SEO Live Audit</span>
              </div>
              <button onClick={() => setShowSeoPanel(false)} className="text-white/40 hover:text-white text-xs">✕</button>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-white/40 uppercase">Target Audit Keyword</span>
              <input
                className="bg-[#080f28] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                value={targetKeyword}
                onChange={e => setTargetKeyword(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3 mt-2">
              {/* Density Indicator */}
              <div className="bg-[#080f28]/60 p-3 rounded-xl border border-white/5 flex flex-col gap-1">
                <div className="flex justify-between items-center text-[10px] font-bold text-white/60">
                  <span>Keyword Density</span>
                  <span className={parseFloat(kwDensity) > 2.5 ? 'text-rose-400' : parseFloat(kwDensity) > 0.8 ? 'text-emerald-400' : 'text-amber-400'}>{kwDensity}%</span>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-1">
                  <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${Math.min(100, parseFloat(kwDensity) * 35)}%` }} />
                </div>
                <span className="text-[9px] text-white/30 leading-normal mt-1">Matched {kwMatches} occurrences in plain payload.</span>
              </div>

              {/* Tag Checker */}
              <div className="bg-[#080f28]/60 p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
                {headingIssue ? (
                  <>
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-amber-400">Heading Tag skips detected</span>
                      <span className="text-[9px] text-white/40 leading-normal">Your structure skipped heading ranks (e.g. H2 directly to H4). Update order.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-emerald-400">Heading Tag Flow Safe</span>
                      <span className="text-[9px] text-white/40 leading-normal">Heading outlines are completely nested in absolute logical order.</span>
                    </div>
                  </>
                )}
              </div>

              {/* Image Alt Checker */}
              <div className="bg-[#080f28]/60 p-3 rounded-xl border border-white/5 flex items-start gap-2.5">
                {missingAlts > 0 ? (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-rose-400">{missingAlts} Images Missing Alt Text</span>
                      <span className="text-[9px] text-white/40 leading-normal">To satisfy accessibility guidelines, double-click image nodes and set alt string tags.</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] font-bold text-emerald-400">Image alt check passed</span>
                      <span className="text-[9px] text-white/40 leading-normal">All graphic image nodes have valid descriptive alt string definitions.</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Glassmorphic Metadata Telemetry Footer */}
      {!isZenMode && (
        <div className="bg-[#0c1535] border-t border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between text-[10px] font-bold text-white/40 tracking-wider gap-3 select-none">
          <div className="flex items-center gap-4">
            <span>WORDS: <span className="text-white/80">{wordCount} / 1200</span> {wordCount >= 1000 && <span className="text-emerald-400 font-extrabold ml-1">✓ SWEET SPOT MET</span>}</span>
            <span>CHARACTERS: <span className="text-white/80">{charCount}</span></span>
            <span>EST. READING TIME: <span className="text-white/80">{readTime} MIN</span></span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowSeoPanel(!showSeoPanel)} className="bg-white/5 border border-white/5 hover:bg-white/10 px-2.5 py-1 rounded text-[9px] font-extrabold text-white/80 hover:text-white transition flex items-center gap-1 uppercase">
              <Settings className="w-3 h-3 text-emerald-400" />
              <span>SEO Audit</span>
            </button>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="uppercase text-emerald-400 text-[8.5px] font-extrabold tracking-widest">LIVE SYNCHRONIZATION</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom React Hyperlink Modal Overlay */}
      {showLinkModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
          <div className="bg-[#0c1535] border border-white/10 p-6 rounded-2xl w-96 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5"><Link2 className="w-4 h-4 text-primary" /> Attach Hyperlink</h3>
            <input
              type="text"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              className="w-full bg-[#080f28] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowLinkModal(false)}
                className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-lg font-bold transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (editor) {
                    if (linkUrl) {
                      editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run();
                    } else {
                      editor.chain().focus().extendMarkRange('link').unsetLink().run();
                    }
                  }
                  setShowLinkModal(false);
                }}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition"
              >
                Attach Link
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom React Rich Image Modal Overlay */}
      {showImageModal && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm select-none">
          <div className="bg-[#0c1535] border border-white/10 p-6 rounded-2xl w-[400px] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xs font-extrabold text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">🖼️ Insert Rich Image</h3>
            
            {/* Tab Selector */}
            <div className="flex bg-[#080f28] p-1 rounded-xl border border-white/5 mb-4">
              <button
                onClick={() => setImageTab('upload')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition ${
                  imageTab === 'upload' ? 'bg-primary text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                CRM Storage Upload
              </button>
              <button
                onClick={() => setImageTab('url')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition ${
                  imageTab === 'url' ? 'bg-primary text-white' : 'text-white/40 hover:text-white'
                }`}
              >
                Direct Web URL
              </button>
            </div>

            {imageTab === 'upload' ? (
              <div className="flex flex-col items-center justify-center py-6 border border-dashed border-white/10 rounded-xl bg-[#080f28]/40 mb-4 text-center">
                <span className="text-[10px] text-white/50 mb-3 px-4 leading-normal">Upload visual assets directly to CRM Secure Storage</span>
                <button
                  onClick={() => {
                    onOpenImageModal();
                    setShowImageModal(false);
                  }}
                  className="bg-primary hover:bg-blue-600 text-white text-xs font-bold px-4 py-2 rounded-lg transition shadow-lg"
                >
                  Open CRM Media Library
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Image Web URL (https://unsplash.com/...)"
                  value={directImageUrl}
                  onChange={e => setDirectImageUrl(e.target.value)}
                  className="w-full bg-[#080f28] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Accessibility Alt Text (description of image)"
                  value={directImageAlt}
                  onChange={e => setDirectImageAlt(e.target.value)}
                  className="w-full bg-[#080f28] border border-white/10 rounded-lg p-2.5 text-xs text-white placeholder-white/20 focus:outline-none"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowImageModal(false)}
                className="bg-white/5 border border-white/5 hover:bg-white/10 text-white/70 px-4 py-2 rounded-lg font-bold transition"
              >
                Cancel
              </button>
              {imageTab === 'url' && (
                <button
                  onClick={() => {
                    if (editor && directImageUrl) {
                      editor.chain().focus().setImage({ src: directImageUrl, alt: directImageAlt }).run();
                    }
                    setShowImageModal(false);
                  }}
                  className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-bold transition"
                >
                  Insert Image URL
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
export default BlogEditorContent;
