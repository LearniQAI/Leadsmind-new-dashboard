'use client';

import React from 'react';

export function ContactRowSkeleton() {
  return (
    <tr className="border-b border-white/[0.03] hover:bg-transparent">
      {/* Checkbox Skeleton */}
      <td className="px-4 py-4 align-middle">
        <div className="w-4 h-4 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
      </td>
      
      {/* Lead Name & Avatar Skeleton */}
      <td className="px-4 py-4 align-middle">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-white/[0.04] animate-pulse shrink-0 shadow-none border border-transparent" />
          <div className="h-3 w-28 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
        </div>
      </td>

      {/* Email Address Skeleton */}
      <td className="px-4 py-4 align-middle">
        <div className="h-3 w-36 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
      </td>

      {/* Phone Number Skeleton */}
      <td className="px-4 py-4 align-middle">
        <div className="h-3 w-24 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
      </td>

      {/* Badges/Tags Skeleton */}
      <td className="px-4 py-4 align-middle">
        <div className="flex gap-1.5">
          <div className="h-4 w-10 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
          <div className="h-4 w-12 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
        </div>
      </td>

      {/* Last Activity Skeleton */}
      <td className="px-4 py-4 align-middle">
        <div className="h-3 w-16 rounded bg-white/[0.04] animate-pulse shadow-none border border-transparent" />
      </td>
    </tr>
  );
}
