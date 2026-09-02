// Built-in premium certificate templates (Certificate System, Part 2).
//
// PURE, dependency-free: `renderCertificateHtml` returns a self-contained A4-landscape
// (297mm x 210mm) HTML document. It's imported BOTH by cert-generator.ts (server, Puppeteer)
// AND by the admin customization UI (browser, rendered into a scaled <iframe srcDoc>) so the
// picker thumbnails and the live preview are genuine renders of the exact template the PDF
// route will use — never a hand-built mock.

export type CertificateTemplateId = 'classic' | 'modern' | 'editorial';

export interface CertificatePlacement {
  xPct: number; // 0-100, left edge of the text box
  yPct: number; // 0-100, top edge of the text box
  fontSize: number; // px
  color: string;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface CertificateConfig {
  template?: CertificateTemplateId;
  accentColor?: string | null;
  logoUrl?: string | null;
  signatureName?: string | null;
  signatureTitle?: string | null;
  signatureImageUrl?: string | null;
  /** Part 3 — "upload your own design" mode. When imageUrl is set it supersedes `template`. */
  customUpload?: {
    imageUrl?: string | null;
    placements?: Partial<Record<'studentName' | 'courseTitle' | 'completionDate' | 'validationId', CertificatePlacement>>;
  } | null;
}

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  validationId: string;
}

export const CERT_TEMPLATE_META: {
  id: CertificateTemplateId;
  name: string;
  description: string;
  defaultAccent: string;
}[] = [
  {
    id: 'classic',
    name: 'Classic Formal',
    description: 'Ornate double border, centred composition, wax-seal medallion. Cinzel serif.',
    defaultAccent: '#8a6d1d',
  },
  {
    id: 'modern',
    name: 'Modern Minimal',
    description: 'White field, a single bold accent rail, left-aligned type, oversized name.',
    defaultAccent: '#1359FF',
  },
  {
    id: 'editorial',
    name: 'Bold Editorial',
    description: 'Split layout with a solid accent panel, condensed display name, chip-set course title.',
    defaultAccent: '#111827',
  },
];

const esc = (s: string) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const PAGE = `width:297mm;height:210mm;box-sizing:border-box;margin:0;padding:0;overflow:hidden;`;

/* ------------------------------------------------------------------ classic */
function classic(d: CertificateData, c: CertificateConfig): string {
  const accent = c.accentColor || '#8a6d1d';
  const logo = c.logoUrl
    ? `<img src="${esc(c.logoUrl)}" alt="" style="max-height:16mm;max-width:60mm;object-fit:contain;margin-bottom:5mm;" />`
    : '';
  const sig = signatureBlock(c, accent, 'serif');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{${PAGE}font-family:'EB Garamond',serif;color:#2a2317;background:#fbf7ee}
.frame{${PAGE}padding:10mm}
.border-outer{width:100%;height:100%;border:3mm solid ${accent};position:relative;background:
  radial-gradient(120% 120% at 50% 0%, #ffffff 0%, #fbf7ee 55%, #f3ead5 100%)}
.border-inner{position:absolute;inset:5mm;border:0.6mm solid ${hexA(accent, 0.5)}}
.content{position:absolute;inset:5mm;display:flex;flex-direction:column;align-items:center;
  justify-content:space-between;text-align:center;padding:14mm 22mm}
.top{display:flex;flex-direction:column;align-items:center}
.wordmark{font-family:'Cinzel',serif;font-weight:700;font-size:13pt;letter-spacing:6px;color:${accent}}
.title{font-family:'Cinzel',serif;font-weight:800;font-size:34pt;letter-spacing:6px;color:#241d10;margin-top:9mm;line-height:1}
.rule{width:38mm;height:1mm;background:${accent};margin:5mm 0 4mm}
.eyebrow{font-size:11pt;letter-spacing:3px;text-transform:uppercase;color:${hexA('#2a2317', 0.55)}}
.name{font-family:'Cinzel',serif;font-weight:700;font-size:30pt;color:${accent};letter-spacing:2px;
  border-bottom:1.4mm solid ${hexA(accent, 0.35)};padding:0 8mm 3mm;margin-top:7mm;max-width:200mm}
.body{font-size:13pt;line-height:1.7;color:${hexA('#2a2317', 0.8)};max-width:150mm;margin-top:7mm}
.course{font-family:'Cinzel',serif;font-weight:600;font-size:16pt;color:#241d10;margin-top:3mm}
.seal{width:26mm;height:26mm;border-radius:50%;margin-top:8mm;
  background:radial-gradient(circle at 35% 30%, #fff6d8, ${accent} 70%);
  border:1.5mm solid #fff;box-shadow:0 0 0 0.6mm ${accent};
  display:flex;align-items:center;justify-content:center}
.seal span{width:20mm;height:20mm;border:0.5mm dashed rgba(255,255,255,.8);border-radius:50%;
  display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:6.5pt;
  font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:1px;text-align:center}
.footer{width:100%;display:flex;justify-content:space-between;align-items:flex-end;margin-top:8mm}
.foot-col{width:70mm;text-align:center}
.foot-label{font-size:8.5pt;letter-spacing:2px;text-transform:uppercase;color:${hexA(accent, 0.75)};margin-bottom:1mm}
.foot-val{font-size:11pt;font-weight:500;color:#241d10}
.vid{font-family:ui-monospace,Menlo,monospace;font-size:8.5pt;color:${hexA('#2a2317', 0.5)};letter-spacing:1px}
</style></head><body>
<div class="frame"><div class="border-outer"><div class="border-inner"></div>
  <div class="content">
    <div class="top">
      ${logo}
      <div class="wordmark">CERTIFICATE</div>
      <div class="title">OF COMPLETION</div>
      <div class="rule"></div>
      <div class="eyebrow">This is proudly presented to</div>
      <div class="name">${esc(d.studentName)}</div>
      <div class="body">for successfully fulfilling every requirement of the course
        <div class="course">${esc(d.courseTitle)}</div>
      </div>
      <div class="seal"><span>Verified<br/>Graduate</span></div>
    </div>
    <div class="footer">
      <div class="foot-col"><div class="foot-val">${esc(d.completionDate)}</div><div class="foot-label">Date of completion</div></div>
      <div class="foot-col"><div class="foot-label">Validation ID</div><div class="vid">${esc(d.validationId)}</div></div>
      ${sig}
    </div>
  </div>
</div></div>
</body></html>`;
}

/* ------------------------------------------------------------------- modern */
function modern(d: CertificateData, c: CertificateConfig): string {
  const accent = c.accentColor || '#1359FF';
  const logo = c.logoUrl
    ? `<img src="${esc(c.logoUrl)}" alt="" style="max-height:12mm;max-width:52mm;object-fit:contain" />`
    : `<div style="font-weight:800;font-size:11pt;letter-spacing:3px;color:${accent}">LEADSMIND</div>`;
  const sig = signatureBlock(c, accent, 'sans');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{${PAGE}font-family:'Inter',system-ui,sans-serif;color:#0f172a;background:#ffffff}
.wrap{${PAGE};position:relative;padding:22mm 26mm 20mm 40mm}
.rail{position:absolute;left:0;top:0;bottom:0;width:14mm;background:${accent}}
.rail::after{content:"";position:absolute;left:14mm;top:0;bottom:0;width:2mm;background:${hexA(accent, 0.25)}}
.head{display:flex;align-items:center;justify-content:space-between}
.eyebrow{font-size:10pt;font-weight:600;letter-spacing:4px;text-transform:uppercase;color:${accent};margin-top:20mm}
.title{font-size:22pt;font-weight:800;letter-spacing:-0.5px;color:#0f172a;margin-top:2mm}
.lead{font-size:11.5pt;color:#475569;margin-top:9mm}
.name{font-size:40pt;font-weight:800;letter-spacing:-1.5px;line-height:1.05;color:#0f172a;margin-top:3mm}
.hr{width:46mm;height:1.4mm;background:${accent};margin:7mm 0}
.meta{font-size:12pt;color:#334155;line-height:1.9}
.meta b{color:#0f172a;font-weight:700}
.bottom{position:absolute;left:40mm;right:26mm;bottom:18mm;display:flex;justify-content:space-between;align-items:flex-end}
.vid-label{font-size:8pt;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#94a3b8}
.vid{font-family:ui-monospace,Menlo,monospace;font-size:9pt;color:#64748b;letter-spacing:1px;margin-top:1mm}
</style></head><body>
<div class="wrap">
  <div class="rail"></div>
  <div class="head">${logo}<span style="font-size:9pt;color:#94a3b8">${esc(d.completionDate)}</span></div>
  <div class="eyebrow">Certificate of Completion</div>
  <div class="title">This certifies that</div>
  <div class="name">${esc(d.studentName)}</div>
  <div class="hr"></div>
  <div class="meta">has successfully completed<br/><b>${esc(d.courseTitle)}</b></div>
  <div class="bottom">
    <div><div class="vid-label">Validation ID</div><div class="vid">${esc(d.validationId)}</div></div>
    ${sig}
  </div>
</div>
</body></html>`;
}

/* ---------------------------------------------------------------- editorial */
function editorial(d: CertificateData, c: CertificateConfig): string {
  const accent = c.accentColor || '#111827';
  const logo = c.logoUrl
    ? `<img src="${esc(c.logoUrl)}" alt="" style="max-height:13mm;max-width:52mm;object-fit:contain;filter:brightness(0) invert(1)" />`
    : `<div style="font-weight:800;font-size:12pt;letter-spacing:3px;color:#fff">LEADSMIND</div>`;
  const sig = signatureBlock(c, '#0f172a', 'sans');
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
@import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;900&family=Archivo+Expanded:wght@700;900&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{${PAGE}font-family:'Archivo',system-ui,sans-serif;color:#0f172a;background:#ffffff}
.grid{${PAGE};display:grid;grid-template-columns:62% 38%}
.left{padding:24mm 18mm 18mm 22mm;display:flex;flex-direction:column;justify-content:space-between}
.kicker{font-size:10pt;font-weight:700;letter-spacing:5px;text-transform:uppercase;color:${accent}}
.name{font-family:'Archivo Expanded','Archivo',sans-serif;font-weight:900;font-size:42pt;line-height:0.98;
  letter-spacing:-1.5px;color:#0f172a;margin-top:6mm;text-transform:uppercase}
.for{font-size:11pt;color:#64748b;margin-top:10mm;text-transform:uppercase;letter-spacing:2px}
.chip{display:inline-block;background:${accent};color:#fff;font-weight:700;font-size:15pt;
  padding:3mm 6mm;border-radius:2mm;margin-top:3mm;max-width:150mm}
.date{font-size:13pt;font-weight:700;color:#0f172a;margin-top:9mm}
.date span{display:block;font-size:9pt;font-weight:500;letter-spacing:2px;text-transform:uppercase;color:#94a3b8}
.right{background:${accent};color:#fff;padding:22mm 16mm;display:flex;flex-direction:column;justify-content:space-between}
.right .top{display:flex;flex-direction:column;gap:8mm}
.badge{font-family:'Archivo Expanded','Archivo',sans-serif;font-weight:900;font-size:20pt;line-height:1;color:#fff}
.badge span{display:block;font-size:9pt;font-weight:500;letter-spacing:3px;opacity:.7;margin-top:2mm}
.vid-label{font-size:8pt;font-weight:700;letter-spacing:2px;text-transform:uppercase;opacity:.6}
.vid{font-family:ui-monospace,Menlo,monospace;font-size:9.5pt;letter-spacing:1px;margin-top:1mm;word-break:break-all}
</style></head><body>
<div class="grid">
  <div class="left">
    <div>
      <div class="kicker">Awarded to</div>
      <div class="name">${esc(d.studentName)}</div>
      <div class="for">for completing</div>
      <div class="chip">${esc(d.courseTitle)}</div>
      <div class="date">${esc(d.completionDate)}<span>Date of completion</span></div>
    </div>
    ${sig}
  </div>
  <div class="right">
    <div class="top">
      ${logo}
      <div class="badge">CERTIFIED<span>Course completion</span></div>
    </div>
    <div><div class="vid-label">Validation ID</div><div class="vid">${esc(d.validationId)}</div></div>
  </div>
</div>
</body></html>`;
}

/* ------------------------------------------------------------- custom upload */
function customUpload(d: CertificateData, c: CertificateConfig): string {
  const cu = c.customUpload!;
  const fields: { key: keyof typeof d; val: string }[] = [
    { key: 'studentName', val: d.studentName },
    { key: 'courseTitle', val: d.courseTitle },
    { key: 'completionDate', val: d.completionDate },
    { key: 'validationId', val: d.validationId },
  ];
  const layers = fields
    .map(({ key, val }) => {
      const p = cu.placements?.[key];
      if (!p) return '';
      return `<div style="position:absolute;left:${p.xPct}%;top:${p.yPct}%;transform:${
        p.align === 'center' ? 'translate(-50%,-50%)' : p.align === 'right' ? 'translate(-100%,-50%)' : 'translate(0,-50%)'
      };font-size:${p.fontSize}px;color:${esc(p.color)};font-weight:${p.bold ? 700 : 400};
      text-align:${p.align};max-width:80%;line-height:1.2;white-space:pre-wrap">${esc(val)}</div>`;
    })
    .join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
*{margin:0;padding:0;box-sizing:border-box}
body{${PAGE}font-family:'Inter',system-ui,sans-serif;background:#fff;position:relative}
.bg{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;object-position:center}
</style></head><body>
${cu.imageUrl ? `<img class="bg" src="${esc(cu.imageUrl)}" alt="" />` : ''}
${layers}
</body></html>`;
}

const signatureBlock = (c: CertificateConfig, color: string, family: 'serif' | 'sans'): string => {
  const hasImg = !!c.signatureImageUrl;
  const hasName = !!(c.signatureName && c.signatureName.trim());
  if (!hasImg && !hasName) return `<div style="width:60mm"></div>`;
  const ff = family === 'serif' ? `font-family:'Cinzel',serif` : `font-family:'Inter',sans-serif`;
  return `<div style="width:64mm;text-align:center;border-top:0.5mm solid ${hexA(color, 0.3)};padding-top:2mm">
    ${hasImg ? `<img src="${esc(c.signatureImageUrl!)}" alt="" style="max-height:12mm;max-width:52mm;object-fit:contain;margin-bottom:1mm" />` : ''}
    ${hasName ? `<div style="${ff};font-weight:700;font-size:11pt;color:${color}">${esc(c.signatureName!)}</div>` : ''}
    ${c.signatureTitle ? `<div style="font-size:8.5pt;letter-spacing:1.5px;text-transform:uppercase;color:${hexA(color, 0.55)};margin-top:0.5mm">${esc(c.signatureTitle)}</div>` : ''}
  </div>`;
};

/** #rrggbb + alpha -> rgba() string. Falls back to the input for non-hex values. */
function hexA(hex: string, alpha: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function renderCertificateHtml(data: CertificateData, config: CertificateConfig = {}): string {
  if (config.customUpload?.imageUrl) return customUpload(data, config);
  switch (config.template) {
    case 'modern':
      return modern(data, config);
    case 'editorial':
      return editorial(data, config);
    case 'classic':
    default:
      return classic(data, config);
  }
}

export const CERT_SAMPLE_DATA: CertificateData = {
  studentName: 'Alex Morgan',
  courseTitle: 'Foundations of Data Analytics',
  completionDate: 'March 14, 2026',
  validationId: 'LM-DATA-A1B2-9F3E7C4D',
};
