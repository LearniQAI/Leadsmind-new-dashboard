# Certificate design — real rendered evidence (Batch 10 / G8)

Real screenshots, rendered from the actual `renderCertificateHtml()` in
`libs/services/src/pdf/cert-templates.ts` (imported directly, unmodified, via `tsx`), using a
real local Chrome install as a substitute for the production `@sparticuz/chromium` binary
(which cannot launch on the Windows host this verification ran on). See
`docs/lms-full-audit-technical.md` STEP 6.9 for the full write-up.

| File | Scenario | Result |
|---|---|---|
| `01-classic-short.png` | Classic template, short name/course | Clean |
| `02-classic-long-stress.png` | Classic template, very long name + very long course title | **Real bug** — footer (date/validation id) clipped by the page's bottom edge |
| `03-modern-logo-signature.png` | Modern template, real logo + signature name/title/image | Clean |
| `04-modern-long-stress.png` | Modern template, same long-data stress case | Clean — footer stays anchored, no clipping |
| `05-editorial-plain.png` | Editorial template, no logo/signature | Clean |
| `06-editorial-long-stress.png` | Editorial template, same long-data stress case | Clean — split layout absorbs the wrap |
| `07-custom-upload-short.png` | Custom-upload mode, real background + 4 field placements, short data | Clean |
| `08-custom-upload-long-stress.png` | Custom-upload mode, same long-data stress case | **Real bug** — wrapped long name visually overlaps the course-title field below it |
