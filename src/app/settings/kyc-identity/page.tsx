'use client';

import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConnectionCard from '@/components/settings/ConnectionCard';

export default function KycIdentityPage() {
  const steps = [
    "Open any contact record in your CRM",
    "Click Run Verification next to the contact's ID number",
    "LeadsMind checks their ID, credit, and sanctions status in under 10 seconds",
    "The result is saved on the contact record with a timestamp — ready for a FICA audit"
  ];

  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] text-[#eef2ff] py-8 px-6">
        <div className="max-w-4xl mx-auto flex flex-col">
          
          {/* Page Title */}
          <div>
            <h1
              className="text-[22px] font-bold leading-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              KYC & <span className="text-[#3b82f6]">Identity</span>
            </h1>
            <p
              className="text-[11.5px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Verify who your clients are and stay FICA-compliant — all from inside the CRM.
            </p>
          </div>

          {/* Amber Banner */}
          <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 mt-6 flex items-start gap-3">
            <span className="text-[#f59e0b] text-base leading-none select-none">⚠</span>
            <p
              className="text-[12px] text-[#94a3c8] leading-normal"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Identity checks and credit reports are not live yet. When connected, these run directly from a contact record inside your CRM.
            </p>
          </div>

          {/* Blue Explainer Box */}
          <div className="bg-[rgba(37,99,235,0.06)] border border-[rgba(37,99,235,0.12)] rounded-xl p-4 mt-4">
            <h4
              className="text-[13px] font-semibold text-[#eef2ff]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              What is KYC?
            </h4>
            <p
              className="text-[12px] text-[#94a3c8] leading-relaxed mt-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              KYC means Know Your Client. South African law (FICA) requires estate agents, financial advisors, accountants, and attorneys to verify who their clients are before doing business. LeadsMind will handle this for you automatically — no paper forms, no manual filing.
            </p>
          </div>

          {/* Section 1 — IDENTITY VERIFICATION */}
          <h3
            className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            IDENTITY VERIFICATION
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ConnectionCard name="TransUnion ID Check" shortName="TU" color="#e4002b" description="Verify a South African ID number against the Home Affairs database" />
            <ConnectionCard name="Experian TrueID" shortName="EXP" color="#ff6200" description="ID verification plus address history and phone number matching" />
            <ConnectionCard name="BVR Biometric" shortName="BVR" color="#0057b8" description="Selfie vs ID photo — confirms the person is real and present" />
            <ConnectionCard name="Home Affairs (HANIS)" shortName="HA" color="#006b3c" description="Direct lookup — checks if the ID is valid and the person is alive" />
          </div>

          {/* Section 2 — CREDIT BUREAUX */}
          <h3
            className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            CREDIT BUREAUX
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ConnectionCard name="TransUnion Credit" shortName="TU" color="#e4002b" description="Pull a consumer or business credit report from inside a contact record" />
            <ConnectionCard name="Experian Credit" shortName="EXP" color="#ff6200" description="Full credit report — score, defaults, judgements, payment history" />
            <ConnectionCard name="XDS (Xpert Decision)" shortName="XDS" color="#7b2d8b" description="Credit data, fraud alerts, and collections history" />
          </div>

          {/* Section 3 — FRAUD & SANCTIONS SCREENING */}
          <h3
            className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            FRAUD & SANCTIONS SCREENING
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <ConnectionCard name="AML Sanctions Screen" shortName="AML" color="#ef4444" description="Check if a client appears on any SA or international sanctions list" />
            <ConnectionCard name="PEP Check" shortName="PEP" color="#f59e0b" description="Politically Exposed Person screening — required for financial advisors" />
          </div>

          {/* Section 4 — HOW IT WORKS */}
          <h3
            className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            HOW IT WORKS
          </h3>
          <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] rounded-xl p-5 mt-2">
            <h4
              className="text-[14px] font-semibold text-[#eef2ff]"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              How it works once connected
            </h4>
            <div className="flex flex-col mt-2">
              {steps.map((text, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 py-2.5 border-b border-[rgba(255,255,255,0.04)] last:border-0"
                >
                  <div
                    className="w-6 h-6 rounded-full bg-[rgba(37,99,235,0.15)] flex items-center justify-center text-[#3b82f6] flex-shrink-0 font-bold text-[11px]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {index + 1}
                  </div>
                  <p
                    className="text-[12px] text-[#94a3c8]"
                    style={{ fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {text}
                  </p>
                </div>
              ))}
            </div>
            <p
              className="text-[11px] text-[#4a5a82] italic mt-3"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Every check requires the client's consent. LeadsMind records this automatically.
            </p>
          </div>

        </div>
      </div>
    </Wrapper>
  );
}
