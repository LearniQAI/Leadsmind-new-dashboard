'use client';

import React, { useState } from 'react';
import Image from 'next/image';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface UserAvatarProps {
  /** User's custom-uploaded avatar URL */
  avatarUrl?: string | null;
  /** OAuth profile image (Google, GitHub, etc.) */
  oauthImage?: string | null;
  /** User's first name — used for initials fallback */
  firstName?: string | null;
  /** User's last name — used for initials fallback */
  lastName?: string | null;
  /** Size variant */
  size?: AvatarSize;
  /** Show online status indicator */
  showOnlineIndicator?: boolean;
  /** Show skeleton loading state */
  isLoading?: boolean;
  /** Extra classes */
  className?: string;
}

const sizeMap: Record<AvatarSize, { px: number; text: string; indicator: string; indicatorBorder: string }> = {
  xs: { px: 20, text: 'text-[8px]',  indicator: 'w-1.5 h-1.5', indicatorBorder: 'border-[1.5px]' },
  sm: { px: 28, text: 'text-[11px]', indicator: 'w-2.5 h-2.5', indicatorBorder: 'border-2' },
  md: { px: 36, text: 'text-[13px]', indicator: 'w-3 h-3',     indicatorBorder: 'border-2' },
  lg: { px: 48, text: 'text-[16px]', indicator: 'w-3.5 h-3.5', indicatorBorder: 'border-2' },
  xl: { px: 56, text: 'text-[18px]', indicator: 'w-4 h-4',     indicatorBorder: 'border-[3px]' },
};

function generateInitials(firstName?: string | null, lastName?: string | null): string {
  const first = firstName?.[0]?.toUpperCase() || '';
  const last = lastName?.[0]?.toUpperCase() || '';
  if (first && last) return `${first}${last}`;
  if (first) return first;
  return 'U';
}

/**
 * Reusable UserAvatar component with:
 * - Professional fallback hierarchy: uploaded avatar → OAuth image → generated initials
 * - Size variants: xs, sm, md, lg, xl
 * - Online status indicator
 * - Smooth image loading with fade-in
 * - Graceful error handling (never shows broken image icons)
 */
export default function UserAvatar({
  avatarUrl,
  oauthImage,
  firstName,
  lastName,
  size = 'sm',
  showOnlineIndicator = false,
  isLoading = false,
  className = '',
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const config = sizeMap[size];
  const initials = generateInitials(firstName, lastName);

  // Priority: uploaded avatar → OAuth image → null (initials)
  const resolvedUrl = (!imageError && avatarUrl) || (!imageError && oauthImage) || null;

  // If the primary URL fails, try the secondary
  const handleError = () => {
    setImageError(true);
  };

  // Skeleton
  if (isLoading) {
    return (
      <div
        className={`rounded-full bg-slate-200 animate-pulse flex-shrink-0 ${className}`}
        style={{ width: config.px, height: config.px }}
      />
    );
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`} style={{ width: config.px, height: config.px }}>
      {resolvedUrl ? (
        <>
          {/* Placeholder behind the image while loading */}
          {!imageLoaded && (
            <div
              className="absolute inset-0 rounded-full bg-slate-200 animate-pulse"
              style={{ width: config.px, height: config.px }}
            />
          )}
          <Image
            src={resolvedUrl}
            alt={firstName || 'User'}
            width={config.px}
            height={config.px}
            className={`rounded-full object-cover border border-slate-200 transition-opacity duration-150 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ width: config.px, height: config.px }}
            onLoad={() => setImageLoaded(true)}
            onError={handleError}
            unoptimized
          />
        </>
      ) : (
        <div
          className={`rounded-full bg-primary flex items-center justify-center !text-white font-bold ${config.text}`}
          style={{ width: config.px, height: config.px }}
        >
          {initials}
        </div>
      )}

      {/* Online indicator */}
      {showOnlineIndicator && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${config.indicator} bg-emerald-500 rounded-full ${config.indicatorBorder} border-white`}
        />
      )}
    </div>
  );
}
