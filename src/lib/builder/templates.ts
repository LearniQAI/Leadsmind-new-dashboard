import { ALL_TEMPLATES } from './templates/index';

export interface BuilderTemplate {
  id: string;
  name: string;
  description: string;
  category: string; // E.g. 'SaaS', 'Portfolio', 'E-commerce'
  type: 'website' | 'funnel' | 'both';
  thumbnail?: string;
  preview_image?: string;
  content: string; // CraftJS JSON
  is_premium?: boolean;
}

export const BLANK_PAGE = '{"ROOT":{"type":{"resolvedName":"Container"},"isCanvas":true,"props":{"className":"min-h-screen bg-white"},"nodes":[]}}';

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
  {
    id: 'blank-slate',
    name: 'Blank Slate',
    description: 'Start from scratch with a clean digital canvas.',
    category: 'General',
    type: 'both',
    thumbnail: 'https://images.unsplash.com/photo-1484417894907-623942c8ee29',
    content: BLANK_PAGE
  },
  ...ALL_TEMPLATES
];

export const getTemplateById = (id: string) => BUILDER_TEMPLATES.find(t => t.id === id);

