import { describe, expect, it } from 'vitest';
import {
  channelHasDeliveryReceipt,
  statusesReadReceiptAdvancesFrom,
  CHANNELS_WITH_DELIVERY_RECEIPT,
} from './deliveryStatus';

describe('deliveryStatus — per-channel DELIVERED capability', () => {
  it('Facebook Messenger and WhatsApp have a real delivery receipt', () => {
    expect(channelHasDeliveryReceipt('facebook')).toBe(true);
    expect(channelHasDeliveryReceipt('whatsapp')).toBe(true);
  });

  it('Instagram has NO delivery receipt (no message_deliveries webhook)', () => {
    expect(channelHasDeliveryReceipt('instagram')).toBe(false);
    expect(CHANNELS_WITH_DELIVERY_RECEIPT.has('instagram')).toBe(false);
  });

  it('handles null / unknown platforms safely', () => {
    expect(channelHasDeliveryReceipt(null)).toBe(false);
    expect(channelHasDeliveryReceipt(undefined)).toBe(false);
    expect(channelHasDeliveryReceipt('telegram')).toBe(false);
  });

  it('read receipts advance IG straight from sent (never through delivered)', () => {
    expect(statusesReadReceiptAdvancesFrom('instagram')).toEqual(['sent']);
  });

  it('read receipts advance FB/WA from sent or delivered', () => {
    expect(statusesReadReceiptAdvancesFrom('facebook')).toEqual(['sent', 'delivered']);
    expect(statusesReadReceiptAdvancesFrom('whatsapp')).toEqual(['sent', 'delivered']);
  });
});
