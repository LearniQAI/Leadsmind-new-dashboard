'use client';

import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import ConnectionCard from '@/components/settings/ConnectionCard';

export default function FinancialConnectionsPage() {
  return (
    <Wrapper>
      <div className="min-h-screen bg-[#04091a] px-6 py-6 max-w-3xl">
        {/* Page Title */}
        <div>
          <h1
            className="text-[22px] font-bold leading-tight"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Bank & <span className="text-[#3b82f6]">Payments</span>
          </h1>
          <p
            className="text-[11.5px] uppercase tracking-[0.8px] font-medium mt-1 text-[#4a5a82]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Connect your bank account or payment gateway to import transactions automatically.
          </p>
        </div>

        {/* Amber Banner */}
        <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.15)] rounded-xl p-4 mt-6 flex items-start gap-3">
          <span className="text-[#f59e0b] text-base leading-none select-none">⚠</span>
          <p
            className="text-[12px] text-[#94a3c8] leading-normal"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            These connections are not live yet. We are showing you what will be available. You will get a notification when each one is ready.
          </p>
        </div>

        {/* Section 1 — Your Bank Account */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          YOUR BANK ACCOUNT
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConnectionCard name="First National Bank" shortName="FNB" color="#e60028" description="Import your FNB transactions daily — personal or business account" />
          <ConnectionCard name="Absa" shortName="AB" color="#dc0000" description="Sync your Absa account balance and transactions automatically" />
          <ConnectionCard name="Capitec Business" shortName="CAP" color="#0033a0" description="Connect your Capitec Business account for transaction imports" />
          <ConnectionCard name="Standard Bank" shortName="SB" color="#0072bc" description="Link your Standard Bank account — personal or business" />
          <ConnectionCard name="Nedbank" shortName="NED" color="#007b40" description="Connect your Nedbank account for daily transaction sync" />
          <ConnectionCard name="Investec" shortName="INV" color="#004f9f" description="Real-time transaction sync — updates every 15 minutes" />
          <ConnectionCard name="TymeBank" shortName="TYM" color="#ff6600" description="Use statement upload for now — direct connection coming soon" />
          <ConnectionCard name="Discovery Bank" shortName="DB" color="#da0000" description="Connect your Discovery Bank account" />
        </div>
        <p
          className="text-[11px] text-[#4a5a82] italic mt-2"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Don't see your bank? Use the statement upload below — it works with any SA bank.
        </p>

        {/* Section 2 — Payment Gateways */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          PAYMENT GATEWAYS
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConnectionCard name="PayFast" shortName="PF" color="#00b8f0" description="Automatically mark invoices as paid when a PayFast payment arrives" />
          <ConnectionCard name="Ozow" shortName="OZ" color="#00c49a" description="Instant EFT — know the moment money lands" />
          <ConnectionCard name="Peach Payments" shortName="PP" color="#ff6b35" description="Card and EFT reconciliation for high-volume merchants" />
          <ConnectionCard name="Yoco" shortName="YC" color="#fd7c35" description="In-person card payments create a LeadsMind invoice automatically" />
          <ConnectionCard name="SnapScan" shortName="SS" color="#e91e63" description="QR code payment notifications — popular in Western Cape" />
        </div>

        {/* Section 3 — Tax & Government */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          TAX & GOVERNMENT
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ConnectionCard name="SARS eFiling" shortName="SARS" color="#1e5aa8" description="Auto-submit your VAT201 and EMP201 returns directly from LeadsMind" />
          <ConnectionCard name="CIPC" shortName="CIPC" color="#006b3c" description="Check company registration status and director details instantly" />
        </div>

        {/* Section 4 — Upload a Bank Statement */}
        <h3
          className="text-[10px] font-semibold uppercase tracking-[1.2px] text-[#4a5a82] mb-3 mt-8"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          UPLOAD A BANK STATEMENT
        </h3>
        <div className="bg-[rgba(255,255,255,0.02)] border border-dashed border-[rgba(255,255,255,0.12)] rounded-xl p-8 flex flex-col items-center text-center gap-3">
          <i className="fa-solid fa-file-arrow-up text-[28px] text-[#4a5a82] opacity-50" />
          <h4
            className="text-[13px] font-medium text-[#eef2ff]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Upload a Bank Statement
          </h4>
          <p
            className="text-[12px] text-[#94a3c8] max-w-xs leading-normal"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Works with any SA bank. Supports CSV, OFX, and QIF files. Transactions are imported and categorised automatically.
          </p>
          <button
            type="button"
            className="bg-[rgba(255,255,255,0.06)] border border-[rgba(255,255,255,0.07)] text-[#94a3c8] text-[12px] font-semibold rounded-lg px-4 py-2 hover:text-[#eef2ff] hover:border-[rgba(255,255,255,0.13)] transition-all"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Choose File
          </button>
          <p
            className="text-[11px] text-[#4a5a82] italic leading-normal"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Your statement is processed privately inside your workspace and never shared.
          </p>
        </div>
      </div>
    </Wrapper>
  );
}
