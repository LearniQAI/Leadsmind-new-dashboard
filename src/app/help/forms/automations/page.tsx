import React from 'react';
import { ArrowLeft, Sliders } from 'lucide-react';
import Link from 'next/link';

export default function HelpAutomationsPage() {
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
              <Sliders size={20} className="text-purple-400" />
              Configuring Workflow Logic
            </h1>
            <p className="text-sm text-[#4a5a82]">Connect triggers to actions and build powerful sequences</p>
          </div>
        </div>

        <div className="bg-[#0c1535] border border-white/5 p-8 rounded-2xl flex flex-col gap-6">
          <h2 className="text-lg font-black uppercase tracking-wider text-white">1. Access the Logic Engine</h2>
          <p className="text-white/60 leading-relaxed">
            From your form's dashboard, click on the "Workflow Automations" tab. Here, you can define exactly what happens immediately after a user submits the form.
          </p>

          <h2 className="text-lg font-black uppercase tracking-wider text-white mt-4">2. Trigger Conditions</h2>
          <p className="text-white/60 leading-relaxed">
            Workflows begin with a Trigger. By default, "Form Submitted" is the primary trigger. You can filter triggers based on specific answers, allowing you to build dynamic logic trees (e.g., if a user selects "Enterprise Plan", trigger the Enterprise Sales pipeline workflow).
          </p>

          <h2 className="text-lg font-black uppercase tracking-wider text-white mt-4">3. Action Blocks</h2>
          <ul className="list-disc pl-5 space-y-2 text-white/60">
            <li><strong>CRM Routing:</strong> Automatically assign the new lead to a specific salesperson.</li>
            <li><strong>Pipeline Movement:</strong> Add the lead to a Kanban pipeline stage.</li>
            <li><strong>Email Triggers:</strong> Dispatch an instant auto-responder email.</li>
            <li><strong>Tagging:</strong> Add specific tags based on their dropdown selections.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
