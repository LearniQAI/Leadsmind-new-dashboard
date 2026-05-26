'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export interface AvatarImageProps {
  src?: string | null;
  emailPresetUrl?: string | null;
  avatarPresetId?: string | null;
  emailMode?: boolean;
  workspaceId?: string | null;
  teamMemberId?: string | null;
  initials?: string;
  bgColor?: string;
  size?: number; // Size in pixels, e.g. 40, 56, 112
  shape?: 'circle' | 'square' | 'squircle';
  borderColor?: string;
  borderOpacity?: number; // Opacity of the border (0 to 1)
  className?: string;
}

export const AvatarImage: React.FC<AvatarImageProps> = ({
  src,
  emailPresetUrl,
  avatarPresetId,
  emailMode = false,
  workspaceId,
  teamMemberId,
  initials = 'LM',
  bgColor = '#3b82f6',
  size = 40,
  shape = 'circle',
  borderColor = 'rgba(255, 255, 255, 0.15)',
  borderOpacity = 0.8,
  className,
}) => {
  const [srcError, setSrcError] = useState(false);
  const [presetError, setPresetError] = useState(false);

  // Compute preset URL if emailMode is active
  let presetUrl = emailPresetUrl;
  if (emailMode && avatarPresetId) {
    if (workspaceId && teamMemberId) {
      presetUrl = `/storage/v1/object/public/avatars/${workspaceId}/${teamMemberId}/email-avatar.png`;
    } else {
      presetUrl = `/assets/presets/${avatarPresetId}.png`;
    }
  }

  // Reset error states when URLs change to allow re-fetching
  useEffect(() => {
    setSrcError(false);
  }, [src]);

  useEffect(() => {
    setPresetError(false);
  }, [presetUrl]);

  // Determine shape styles
  let borderRadiusStyle = '50%'; // default circle
  if (shape === 'square') {
    borderRadiusStyle = '4px';
  } else if (shape === 'squircle') {
    borderRadiusStyle = '30%';
  }

  // Render hierarchy
  const showUploaded = src && !srcError;
  const showPreset = !showUploaded && presetUrl && !presetError;
  const showFallback = !showUploaded && !showPreset;

  // Border styles for image container
  const borderStyle: React.CSSProperties = showFallback ? {} : {
    borderColor: borderColor,
    borderWidth: '1px',
    borderStyle: 'solid',
    opacity: borderOpacity,
  };

  const containerStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: borderRadiusStyle,
    transition: 'all 0.18s ease-in-out',
    userSelect: 'none',
    flexShrink: 0,
    ...borderStyle,
  };

  // Determine border color and opacity for initials fallback (spec constraints)
  const initialsColor = bgColor || '#3b82f6';
  const hasHash = initialsColor.startsWith('#');
  const fallbackBg = hasHash ? initialsColor + '33' : 'rgba(59, 130, 246, 0.2)'; // 20% opacity
  const fallbackBorder = hasHash ? initialsColor + '44' : 'rgba(59, 130, 246, 0.27)'; // 27% opacity
  
  const fontScale = size * 0.35; // dynamic font size exactly 35% of frame container size

  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden select-none shrink-0 hover:scale-[1.05] hover:border-white/20 shadow-md",
        className
      )}
      style={containerStyle}
    >
      {showUploaded && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={initials}
          className="w-full h-full object-cover"
          onError={() => setSrcError(true)}
        />
      )}
      
      {showPreset && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={presetUrl}
          alt={initials}
          className="w-full h-full object-cover"
          onError={() => setPresetError(true)}
        />
      )}

      {showFallback && (
        <div
          className="w-full h-full flex items-center justify-center font-bold"
          style={{
            fontFamily: "Arial, sans-serif",
            fontSize: `${fontScale}px`,
            fontWeight: 'bold',
            color: initialsColor,
            backgroundColor: fallbackBg,
            border: `2px solid ${fallbackBorder}`,
            borderRadius: borderRadiusStyle,
            boxSizing: 'border-box',
          }}
        >
          {initials.toUpperCase().slice(0, 2)}
        </div>
      )}
    </div>
  );
};

export default AvatarImage;
