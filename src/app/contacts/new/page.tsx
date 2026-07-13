import React from 'react';
import { UserPlus } from 'lucide-react';
import { ContactForm } from '@/components/crm/ContactForm';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';

export default function NewContactPage() {
  return (
    <MetaData pageTitle="Add New Lead">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-white">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-5">
            <div>
              <h1 className="text-[22px] font-bold !text-dash-text leading-none mb-1.5">
                New lead
              </h1>
              <p className="text-[12px] font-medium !text-dash-textMuted">
                Initialize a high-fidelity relationship in your database
              </p>
            </div>
          </div>

          {/* Form Card - Centered */}
          <div className="flex-1 flex items-start justify-center px-6 pb-20">
            <div className="w-full max-w-[500px] bg-white border border-dash-border rounded-2xl p-8 shadow-sm relative overflow-hidden">
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-dash-accent/5 rounded-full blur-[80px] pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">
                    <UserPlus size={18} />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold !text-dash-text">Lead information</h2>
                    <p className="text-[11px] !text-dash-textMuted">Ensure data accuracy for effective nurturing</p>
                  </div>
                </div>

                <ContactForm />
              </div>
            </div>
          </div>
        </div>
      </Wrapper>
    </MetaData>
  );
}
