import React from 'react';
import { ArrowLeft, Shield } from 'lucide-react';
import Link from 'next/link';

export default function HelpGovernancePage() {
  return (
    <div className="min-h-screen bg-[#04081a] text-white p-8 font-dm-sans">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        
        <div className="flex items-center gap-4">
          <Link
            href="/forms"
            className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all border border-white/10"
          >
            <ArrowLeft size={16} className="text-[#4a5a82]" />
          </Link>
          <div>
            <h1 className="text-2xl font-space-grotesk font-black uppercase tracking-tight flex items-center gap-2">
              <Shield size={20} className="text-indigo-400" />
              Managing Versions & Snapshots
            </h1>
            <p className="text-sm text-[#4a5a82]">Learn how immutable snapshots and rollbacks work</p>
          </div>
        </div>

        <div className="bg-[#0c1535] border border-white/5 p-8 rounded-2xl flex flex-col gap-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-white">1. Drafts vs. Production</h2>
          <p className="text-white/60 leading-relaxed">
            Leadsmind uses a highly safe deployment strategy. Every change you make in the Form Builder edits the <strong>Draft Version</strong>. 
            These changes are auto-saved instantly, but they do NOT affect the live form embedded on your website. 
            To push changes live, you must navigate to the Builder and click the blue <strong>"Publish Changes"</strong> button.
          </p>

          <h2 className="text-lg font-black uppercase tracking-wider text-white mt-4">2. Immutable Snapshots</h2>
          <p className="text-white/60 leading-relaxed">
            Every time you hit Publish, the system creates an immutable "Snapshot". This locks the exact state of the form 
            (all fields, configurations, colors, and layouts) into the Version History database. This allows you to safely 
            make breaking changes to your form without fear of destroying the live asset.
          </p>

          <h2 className="text-lg font-black uppercase tracking-wider text-white mt-4">3. Diff Comparison & Rollbacks</h2>
          <ul className="list-disc pl-5 space-y-2 text-white/60">
            <li><strong>Compare Diff:</strong> In the Version History tab, you can click "Compare Diff" on any past snapshot. This will open a side-by-side JSON comparison showing exactly what fields were added or removed compared to the current Draft.</li>
            <li><strong>Rollback:</strong> If you accidentally delete a field or break a live form, click "Rollback" on a previous stable snapshot. This will instantly revert your Draft to that exact state, allowing you to re-publish and fix the form in seconds.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
