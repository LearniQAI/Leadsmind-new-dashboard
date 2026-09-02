-- Certificate design/branding configuration (Certificate System, Part 2).
--
-- Before this, libs/services/src/pdf/cert-generator.ts had ONE hard-coded HTML template with
-- zero customisation. This adds a per-course override with a per-workspace default fallback:
-- the PDF route resolves `courses.certificate_config ?? workspaces.certificate_config ?? {template:'classic'}`.
--
-- Shape (jsonb, all keys optional except `template`):
--   {
--     "template": "classic" | "modern" | "editorial",
--     "accentColor": "#RRGGBB",          -- template-dependent accent
--     "logoUrl": "https://.../logo.png",  -- workspace logo, uploaded via /api/lms/upload
--     "signatureName": "Jane Smith",
--     "signatureTitle": "Head of School",
--     "signatureImageUrl": "https://.../sig.png",
--     "customUpload": {                   -- Part 3: "upload your own design" mode
--       "imageUrl": "https://...",
--       "placements": { "<field>": { "xPct": 0-100, "yPct": 0-100, "fontSize": px, "color": "#hex", "align": "left|center|right" } }
--     }
--   }
-- When `customUpload.imageUrl` is set it supersedes `template`.

alter table courses     add column if not exists certificate_config jsonb;
alter table workspaces  add column if not exists certificate_config jsonb;

comment on column courses.certificate_config is
  'Per-course certificate design override (Part 2). Null -> fall back to workspaces.certificate_config -> built-in classic template.';
comment on column workspaces.certificate_config is
  'Workspace-default certificate design (Part 2). Used when a course has no certificate_config of its own.';
