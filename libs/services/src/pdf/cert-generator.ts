import puppeteer from 'puppeteer';

/**
 * Generates an A4 Landscape Completion Certificate PDF for a student.
 */
export async function generateCertificatePDF(payload: {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  validationId: string;
}): Promise<Buffer> {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Certificate of Completion</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800&family=Montserrat:wght@300;400;600;700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          background-color: #04091a;
          color: #ffffff;
          font-family: 'Montserrat', sans-serif;
          width: 297mm;
          height: 210mm;
          box-sizing: border-box;
        }

        .cert-container {
          position: relative;
          width: 297mm;
          height: 210mm;
          padding: 15mm;
          box-sizing: border-box;
          background: radial-gradient(circle, #081235 0%, #04091a 100%);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          align-items: center;
          border: 4px solid transparent;
          border-image: linear-gradient(135deg, #d4af37, #aa7c11, #ffd700, #aa7c11, #d4af37) 1;
        }

        .inner-border {
          position: absolute;
          top: 18mm;
          bottom: 18mm;
          left: 18mm;
          right: 18mm;
          border: 1px solid rgba(212, 175, 55, 0.3);
          pointer-events: none;
        }

        .header-logo {
          margin-top: 10mm;
          font-family: 'Cinzel', serif;
          font-size: 24px;
          font-weight: 700;
          color: #d4af37;
          letter-spacing: 4px;
        }

        .cert-title {
          font-family: 'Cinzel', serif;
          font-size: 42px;
          font-weight: 800;
          color: #ffffff;
          margin-top: 12mm;
          letter-spacing: 5px;
          text-align: center;
        }

        .subtitle {
          font-size: 14px;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.6);
          text-transform: uppercase;
          letter-spacing: 3px;
          margin-top: 4mm;
          text-align: center;
        }

        .recipient-name {
          font-family: 'Cinzel', serif;
          font-size: 38px;
          font-weight: 700;
          color: #d4af37;
          border-bottom: 2px solid rgba(212, 175, 55, 0.4);
          padding-bottom: 3mm;
          margin-top: 8mm;
          width: 70%;
          text-align: center;
          letter-spacing: 2px;
        }

        .accomplishment {
          font-size: 13px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          max-width: 60%;
          line-height: 1.6;
          margin-top: 8mm;
        }

        .course-title {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 2mm;
          text-align: center;
        }

        .footer-section {
          width: 80%;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 12mm;
        }

        .signature-block {
          width: 60mm;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 2mm;
        }

        .signature-title {
          font-size: 10px;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.5);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-top: 1mm;
        }

        .signature-name {
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 700;
          color: #d4af37;
          margin-bottom: 1mm;
        }

        .validation-details {
          text-align: center;
        }

        .validation-id {
          font-family: monospace;
          font-size: 10px;
          color: rgba(255, 255, 255, 0.4);
          letter-spacing: 1px;
        }

        .validation-label {
          font-size: 8px;
          font-weight: 600;
          color: rgba(212, 175, 55, 0.6);
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 1mm;
        }

        .date-block {
          width: 60mm;
          text-align: center;
          border-top: 1px solid rgba(255, 255, 255, 0.2);
          padding-top: 2mm;
        }

        .date-val {
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
        }

        .badge {
          position: absolute;
          bottom: 30mm;
          width: 25mm;
          height: 25mm;
          background: radial-gradient(circle, #ffd700 0%, #b8860b 100%);
          border-radius: 50%;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
        }

        .badge-inner {
          width: 21mm;
          height: 21mm;
          border: 1px dashed rgba(255, 255, 255, 0.7);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Cinzel', serif;
          font-size: 7px;
          font-weight: 700;
          color: #ffffff;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      </style>
    </head>
    <body>
      <div class="cert-container">
        <div class="inner-border"></div>
        
        <div class="header-logo">LEADSMIND</div>
        
        <div class="cert-title">CERTIFICATE OF COMPLETION</div>
        <div class="subtitle">This is proudly presented to</div>
        
        <div class="recipient-name">${payload.studentName}</div>
        
        <div class="accomplishment">
          for successfully fulfilling all rigorous program requirements and completing the master curriculum course structure for
          <div class="course-title">${payload.courseTitle}</div>
        </div>

        <div class="badge">
          <div class="badge-inner">Verified<br>Graduate</div>
        </div>

        <div class="footer-section">
          <div class="date-block">
            <div class="date-val">${payload.completionDate}</div>
            <div class="signature-title">Date of Completion</div>
          </div>
          
          <div class="validation-details">
            <div class="validation-label">Validation ID</div>
            <div class="validation-id">${payload.validationId}</div>
          </div>
          
          <div class="signature-block">
            <div class="signature-name">LeadsMind Academy</div>
            <div class="signature-title">Authorized Registrar</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1122, height: 794, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' as any });
    const pdfBuffer = await page.pdf({
      width: '297mm',
      height: '210mm',
      printBackground: true,
      preferCSSPageSize: true
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}
