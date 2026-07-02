import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { requireAuth } from '@/lib/auth/requireAuth';

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  try {
    const { title, html } = await req.json();
    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
    });

    const page = await browser.newPage();
    
    // Construct a premium styled PDF template
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${title || 'Document Outline'}</title>
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
          ul, ol {
            font-size: 12px;
            margin-bottom: 14px;
            padding-left: 20px;
          }
          li {
            margin-bottom: 6px;
          }
          blockquote {
            border-left: 4px solid #2563eb;
            padding-left: 16px;
            margin-left: 0;
            color: #475569;
            font-style: italic;
            background: #f8fafc;
            padding-top: 8px;
            padding-bottom: 8px;
          }
          pre, code {
            font-family: monospace;
            background: #f1f5f9;
            padding: 4px 6px;
            border-radius: 4px;
            font-size: 11px;
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
        <h1>${title || 'Untitled Document Outline'}</h1>
        <div class="content">
          ${html}
        </div>
        <div class="footer">
          Generated via LeadsMind Content Studio &copy; ${new Date().getFullYear()}
        </div>
      </body>
      </html>
    `;

    await page.setContent(pdfHtml, { waitUntil: 'domcontentloaded' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '20mm',
        bottom: '20mm',
        left: '20mm'
      }
    });

    await browser.close();

    const response = new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(title || 'document')}.pdf"`
      }
    });
    
    return response;
  } catch (err: any) {
    console.error('PDF Generation error:', err);
    return NextResponse.json({ error: err.message || 'PDF generation failed' }, { status: 500 });
  }
}
