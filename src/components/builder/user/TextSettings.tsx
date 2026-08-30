"use client";

import React from 'react';
import { TypographyControl } from '../inspector/TypographyControl';

// Part 2 (Text Element Typography Controls): now uses the real shared TypographyControl
// (font size, line height, font type/family/style, letter spacing, color, alignment — all
// with real 2-way slider<->number sync and a real searchable Google Fonts picker) instead of
// the old font-size-only panel. Text.tsx's own props (fontSize/textAlign/color/fontFamily/
// fontWeight/lineHeight/letterSpacing) are all raw-value (px numbers / literal family names /
// real Google Fonts variant strings) with no enum-based props to collide with, unlike
// Heading/Paragraph — the cleanest of the 3 to swap wholesale rather than extend in place.
export const TextSettings = () => <TypographyControl withLayoutSections />;
