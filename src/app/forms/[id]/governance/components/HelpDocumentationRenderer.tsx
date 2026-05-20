'use client';

import React, { useState } from 'react';
import { Search, BookOpen, ExternalLink, Code, Sliders, Shield } from 'lucide-react';

interface HelpTopic {
  title: string;
  category: string;
  icon: React.ReactNode;
  content: string;
  linkText?: string;
  linkUrl?: string;
}

export function HelpDocumentationRenderer() {
  const [searchQuery, setSearchQuery] = useState('');

  const topics: HelpTopic[] = [
    {
      title: 'How to Embed Forms',
      category: 'Embed',
      icon: <Code size={14} className="text-blue-400" />,
      content: 'Copy the dynamic iframe loader script from the dashboard dropdown and paste it directly into your HTML code. Fully compatible with Webflow embed blocks, Shopify custom liquid blocks, and WordPress element builders.',
      linkText: 'Universal Embed documentation',
      linkUrl: '#'
    },
    {
      title: 'Configuring Workflow Logic',
      category: 'Automations',
      icon: <Sliders size={14} className="text-purple-400" />,
      content: 'Navigate to the Workflow Automations manager from the Form Card. Connect trigger conditions (e.g. Form Submitted, Step Completed) directly to actions like pipeline stage movements, marketing list inserts, and email templates.',
      linkText: 'Automation guides',
      linkUrl: '#'
    },
    {
      title: 'Managing Versions & Snapshots',
      category: 'Governance',
      icon: <Shield size={14} className="text-indigo-400" />,
      content: 'Every change in the Form Builder edits the draft version. To push changes live to your embed, go to Governance and click "Publish live version". This stores an immutable snapshot you can rollback to at any time.',
      linkText: 'Snapshot rollbacks explanation',
      linkUrl: '#'
    }
  ];

  const filteredTopics = topics.filter(
    (t) =>
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 font-dm-sans text-white">
      
      {/* Search Header Area */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-[#0c1535] border border-white/5 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <BookOpen size={18} className="text-blue-400" />
          <div>
            <h4 className="text-xs font-bold text-white font-space-grotesk">Contextual Knowledge Base</h4>
            <p className="text-[10px] text-white/50">Find quick-start references for integrations and workspace setups</p>
          </div>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-white/30" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides..."
            className="pl-9 pr-4 py-2 w-full h-8 text-[11px] bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Topics list cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {filteredTopics.map((topic, index) => (
          <div
            key={index}
            className="p-5 bg-[#0c1535] border border-white/5 rounded-2xl flex flex-col justify-between gap-4 transition-all hover:border-white/10"
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-widest text-[#4a5a82]">
                  {topic.category}
                </span>
                
                <div className="p-1 bg-white/5 rounded border border-white/5">
                  {topic.icon}
                </div>
              </div>

              <h4 className="text-xs font-black uppercase tracking-wide font-space-grotesk text-white">
                {topic.title}
              </h4>
              <p className="text-[11px] text-white/60 leading-relaxed">
                {topic.content}
              </p>
            </div>

            {topic.linkText && (
              <a
                href={topic.linkUrl}
                className="text-[9px] font-black uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-2.5"
              >
                {topic.linkText} <ExternalLink size={10} />
              </a>
            )}
          </div>
        ))}

        {filteredTopics.length === 0 && (
          <div className="col-span-full py-12 text-center text-white/30 text-[10px] font-bold uppercase tracking-wider">
            No search matches found. Try search query terms like 'embed', 'versions', 'logic'.
          </div>
        )}
      </div>

    </div>
  );
}
