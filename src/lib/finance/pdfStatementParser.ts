// Text-layer extraction for uploaded bank statement / financial PDFs.
//
// Session A scope: extract raw per-page text only (and detect password
// protection cleanly) — real transaction-row parsing/categorization is
// Phase 2/3 work for a later session, once the accuracy spike (see
// scripts/pdf-ocr-spike) has confirmed which layouts a text-layer parse can
// actually handle. Kept deliberately separate from vision-AI extraction so
// the cheap path (no AI credit cost) is always tried first.

import { getDocument, PasswordResponses } from 'pdfjs-dist/legacy/build/pdf.mjs';

export class PdfPasswordRequiredError extends Error {
  constructor(public readonly wasIncorrect: boolean) {
    super(wasIncorrect ? 'Incorrect password for this PDF.' : 'This PDF is password-protected.');
    this.name = 'PdfPasswordRequiredError';
  }
}

export interface PdfTextExtractionResult {
  pageCount: number;
  text: string;
  pageTexts: string[];
}

/**
 * Extracts the text layer of every page in a PDF buffer. Throws
 * PdfPasswordRequiredError if the PDF is encrypted and either no password
 * was supplied or the supplied one was wrong — callers should surface this
 * as a distinct "needs password" state, not a generic parse failure.
 */
export async function extractPdfText(buffer: Buffer, password?: string): Promise<PdfTextExtractionResult> {
  const loadingTask = getDocument({
    data: new Uint8Array(buffer),
    password,
    // Disable font/CMap fetching — this is a Node worker, not a browser render.
    useSystemFonts: false,
    isEvalSupported: false,
  });

  // pdfjs's onPassword callback expects EITHER a retry password to be supplied via the
  // callback, OR it just waits forever — loadingTask.promise does not reject on its own if
  // the callback is never invoked. Without a password to retry with, we must destroy the
  // task and reject explicitly ourselves, or every encrypted PDF with no/wrong password
  // hangs the caller indefinitely instead of throwing.
  const pdf = await new Promise<any>((resolve, reject) => {
    loadingTask.onPassword = (callback: (password: string) => void, response: number) => {
      if (password && response === PasswordResponses.NEED_PASSWORD) {
        // First prompt and we do have a password to try — let pdfjs attempt it.
        callback(password);
        return;
      }
      loadingTask.destroy();
      reject(new PdfPasswordRequiredError(response === PasswordResponses.INCORRECT_PASSWORD));
    };
    loadingTask.promise.then(resolve, reject);
  });

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item: any) => ('str' in item ? item.str : '')).join(' ');
    pageTexts.push(pageText);
  }
  return { pageCount: pdf.numPages, text: pageTexts.join('\n\n'), pageTexts };
}

/** A text-layer extraction is considered "empty"/unreliable when it yields near-nothing — the PDF is likely a scanned image with no real text layer, and needs vision-AI extraction instead (Phase 2, not built in Session A). */
export function isTextLayerUnreliable(result: PdfTextExtractionResult): boolean {
  const meaningfulChars = result.text.replace(/\s/g, '').length;
  return meaningfulChars < 20 * result.pageCount;
}
