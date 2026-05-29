'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Code, Copy, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SupportWidgetEmbedModal({ workspaceId }: { workspaceId: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [widgetKey, setWidgetKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchWidgetKey = async () => {
    if (widgetKey) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/support/widget-settings?workspaceId=${workspaceId}`);
      const data = await res.json();
      if (data.success && data.settings?.widget_key) {
        setWidgetKey(data.settings.widget_key);
      } else {
        toast.error(data.error || 'Failed to fetch widget settings');
      }
    } catch {
      toast.error('Failed to connect to API node');
    }
    setLoading(false);
  };

  const getEmbedCode = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://leadsmind.io';
    return `<script src="${origin}/widget/ticket.js" data-key="${widgetKey || 'YOUR_WIDGET_KEY'}"></script>`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getEmbedCode());
    setCopied(true);
    toast.success('Embed script copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if (val) fetchWidgetKey(); }}>
      <DialogTrigger asChild>
        <button className="btn-ghost !h-12 !px-6 text-xs font-black uppercase tracking-widest gap-2 flex items-center border border-white/10 hover:border-white/20">
          <Code className="h-4 w-4 text-accent2" />
          <span>Widget Setup</span>
        </button>
      </DialogTrigger>
      
      <DialogContent className="bg-[#0b0f19] border border-white/10 rounded-3xl max-w-lg p-6 shadow-2xl text-slate-200">
        <DialogHeader>
          <DialogTitle className="text-md font-black uppercase tracking-tight text-white flex items-center gap-2">
            <Code className="w-5 h-5 text-accent2" />
            Support Widget Integration
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-400">
            Copy and paste this script into your website HTML to embed the customer support portal widget.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <p className="text-xs text-slate-400 italic">Retrieving widget protocols...</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#4a5a82]">HTML Script Snippet</label>
                <div className="bg-slate-950 p-4 rounded-xl border border-white/5 font-mono text-[11px] text-slate-300 relative select-all break-all pr-12 leading-relaxed">
                  {getEmbedCode()}
                  <button 
                    onClick={handleCopy}
                    className="absolute right-3 top-3 h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 hover:border-white/10 transition-all active:scale-95"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  </button>
                </div>
              </div>

              <div className="bg-white/5 p-4 rounded-xl border border-white/5 space-y-2">
                <h4 className="text-[10px] font-black uppercase text-accent2 tracking-wider">Installation Instructions</h4>
                <ul className="text-xs text-slate-400 list-disc pl-4 space-y-1.5 leading-relaxed">
                  <li>Place the script tag at the bottom of your HTML document, right before the closing <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag.</li>
                  <li>The widget will automatically load a floating help icon in the bottom-right corner of the browser page.</li>
                  <li>To load the support form inline inside a specific container, add <code className="text-slate-300 bg-slate-950 px-1 py-0.5 rounded">id="leadsmind-support-widget"</code> to a div on your target page.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => setOpen(false)} className="btn-primary rounded-xl font-black uppercase text-xs px-6 h-10">Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
