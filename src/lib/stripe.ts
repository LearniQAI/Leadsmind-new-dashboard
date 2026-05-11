import Stripe from 'stripe';

const apiKey = process.env.STRIPE_SECRET_KEY || 'sk_test_dummyKeyToPreventAppCrash';

if (!process.env.STRIPE_SECRET_KEY) {
 console.warn('Missing STRIPE_SECRET_KEY environment variable. Stripe checkout will fail if attempted.');
}

export const stripe = new Stripe(apiKey, {
 apiVersion: '2025-01-27.acacia' as any, 
 appInfo: {
  name: 'Leadsmind-Dashboard',
  version: '1.0.0',
 },
});
