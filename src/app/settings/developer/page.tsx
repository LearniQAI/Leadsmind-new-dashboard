'use client';

import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';

export default function DeveloperPage() {
  const quickReferences = [
    { method: "GET", path: "/v1/contacts", desc: "List all your contacts" },
    { method: "POST", path: "/v1/contacts", desc: "Create a new contact" },
    { method: "GET", path: "/v1/invoices", desc: "List all invoices" },
    { method: "POST", path: "/v1/invoices", desc: "Create a new invoice" },
    { method: "GET", path: "/v1/deals", desc: "List all deals" },
    { method: "POST", path: "/v1/invoices/{id}/send", desc: "Send an invoice by email or WhatsApp" }
  ];

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1
            className="text-[22px] font-bold leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Developer & <span className="text-[#3b82f6]">API</span>
          </h1>
          <p
            className="text-[11.5px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Access the LeadsMind API, manage your API keys, and set up webhooks.
          </p>
        </div>

        {/* Section 1: API KEY */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          YOUR API KEY
        </h3>
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="flex items-center justify-between">
            <span
              className="text-[12px] font-semibold text-[#eef2ff]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Live API Key
            </span>
          </div>
          
          <p
            className="text-[11px] text-[#4a5a82] italic mt-2"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Your API key gives full access to your workspace. Never share it publicly.
          </p>
        </div>

        {/* Section 2: PLAN LIMITS */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          YOUR PLAN LIMITS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Limit Card 1 */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span
              className="text-[26px] font-bold text-[#3b82f6] leading-none"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              300
            </span>
            <span
              className="text-[11px] text-[#4a5a82] mt-2 font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Requests per minute
            </span>
          </div>

          {/* Limit Card 2 */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <div>
              <span
                className="text-[26px] font-bold text-[#10b981] leading-none"
                style={{ fontFamily: "'Space Grotesk', sans-serif" }}
              >
                v1
              </span>
              <p
                className="text-[10px] text-[#4a5a82] mt-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                supported for 24 months
              </p>
            </div>
            <span
              className="text-[11px] text-[#4a5a82] mt-2 font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Current API version
            </span>
          </div>

          {/* Limit Card 3 */}
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-4 flex flex-col justify-between min-h-[90px]">
            <span
              className="text-[13px] font-bold text-[#eef2ff] leading-none truncate"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              api.leadsmind.io
            </span>
            <span
              className="text-[11px] text-[#4a5a82] mt-2 font-medium"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Base URL
            </span>
          </div>
        </div>

        {/* Section 3: WEBHOOKS */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          WEBHOOKS
        </h3>
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <h4
            className="text-[14px] font-semibold text-[#eef2ff]"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Get notified when things happen in LeadsMind
          </h4>
          <p
            className="text-[12px] text-[#94a3c8] leading-relaxed mt-1"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            A webhook is a web address you give us. When something happens in LeadsMind — like an invoice being paid or a form being submitted — we instantly send the details to that address. Your other software receives it and can act on it automatically.
          </p>
        </div>

        {/* Section 4: API QUICK REFERENCE */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          API QUICK REFERENCE
        </h3>
        <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5">
          <div className="flex flex-col">
            {quickReferences.map((ref, rIndex) => (
              <div
                key={rIndex}
                className="flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)] py-2.5 last:border-0"
              >
                <span
                  className={`text-[10px] font-bold rounded px-2 py-0.5 min-w-[50px] text-center border ${
                    ref.method === 'GET'
                      ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border-[rgba(16,185,129,0.2)]'
                      : 'bg-[rgba(37,99,235,0.1)] text-[#3b82f6] border-[rgba(37,99,235,0.2)]'
                  }`}
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {ref.method}
                </span>
                <span
                  className="text-[12px] font-mono text-[#eef2ff] flex-1 truncate"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {ref.path}
                </span>
                <span
                  className="text-[11px] text-[#4a5a82] text-right hidden sm:block truncate max-w-xs"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}
                >
                  {ref.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Wrapper>
  );
}
