-- Widen help_articles category check constraint to add Social Media and AI Tools categories,
-- needed for the accurate, code-verified LENA product-assistant knowledge base rewrite.
ALTER TABLE public.help_articles DROP CONSTRAINT IF EXISTS help_articles_category_check;
ALTER TABLE public.help_articles ADD CONSTRAINT help_articles_category_check CHECK (category IN (
    'Getting Started',
    'CRM Foundations',
    'LMS Advanced Workflows',
    'Accounting & Finance',
    'Invoicing & Automated Payments',
    'Email Marketing System',
    'Workflow Automation',
    'System Controls & Extensions',
    'Social Media',
    'AI Tools'
));
