import { describe, expect, it } from 'vitest';
import { classifySendFailure, isRecoverableSendFailure } from './sendFailureClass';

describe('classifySendFailure — recoverable vs permanent (PRD 5.3)', () => {
  it('transport errors and our own timeout are recoverable', () => {
    expect(classifySendFailure({ errorType: 'transport' })).toBe('recoverable');
    expect(classifySendFailure({ errorType: 'timeout' })).toBe('recoverable');
  });

  it('HTTP 429 and 5xx are recoverable', () => {
    expect(classifySendFailure({ httpStatus: 429 })).toBe('recoverable');
    expect(classifySendFailure({ httpStatus: 500 })).toBe('recoverable');
    expect(classifySendFailure({ httpStatus: 503 })).toBe('recoverable');
  });

  it('Graph rate-limit codes are recoverable', () => {
    expect(classifySendFailure({ errorCode: 4 })).toBe('recoverable');
    expect(classifySendFailure({ errorCode: 613 })).toBe('recoverable');
    expect(classifySendFailure({ errorCode: 130429 })).toBe('recoverable'); // WhatsApp rate limit
  });

  it('expired/invalid token is permanent (no retries burned)', () => {
    expect(classifySendFailure({ errorCode: 190, errorType: 'OAuthException', httpStatus: 401 })).toBe('permanent');
    expect(isRecoverableSendFailure({ errorCode: 190 })).toBe(false);
  });

  it('recipient unreachable / cannot be messaged is permanent', () => {
    expect(classifySendFailure({ errorCode: 551 })).toBe('permanent');
    expect(classifySendFailure({ errorCode: 1545041 })).toBe('permanent');
  });

  it('WhatsApp re-engagement / template errors are permanent', () => {
    expect(classifySendFailure({ errorCode: 131047 })).toBe('permanent');
    expect(classifySendFailure({ errorCode: 132001 })).toBe('permanent');
  });

  it('unmapped OAuthException defaults to permanent', () => {
    expect(classifySendFailure({ errorType: 'OAuthException', error: 'Some auth thing' })).toBe('permanent');
  });

  it('an unknown failure defaults to recoverable (retry is safer, attempts are capped)', () => {
    expect(classifySendFailure({ error: 'weird transient glitch', errorCode: 999999 })).toBe('recoverable');
    expect(classifySendFailure({})).toBe('recoverable');
  });
});
