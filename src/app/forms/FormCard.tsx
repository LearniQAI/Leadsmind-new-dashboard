import React from 'react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  FileText, Share2, UserCheck, Pencil, Trash2, Globe, Clock, Copy, MoreVertical, Code2, Sliders, Shield, BarChart3, CheckCircle
} from 'lucide-react';
import { DashCard } from '@/components/dashboard-ui/Card';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashStatusPill } from '@/components/dashboard-ui/StatusPill';

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
  onViewSubmissions?: (form: any) => void;
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
  onViewSubmissions,
  onViewAutomations,
  onViewGovernance,
  onViewAnalytics,
}: FormCardProps) {
  return (
    <DashCard padding="default" className="group">
      <div className="flex justify-between items-start mb-6">
        <div className="h-11 w-11 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent border border-dash-accent/20">
          <FileText size={18} />
        </div>
        <div className="flex items-center gap-2">
          <DashStatusPill variant={form.status === 'published' ? 'success' : 'warning'}>
            {form.status || 'draft'}
          </DashStatusPill>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="h-8 w-8 rounded-lg bg-dash-surface hover:bg-dash-border/60 flex items-center justify-center transition-colors motion-reduce:transition-none">
                <MoreVertical size={14} className="!text-dash-textMuted" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-dash-border shadow-lg rounded-xl min-w-[170px]">
              <DropdownMenuItem onClick={() => onOpenBuilder(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2 text-xs">
                <Pencil size={14} /> Open builder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEmbed(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2 text-xs">
                <Code2 size={14} /> Share &amp; embed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRename(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:!text-dash-text hover:bg-dash-surface rounded-lg mx-1 px-3 py-2 text-xs">
                <CheckCircle size={14} /> Rename form
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewSubmissions?.(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-green hover:bg-green/5 rounded-lg mx-1 px-3 py-2 text-xs">
                <UserCheck size={14} /> View submissions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewPartials?.(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-amber-600 hover:bg-amber-50 rounded-lg mx-1 px-3 py-2 text-xs">
                <Clock size={14} /> Recovery sessions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewAnalytics?.(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-red hover:bg-red/5 rounded-lg mx-1 px-3 py-2 text-xs">
                <BarChart3 size={14} /> Analytics dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewAutomations?.(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2 text-xs">
                <Sliders size={14} /> Workflow automations
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewGovernance?.(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-purple-600 hover:bg-purple-50 rounded-lg mx-1 px-3 py-2 text-xs">
                <Shield size={14} /> Governance &amp; versions
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPublishToggle(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-green hover:bg-green/5 rounded-lg mx-1 px-3 py-2 text-xs">
                {form.status === 'published' ? <><Clock size={14} /> Move to draft</> : <><Globe size={14} /> Publish live</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyLink(form)} className="flex items-center gap-2 cursor-pointer !text-dash-textMuted hover:text-dash-accent hover:bg-dash-accent/5 rounded-lg mx-1 px-3 py-2 text-xs">
                <Copy size={14} /> Copy link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDelete(form)} className="flex items-center gap-2 cursor-pointer text-red hover:bg-red/5 rounded-lg mx-1 px-3 py-2 text-xs">
                <Trash2 size={14} /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Card body - clickable to builder */}
      <div
        className="mb-6 cursor-pointer"
        onClick={() => onOpenBuilder(form)}
      >
        <h4 className="text-lg font-bold !text-dash-text mb-2">{form.name}</h4>
        <div className="flex flex-col gap-1.5 mt-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold !text-dash-textMuted">
            <UserCheck className="w-3.5 h-3.5 text-dash-accent" />
            <span>{form.submissions?.[0]?.count || 0} submissions</span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold !text-dash-textMuted">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>{form.partial_count || 0} incomplete</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-semibold !text-dash-textMuted opacity-70">
            <Clock className="w-3 h-3" />
            <span>Edited {new Date(form.updated_at || form.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-5 border-t border-dash-border">
        <DashButton onClick={() => onEmbed(form)} variant="secondary" size="sm">
          <Share2 size={11} /> Share
        </DashButton>
        <div className="flex items-center gap-2">
          <DashButton onClick={() => onOpenBuilder(form)} variant="secondary" size="sm">
            <Pencil size={11} /> Edit
          </DashButton>
          <DashButton
            onClick={() => onPublishToggle(form)}
            size="sm"
            className={form.status === 'published' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-green/10 text-green hover:bg-green/20'}
          >
            {form.status === 'published' ? <><Clock size={11} /> Draft</> : <><Globe size={11} /> Publish</>}
          </DashButton>
        </div>
      </div>
    </DashCard>
  );
}
