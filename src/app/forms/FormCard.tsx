import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  FileText, Share2, UserCheck, Pencil, Trash2, Globe, Clock, Copy, MoreVertical, Code2, Sliders, Shield, BarChart3
} from 'lucide-react';

interface FormCardProps {
  form: any;
  onEdit: (form: any) => void;
  onEmbed: (form: any) => void;
  onRename: (form: any) => void;
  onPublishToggle: (form: any) => void;
  onCopyLink: (form: any) => void;
  onDelete: (form: any) => void;
  onOpenBuilder: (form: any) => void;
  onViewPartials?: (form: any) => void;
  onViewAutomations?: (form: any) => void;
  onViewGovernance?: (form: any) => void;
  onViewAnalytics?: (form: any) => void;
}

export function FormCard({
  form,
  onEdit,
  onEmbed,
  onRename,
  onPublishToggle,
  onCopyLink,
  onDelete,
  onOpenBuilder,
  onViewPartials,
  onViewAutomations,
  onViewGovernance,
  onViewAnalytics,
}: FormCardProps) {
  return (
    <div className="bg-[#0b0b1a] border border-white/5 p-6 rounded-3xl group hover:border-primary/30 transition-all duration-300 shadow-xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all" />
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
          <FileText size={20} />
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`text-[9px] font-black uppercase px-3 py-1 rounded-full border-none ${form.status === 'published' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            {form.status || 'draft'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors">
                <MoreVertical size={14} className="text-white/60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#0b0b1a] border border-white/10 shadow-2xl rounded-xl min-w-[160px]">
              <DropdownMenuItem onClick={() => onOpenBuilder(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-primary hover:bg-primary/5 rounded-lg mx-1 px-3 py-2">
                <Pencil size={14} /> Open Builder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEmbed(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-blue-400 hover:bg-blue-500/5 rounded-lg mx-1 px-3 py-2">
                <Code2 size={14} /> Share &amp; Embed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-white hover:bg-white/5 rounded-lg mx-1 px-3 py-2">
                <CheckCircleHack size={14} /> Rename Form
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewPartials?.(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-amber-400 hover:bg-amber-500/5 rounded-lg mx-1 px-3 py-2">
                <Clock size={14} /> Recovery Sessions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewAnalytics?.(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-rose-400 hover:bg-rose-500/5 rounded-lg mx-1 px-3 py-2">
                <BarChart3 size={14} /> Analytics Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewAutomations?.(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-blue-400 hover:bg-blue-500/5 rounded-lg mx-1 px-3 py-2">
                <Sliders size={14} /> Workflow Automations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewGovernance?.(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-indigo-400 hover:bg-indigo-500/5 rounded-lg mx-1 px-3 py-2">
                <Shield size={14} /> Governance &amp; Versions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPublishToggle(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-emerald-500 hover:bg-emerald-500/5 rounded-lg mx-1 px-3 py-2">
                {form.status === 'published' ? <><Clock size={14} /> Move to Draft</> : <><Globe size={14} /> Publish Live</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyLink(form)} className="flex items-center gap-2 cursor-pointer text-white/60 hover:text-blue-500 hover:bg-blue-500/5 rounded-lg mx-1 px-3 py-2">
                <Copy size={14} /> Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(form)} className="flex items-center gap-2 cursor-pointer text-rose-500 hover:bg-rose-500/5 rounded-lg mx-1 px-3 py-2">
                <Trash2 size={14} /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card body - clickable to builder */}
      <div 
        className="mb-6 relative z-10 cursor-pointer" 
        onClick={() => onOpenBuilder(form)}
      >
        <h4 className="text-xl font-black text-white uppercase tracking-tighter mb-2">{form.name}</h4>
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            <UserCheck className="w-3.5 h-3.5 text-primary" />
            <span>{form.submissions?.[0]?.count || 0} Submissions</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{form.partial_count || 0} Incomplete</span>
          </div>
          <div className="flex items-center gap-2 text-[9px] font-bold text-white/20 uppercase tracking-wider">
            <Clock className="w-3 h-3 text-white/20" />
            <span>Edited {new Date(form.updated_at || form.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-white/5 relative z-10">
        <Button onClick={() => onEmbed(form)} variant="outline" size="sm" className="h-8 px-3 rounded-lg border-white/10 bg-transparent text-[9px] font-black uppercase text-white/40 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center gap-1.5">
          <Share2 size={11} /> Share
        </Button>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => onOpenBuilder(form)} 
            variant="outline" 
            size="sm" 
            className="h-8 px-3 rounded-lg border-white/10 bg-transparent text-[9px] font-black uppercase text-white/40 hover:text-primary hover:border-primary/50 hover:bg-primary/5 flex items-center gap-1.5"
          >
            <Pencil size={11} /> Edit
          </Button>
          <Button onClick={() => onPublishToggle(form)} size="sm" className={`h-8 px-3 rounded-lg text-[9px] font-black uppercase flex items-center gap-1.5 ${form.status === 'published' ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20'}`}>
            {form.status === 'published' ? <><Clock size={11} /> Draft</> : <><Globe size={11} /> Publish</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Simple wrapper for custom checks inside FormCard to avoid adding imports
function CheckCircleHack(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
