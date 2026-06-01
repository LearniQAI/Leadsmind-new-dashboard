'use client';

import React from 'react';

interface ConnectionCardProps {
  name: string;
  shortName: string;
  description: string;
  color: string;
  comingSoon?: boolean;
  connected?: boolean;
}

export default function ConnectionCard({
  name,
  shortName,
  description,
  color,
  comingSoon = true,
  connected = false,
}: ConnectionCardProps) {
  return (
    <div className="bg-[rgba(12,21,53,0.85)] border border-[rgba(255,255,255,0.07)] hover:border-[rgba(255,255,255,0.13)] hover:bg-[rgba(21,37,80,0.9)] rounded-xl p-5 flex items-center justify-between transition-all duration-200 gap-4">
      {/* Left side */}
      <div className="flex items-center min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${color}1F` }}
        >
          <span
            className="font-bold text-[12px]"
            style={{ fontFamily: "'Space Grotesk', sans-serif", color: color }}
          >
            {shortName}
          </span>
        </div>
        <div className="ml-3 min-w-0 flex flex-col">
          <h4
            className="text-[14px] font-semibold text-[#eef2ff] leading-none"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            {name}
          </h4>
          <p
            className="text-[12px] text-[#94a3c8] mt-0.5 truncate leading-tight"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {description}
          </p>
        </div>
      </div>

      {/* Right side */}
      <div className="flex-shrink-0">
        {connected ? (
          <span
            className="bg-[rgba(16,185,129,0.12)] border border-[rgba(16,185,129,0.2)] text-[#10b981] text-[10.5px] font-semibold rounded-full px-3 py-1"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ● Connected
          </span>
        ) : null}
      </div>
    </div>
  );
}
