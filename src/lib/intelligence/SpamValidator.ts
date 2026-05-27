export interface SpamScoreResult {
  score: number; // 0 - 100
  passed: boolean; // true if score >= 50
  triggers: string[]; // List of matched trigger descriptions with point deductions
}

export const SpamValidator = {
  /**
   * Evaluates subject and body content for spam and phishing triggers.
   * Returns a score from 0-100. If score < 50, email is blocked.
   */
  validateEmailContent(subject: string, body: string): SpamScoreResult {
    let score = 100;
    const triggers: string[] = [];

    const cleanSubject = (subject || '').trim();
    const cleanBody = (body || '').trim();
    const combinedText = `${cleanSubject} \n ${cleanBody}`;

    // 1. South African SARS Phishing Check
    const sarsPatterns = [
      /sars\s+refund/i,
      /sars\s+payout/i,
      /sars\s+efiling/i,
      /sars\s+e-filing/i,
      /efiling\s+payout/i,
      /tax\s+refund\s+sars/i,
      /sars\s+payment\s+notice/i
    ];
    let matchedSars = false;
    for (const pattern of sarsPatterns) {
      if (pattern.test(combinedText)) {
        matchedSars = true;
        break;
      }
    }
    if (matchedSars) {
      score -= 60;
      triggers.push('SARS Phishing/Refund Trigger (-60 points)');
    }

    // 2. South African ZAR Cash / Lottery / Win Phishing Check
    const zarPatterns = [
      /win\s+zar/i,
      /zar\s+cash/i,
      /free\s+zar/i,
      /zar\s+payout/i,
      /million\s+zar/i,
      /cash\s+prize/i,
      /r\d{1,3}(?:[,\s]?\d{3})*(?:\.\d{2})?\s+cash/i, // e.g. R5000 cash, R100 000 cash
      /payout\s+of\s+r\d{1,3}/i
    ];
    let matchedZar = false;
    for (const pattern of zarPatterns) {
      if (pattern.test(combinedText)) {
        matchedZar = true;
        break;
      }
    }
    if (matchedZar) {
      score -= 55;
      triggers.push('ZAR Cash/Prize Phishing Trigger (-55 points)');
    }

    // 3. Bank Verification Phishing (South African Banks & general verification phrases)
    const bankPatterns = [
      /verify\s+bank\s+details/i,
      /update\s+bank(?:ing)?\s+account/i,
      /bank\s+details\s+verification/i,
      /capitec\s+(?:security|login|update|verify)/i,
      /fnb\s+(?:security|login|update|verify)/i,
      /standard\s+bank\s+(?:security|login|update|verify)/i,
      /nedbank\s+(?:security|login|update|verify)/i,
      /absa\s+(?:security|login|update|verify)/i,
      /account\s+suspended\s+verify/i
    ];
    let matchedBank = false;
    for (const pattern of bankPatterns) {
      if (pattern.test(combinedText)) {
        matchedBank = true;
        break;
      }
    }
    if (matchedBank) {
      score -= 60;
      triggers.push('Bank Details Verification Phishing Trigger (-60 points)');
    }

    // 4. Excessive Exclamation Marks
    const subjectExclamations = (cleanSubject.match(/!/g) || []).length;
    const bodyExclamations = (cleanBody.match(/!/g) || []).length;
    const totalExclamations = subjectExclamations + bodyExclamations;
    if (totalExclamations > 3) {
      const deduction = Math.min((totalExclamations - 3) * 5, 20);
      score -= deduction;
      triggers.push(`Excessive exclamation marks (${totalExclamations}) (-${deduction} points)`);
    }

    // 5. Subject Capitalization Checks
    // Check if the whole subject or a large portion is in UPPERCASE
    const lettersOnly = cleanSubject.replace(/[^a-zA-Z]/g, '');
    if (lettersOnly.length >= 8) {
      const uppercaseLetters = lettersOnly.replace(/[^A-Z]/g, '').length;
      const uppercaseRatio = uppercaseLetters / lettersOnly.length;
      if (uppercaseRatio > 0.5) {
        score -= 20;
        triggers.push('Subject capitalization exceeds 50% (-20 points)');
      }
    }

    // 6. Generic High-Risk Spam Triggers
    const generalSpamPatterns = [
      /100%\s+free/i,
      /guaranteed\s+success/i,
      /double\s+your\s+(?:income|money)/i,
      /make\s+money\s+fast/i,
      /act\s+now/i,
      /lottery\s+winner/i,
      /earn\s+extra\s+cash/i,
      /investment\s+returns\s+guaranteed/i,
      /crypto\s+investment\s+payout/i
    ];
    let spamMatches = 0;
    for (const pattern of generalSpamPatterns) {
      if (pattern.test(combinedText)) {
        spamMatches++;
      }
    }
    if (spamMatches > 0) {
      const deduction = Math.min(spamMatches * 10, 30);
      score -= deduction;
      triggers.push(`General high-risk spam indicators (${spamMatches}) (-${deduction} points)`);
    }

    // Normalize score to be between 0 and 100
    score = Math.max(0, Math.min(100, score));
    const passed = score >= 50;

    return {
      score,
      passed,
      triggers
    };
  }
};
