'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Copy, 
  Code2, 
  Globe, 
  Zap, 
  CheckCircle2, 
  Terminal,
  ExternalLink,
  PlayCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { getWorkspaceApiKey } from '@/app/actions/marketing';
import { sendDemoLead } from '@/app/actions/demo_actions';

export default function UniversalAPI() {
  const [apiKey, setApiKey] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [sendingDemo, setSendingDemo] = useState(false);

  useEffect(() => {
    async function loadKey() {
      const res = await getWorkspaceApiKey();
      if (res.apiKey) setApiKey(res.apiKey);
      setLoading(false);
    }
    loadKey();
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const handleSendDemo = async () => {
    if (!apiKey) return;
    setSendingDemo(true);
    const res = await sendDemoLead(apiKey);
    setSendingDemo(false);
    
    if (res.success) {
      toast.success('Demo lead captured! Check your Contacts page.');
    } else {
      toast.error(res.error || 'Failed to send demo lead');
    }
  };

  const embedCode = `<script>
  // LeadsMind Universal Lead Capture
  (function(w,d,s,o,f,js,fjs){
    w['LeadsmindObj']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s),fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src=f;js.async=1;fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','lm','${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/leads/sdk.js'));

  lm('init', { apiKey: '${apiKey || 'YOUR_API_KEY'}' });
</script>`;

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/leads`;

  if (loading) return <div className="p-8 text-center animate-pulse text-white/20 uppercase font-black tracking-widest">Loading API Configuration...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* API Key Hero Section */}
      <div className="bg-[#0b0b1a] border border-primary/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px] -mr-32 -mt-32 transition-all group-hover:bg-primary/10" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Universal Connection</span>
            </div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">Your API <span className="text-primary">Secret Key</span></h2>
            <p className="text-white/40 text-xs font-medium max-w-md">Use this key to connect external websites, webhooks, and custom forms directly to your LeadsMind dashboard.</p>
          </div>

          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2 pl-4 min-w-[300px]">
            <input 
              type={showKey ? 'text' : 'password'} 
              value={apiKey} 
              readOnly 
              className="bg-transparent border-none outline-none text-white font-mono text-sm flex-1"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setShowKey(!showKey)}
              className="text-white/40 hover:text-white"
            >
              {showKey ? 'Hide' : 'Show'}
            </Button>
            <Button 
              size="sm" 
              onClick={() => copyToClipboard(apiKey, 'API Key')}
              className="bg-primary hover:bg-primary/90 text-white rounded-xl h-10 w-10 p-0"
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Webhook Implementation */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 border border-blue-500/20">
                <Globe className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Webhook Endpoint</h3>
            </div>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-blue-500/30 text-blue-400 bg-blue-500/5">POST ONLY</Badge>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Target URL</Label>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white/60 font-mono">
                {webhookUrl}
                <button onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')} className="ml-auto text-white/20 hover:text-white transition-colors">
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-white/30">Example Implementation (JavaScript)</Label>
              <div className="bg-[#050505] rounded-xl p-4 border border-white/5">
                <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto">
{`fetch('${webhookUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey.substring(0, 8)}...'
  },
  body: JSON.stringify({
    email: 'user@example.com',
    first_name: 'John',
    last_name: 'Doe'
  })
});`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Embedded Code Implementation */}
        <div className="bg-white/5 border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Embedded Script</h3>
            </div>
            <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest border-purple-500/30 text-purple-400 bg-purple-500/5">ZERO-CODE</Badge>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-white/40 leading-relaxed">
              Paste this script into the <code className="text-white">&lt;head&gt;</code> of any website to automatically track visitors and capture form submissions.
            </p>
            
            <div className="bg-[#050505] rounded-xl p-4 border border-white/5 relative group">
              <pre className="text-[10px] text-blue-400 font-mono overflow-x-auto whitespace-pre-wrap">
                {embedCode}
              </pre>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => copyToClipboard(embedCode, 'SDK Script')}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-white/10 hover:bg-white/20 text-white"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-purple-500/5 border border-purple-500/10">
              <CheckCircle2 className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-bold text-white/60 uppercase tracking-widest">Automatic form detection included</span>
            </div>
          </div>
        </div>
      </div>

      {/* Demo Mode / Client Presentation */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-white/10 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
          <PlayCircle className="w-8 h-8" />
        </div>
        <div className="flex-1 space-y-1 text-center md:text-left">
          <h3 className="text-xl font-black text-white uppercase tracking-tight">Presentation <span className="text-emerald-400">Demo Mode</span></h3>
          <p className="text-white/40 text-sm">Want to show your client how it works? Click the button to simulate a lead capture instantly.</p>
        </div>
        <Button 
          disabled={sendingDemo}
          onClick={handleSendDemo}
          className="bg-emerald-500 hover:bg-emerald-600 text-[#0b0b1a] font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-xl shadow-emerald-500/20 whitespace-nowrap"
        >
          {sendingDemo ? 'Simulating...' : 'Send Test Lead Now'}
        </Button>
      </div>
    </div>
  );
}

function Badge({ children, className, variant }: any) {
  return (
    <span className={\`px-2 py-0.5 rounded-full \${className}\`}>
      {children}
    </span>
  );
}

function Label({ children, className }: any) {
  return (
    <label className={\`block mb-1 \${className}\`}>
      {children}
    </label>
  );
}
