import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import { renderCertificateHtml, type CertificateConfig } from './cert-templates';

/**
 * Generates an A4 Landscape Completion Certificate PDF for a student.
 *
 * The HTML is produced by `renderCertificateHtml` (the shared built-in-templates module,
 * also used by the admin customization preview) — one of three premium built-in templates
 * or an admin-uploaded custom design, per the resolved per-course / per-workspace
 * `certificate_config`. Passing no config renders the default `classic` template, so
 * existing callers keep working unchanged.
 */
export async function generateCertificatePDF(payload: {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  validationId: string;
  config?: CertificateConfig | null;
}): Promise<Buffer> {
  const htmlContent = renderCertificateHtml(
    {
      studentName: payload.studentName,
      courseTitle: payload.courseTitle,
      completionDate: payload.completionDate,
      validationId: payload.validationId,
    },
    payload.config || {}
  );

  // @sparticuz/chromium is a Lambda (Amazon Linux) binary — it cannot launch on a local Windows/Mac dev
  // machine. Outside production fall back to the devDependency `puppeteer` (same approach as
  // src/lib/pdf/htmlToPdf.ts) so the real certificate download can be exercised in `next dev`.
  // Production behaviour is unchanged.
  const browser =
    process.env.NODE_ENV === 'production'
      ? await puppeteer.launch({
          args: chromium.args,
          executablePath: await chromium.executablePath(),
          headless: true,
        })
      : ((await (await import('puppeteer')).default.launch({ headless: true })) as any);

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1122, height: 794, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });
    const pdfBuffer = await page.pdf({
      width: '297mm',
      height: '210mm',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
