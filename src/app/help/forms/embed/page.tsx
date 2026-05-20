'use client';

import React from 'react';
import { ArrowLeft, Code } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function HelpEmbedFormsPage() {
  const router = useRouter();
  
  return (
    <div className="min-h-screen bg-[#04081a] text-white p-8 font-dm-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
          >
            <ArrowLeft size={16} className="text-[#4a5a82]" />
          </button>
          <div>
            <h1 className="text-2xl font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2">
              <Code size={20} className="text-blue-400" />
              How to Embed Forms
            </h1>
            <p className="text-sm text-[#4a5a82]">Universal embed documentation for any platform</p>
          </div>
        </div>

        <div className="bg-[#0c1535] border border-white/5 p-8 rounded-2xl flex flex-col gap-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-white">1. Find Your Embed Code</h2>
          <p className="text-white/60 leading-relaxed">
            Navigate to your form dashboard. On the form card, click the three-dot menu and select "Share & Embed". 
            This will open a modal providing you with an iframe code block perfectly tailored to your form.
          </p>

          <h2 className="text-lg font-black uppercase tracking-wider text-white mt-4">2. Copying the Script</h2>
          <div className="p-4 bg-black/40 border border-white/10 rounded-xl font-mono text-xs text-blue-300 overflow-x-auto">
            {`<iframe src="https://your-domain.com/public/forms/FORM_ID" width="100%" height="600" frameborder="0"></iframe>`}
          </div>

          <h2 className="text-lg font-black uppercase tracking-wider text-white mt-4">3. Pasting in your Website Builder</h2>
          <ul className="list-disc pl-5 space-y-2 text-white/60">
            <li><strong>WordPress:</strong> Use a Custom HTML block and paste the script directly.</li>
            <li><strong>Webflow:</strong> Add an Embed element and paste the code. You may need a paid Webflow plan to use Embed elements.</li>
            <li><strong>Shopify:</strong> Add a Custom Liquid or Custom HTML section to your page template.</li>
            <li><strong>React / Next.js:</strong> You can safely render this inside a standard <code>{'<iframe />'}</code> JSX element.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
