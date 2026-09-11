import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { renderBookkeepingReportHtml, type BookkeepingReportData } from './bookkeeping-report-template';

/** Generates the downloadable AI Bookkeeping Report PDF — same Puppeteer HTML-to-PDF pattern as generateCertificatePDF (cert-generator.ts). */
export async function generateBookkeepingReportPDF(data: BookkeepingReportData): Promise<Buffer> {
  const htmlContent = renderBookkeepingReportHtml(data);

  const browser = await puppeteer.launch({
    args: chromium.args,
    executablePath: await chromium.executablePath(),
    headless: true,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
