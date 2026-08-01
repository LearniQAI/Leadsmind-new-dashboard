import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

// Shared Puppeteer/Chromium engine — the same one exposed over HTTP at
// /api/pdf/route.ts (used by quotes/Content Studio browser downloads).
// Extracted so server-side callers with no authenticated browser session
// (e.g. automation step handlers in actions_registry.ts) can render a PDF
// buffer directly, without a self-fetch through requireAuth().
export async function htmlToPdfBuffer(html: string, title?: string): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();

    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title || 'Document'}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
          body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 40px;
            background-color: #ffffff;
          }
          h1 {
            font-size: 26px;
            font-weight: 700;
            color: #0f172a;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 12px;
            margin-bottom: 24px;
          }
          h2 {
            font-size: 18px;
            font-weight: 600;
            color: #1e293b;
            margin-top: 28px;
            margin-bottom: 12px;
          }
          h3 {
            font-size: 14px;
            font-weight: 600;
            color: #334155;
            margin-top: 20px;
            margin-bottom: 8px;
          }
          p {
            font-size: 12px;
            margin-bottom: 14px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .footer {
            margin-top: 60px;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
            font-size: 9px;
            color: #94a3b8;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <h1>${title || 'Untitled Document'}</h1>
        <div class="content">
          ${html}
        </div>
        <div class="footer">
          Generated via LeadsMind &copy; ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;

    await page.setContent(pdfHtml, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
    });

    return pdfBuffer as Buffer;
  } finally {
    await browser.close();
  }
}
