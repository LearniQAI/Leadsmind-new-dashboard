import chromium from '@sparticuz/chromium';
import puppeteerCore, { type Browser } from 'puppeteer-core';

// Shared Puppeteer/Chromium engine — the same one exposed over HTTP at
// /api/pdf/route.ts (used by quotes/Content Studio browser downloads).
// Extracted so server-side callers with no authenticated browser session
// (e.g. automation step handlers in actions_registry.ts) can render a PDF
// buffer directly, without a self-fetch through requireAuth().
//
// @sparticuz/chromium ships a precompiled binary built for AWS Lambda's
// Amazon Linux runtime (which is what Vercel's serverless functions run
// on) — it has nothing to launch on a local Windows/Mac dev machine
// ("Failed to launch the browser process: spawn .../chromium ENOENT").
// Locally, fall back to the full `puppeteer` package (devDependency
// only — never installed in the production bundle), which downloads and
// bundles a real Chromium for whatever OS it's installed on, so every
// caller of htmlToPdfBuffer (quote/invoice send, PDF downloads,
// payslips) can actually be exercised in `next dev`.
async function launchBrowser(): Promise<Browser> {
  if (process.env.NODE_ENV === 'production') {
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const { default: puppeteer } = await import('puppeteer');
  return puppeteer.launch({ headless: true }) as unknown as Promise<Browser>;
}

export async function htmlToPdfBuffer(html: string, title?: string): Promise<Buffer> {
  const browser = await launchBrowser();

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
