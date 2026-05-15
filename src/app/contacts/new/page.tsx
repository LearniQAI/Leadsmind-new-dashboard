import React from 'react';
import { ContactForm } from '@/components/crm/ContactForm';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';

export default function NewContactPage() {
  return (
    <MetaData pageTitle="Add New Lead">
      <Wrapper>
        <div className="flex flex-col min-h-screen bg-[#04091a]">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-6 pt-5">
            <div>
              <h1 className="text-[22px] font-bold text-[#eef2ff] uppercase tracking-tight leading-none mb-1.5 font-space-grotesk">
                New <span className="text-[#3b82f6]">Lead</span>
              </h1>
              <p className="text-[11.5px] font-medium text-[#4a5a82] uppercase tracking-[0.8px] font-dm-sans">
                Initialize a high-fidelity relationship in your database
              </p>
            </div>
          </div>

          {/* Form Card - Centered */}
          <div className="flex-1 flex items-start justify-center px-6 pb-20">
            <div className="w-full max-w-[500px] bg-[#080f28] border border-white/5 rounded-[24px] p-8 shadow-2xl relative overflow-hidden">
              {/* Background Accent */}
              <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-[#2563eb]/5 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-xl bg-[#2563eb]/10 flex items-center justify-center text-[#2563eb]">
                    <i className="fa-solid fa-user-plus text-[18px]"></i>
                  </div>
                  <div>
                    <h2 className="text-[16px] font-bold text-[#eef2ff] font-space-grotesk uppercase tracking-tight">Lead Information</h2>
                    <p className="text-[11px] text-[#4a5a82] font-dm-sans">Ensure data accuracy for effective nurturing</p>
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
