'use client';

import React from 'react';

interface FinancialConnectionCardProps {
  name: string;
  shortName?: string;
  description?: string;
  color: string;
  comingSoon?: boolean;
  connected?: boolean;
}

export default function FinancialConnectionCard({
  name,
  shortName,
  description,
  color,
  comingSoon = true,
  connected = false,
}: FinancialConnectionCardProps) {
  const initials = shortName || name.substring(0, 2).toUpperCase();

  return (
    <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.13)] hover:bg-[rgba(21,37,80,0.9)] rounded-xl p-5 min-h-[100px] flex items-center justify-between gap-4 transition-all duration-200">
      {/* Left side */}
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}1F` }}
        >
          <span
            className="font-bold text-[13px]"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: color }}
          >
            {initials}
          </span>
        </div>
        
        <div className="flex flex-col gap-1 min-w-0">
          <h4
            className="text-[14px] font-semibold text-[#eef2ff] truncate leading-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {name}
          </h4>
          {description && (
            <p
              className="text-[12px] text-[#94a3c8] truncate leading-tight"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {comingSoon ? (
          <span
            className="bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)] text-[#f59e0b] text-[10.5px] font-semibold rounded-full px-3 py-1"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Coming Soon
          </span>
        ) : connected ? (
          <>
            <span
              className="text-[#10b981] bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[10.5px] font-semibold rounded-full px-3 py-1"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              ● Connected
            </span>
            <button
              type="button"
              className="bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] text-[#ef4444] text-[12px] font-semibold rounded-lg px-3 py-1.5 hover:bg-[rgba(239,68,68,0.15)] transition-colors"
              style={{ fontFamily: "'DM Sans', sans-serif" }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <button
            type="button"
            className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-[12px] font-semibold rounded-lg px-4 py-1.5 transition-colors"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            Connect
          </button>
        )}
      </div>
    </div>
  );
}
