// RecoveryTokenHandler — generates and validates secure expiring tokens for form recovery links

export const RecoveryTokenHandler = {
  /**
   * Generates a secure, random recovery token
   */
  createToken(): string {
    if (typeof window === 'undefined') {
      const crypto = require('crypto');
      return crypto.randomBytes(32).toString('hex');
    }
    // Fallback if called in browser
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  /**
   * Calculate future expiration timestamp
   */
  getExpirationDate(expiresInDays: number = 7): Date {
    const date = new Date();
    date.setDate(date.getDate() + expiresInDays);
    return date;
  },

  /**
   * Validate if a recovery token is expired
   */
  isExpired(expiresAtStr: string | Date | null | undefined): boolean {
    if (!expiresAtStr) return true;
    const expiresAt = new Date(expiresAtStr);
    return expiresAt.getTime() < Date.now();
  }
};
