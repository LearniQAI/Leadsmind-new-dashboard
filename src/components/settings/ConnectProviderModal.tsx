'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X, ExternalLink, AlertCircle, ShieldCheck } from 'lucide-react';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { getWorkspaceApiKey } from '@/app/actions/settings';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';

interface ConnectProviderModalProps {
  provider: string;
  category: string;
  open: boolean;
  onClose: () => void;
  onConnected: (accountLabel: string) => void;
}

// Real logos already sourced/stored for the Payment Gateways page — reused here so the
// same provider identity shows up everywhere, not a generic icon in this modal alone.
const PROVIDER_LOGOS: Record<string, string> = {
  stripe: '/assets/images/payment-gateways/stripe.svg',
  paypal: '/assets/images/payment-gateways/paypal.svg',
  paystack: '/assets/images/payment-gateways/paystack.png',
  flutterwave: '/assets/images/payment-gateways/flutterwave.png',
  ozow: '/assets/images/payment-gateways/ozow.png',
};

const PROVIDER_TAGLINES: Record<string, string> = {
  paystack: 'Checkout will route directly to your own Paystack account.',
  flutterwave: 'Checkout will route directly to your own Flutterwave account.',
  ozow: 'Checkout will route directly to your own Ozow account.',
};

export default function ConnectProviderModal({
  provider,
  category,
  open,
  onClose,
  onConnected,
}: ConnectProviderModalProps) {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  // Fields state
  const [field1, setField1] = useState('');
  const [field2, setField2] = useState('');
  const [field3, setField3] = useState('');
  const [field4, setField4] = useState('');

  // Paystack/Flutterwave/Ozow have real, provider-specific credential shapes
  // (confirmed from each provider's current docs) — not the generic
  // apiKey/apiSecret/passphrase boilerplate every other payment_gateway
  // provider uses. Keeping this as a small lookup rather than new components
  // per provider since the modal chrome (header/buttons/error state) is
  // identical either way.
  const providerKey = provider.toLowerCase();
  const isByoKeyGateway = category === 'payment_gateway' && ['paystack', 'flutterwave', 'ozow'].includes(providerKey);
  const logoSrc = PROVIDER_LOGOS[providerKey];

  // Status state
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [oauthWarning, setOauthWarning] = useState<string | null>(null);

  // Zapier state
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (open && provider === 'Zapier') {
      getWorkspaceApiKey().then(res => {
        if (res && res.data) {
          setApiKey(res.data);
        }
      });
    }
  }, [open, provider]);

  // Reset on close/re-open so a previous provider's typed values never leak into the next
  // provider's fields, and so nothing looks "pre-filled" between separate connect attempts.
  useEffect(() => {
    if (!open) {
      setField1(''); setField2(''); setField3(''); setField4('');
      setErrorMsg(null); setOauthWarning(null);
    }
  }, [open]);

  const handleCopyKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText('https://www.leadsmind.io/api/v1');
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceId) {
      setErrorMsg('No active workspace found.');
      return;
    }

    setErrorMsg(null);

    // OAuth categories do not submit this way
    if (category === 'email_calendar' || category === 'communication') {
      setOauthWarning(`OAuth connection for ${provider} is coming soon. You will be notified when it is ready.`);
      return;
    }

    // Validation: real required fields per provider for the 3 bring-your-own-key
    // gateways (a missing field here should never reach the server as a vague
    // "credential fields" error — tell the user exactly what's missing).
    if (isByoKeyGateway) {
      if (providerKey === 'paystack' && !field1.trim()) {
        setErrorMsg('Enter your Paystack secret key.');
        return;
      }
      if (providerKey === 'flutterwave' && (!field1.trim() || !field2.trim())) {
        setErrorMsg('Enter both your Flutterwave secret key and webhook secret hash.');
        return;
      }
      if (providerKey === 'ozow' && (!field1.trim() || !field2.trim() || !field4.trim())) {
        setErrorMsg('Enter your Ozow SiteCode, API key, and private key.');
        return;
      }
    } else if (!field1.trim() && !field2.trim() && !field3.trim()) {
      setErrorMsg('Please fill in the required credential fields.');
      return;
    }

    setLoading(true);

    try {
      // Determine accountLabel based on categories
      let label = provider;
      if (category === 'bank' || category === 'payment_gateway') {
        label = field3.trim() || provider;
      } else if (category === 'identity_verification' || category === 'credit_bureau' || category === 'fraud_screening') {
        label = field3.trim() || provider;
      } else if (category === 'tax_government') {
        label = field1.trim() || provider;
      } else {
        label = field2.trim() || provider;
      }

      // For payment gateways, the entered credentials are the actual secret —
      // these previously never left the browser at all (only the account label
      // was sent). Sent as a distinct `credentials` object (shape matching each
      // provider's real requirements, not a generic apiKey/apiSecret pair) so
      // the backend can run a real validation call and encrypt each field
      // explicitly, instead of silently accepting an unlabeled blob.
      const body: Record<string, any> = {
        workspaceId,
        provider,
        category,
        accountLabel: label,
      };

      if (providerKey === 'paystack') {
        body.credentials = { secretKey: field1.trim() };
      } else if (providerKey === 'flutterwave') {
        body.credentials = { secretKey: field1.trim(), webhookSecretHash: field2.trim() };
      } else if (providerKey === 'ozow') {
        body.credentials = { siteCode: field1.trim(), apiKey: field2.trim(), privateKey: field4.trim() };
      } else if (category === 'payment_gateway') {
        body.credentials = {
          apiKey: field1.trim(),
          apiSecret: field2.trim(),
          passphrase: field4.trim() || undefined,
        };
      } else if (category === 'automation') {
        body.webhookUrl = field1.trim();
      }

      const res = await fetch('/api/settings/integrations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save connection.');
      }

      onConnected(label);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const description = provider === 'Zapier'
    ? 'Follow the instructions below to authenticate your LeadsMind integration in Zapier.'
    : (PROVIDER_TAGLINES[providerKey] || `Enter your credentials to connect ${provider} to LeadsMind.`);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-dash-text/40 backdrop-blur-sm"
      />

      {/* Modal Content */}
      <div className="relative bg-white border border-dash-border rounded-2xl w-full max-w-md p-6 shadow-xl z-10 max-h-[90vh] overflow-y-auto">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 !text-dash-textMuted hover:!text-dash-text transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header — logo + name, then a short one-line description */}
        <div className="flex items-start gap-3 mb-6 pr-6">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white border border-dash-border p-2">
            {logoSrc ? (
              <Image src={logoSrc} alt={`${provider} logo`} width={36} height={36} className="w-full h-full object-contain" />
            ) : (
              <span className="text-[13px] font-bold !text-dash-accent">{provider.slice(0, 2).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0 pt-0.5">
            <h3 className="text-[16px] font-bold !text-dash-text">
              Connect {provider}
            </h3>
            <p className="!text-dash-textMuted text-[12.5px] mt-0.5 leading-snug">
              {description}
            </p>
          </div>
        </div>

        {provider === 'Zapier' ? (
          <div className="space-y-5">
            <DashFormField label="Zapier base URL">
              <div className="flex gap-2">
                <DashInput
                  type="text"
                  readOnly
                  value="https://www.leadsmind.io/api/v1"
                  className="font-mono"
                />
                <DashButton type="button" variant="secondary" size="default" onClick={handleCopyUrl} className="flex-shrink-0">
                  {copiedUrl ? 'Copied' : 'Copy'}
                </DashButton>
              </div>
            </DashFormField>

            <DashFormField label="Master API secret key">
              {apiKey ? (
                <div className="flex gap-2">
                  <DashInput type="password" readOnly value={apiKey} className="font-mono" />
                  <DashButton type="button" variant="secondary" size="default" onClick={handleCopyKey} className="flex-shrink-0">
                    {copiedKey ? 'Copied' : 'Copy'}
                  </DashButton>
                </div>
              ) : (
                <div className="bg-amber/10 border border-amber/20 rounded-lg p-3 text-[12px] text-amber leading-relaxed">
                  No Master API key found. Please generate one under{' '}
                  <a
                    href="/settings?tab=api"
                    className="!text-dash-accent hover:underline font-semibold"
                    onClick={onClose}
                  >
                    Settings &gt; Developer
                  </a>{' '}
                  first.
                </div>
              )}
            </DashFormField>

            <div className="bg-dash-surface border border-dash-border rounded-xl p-4 space-y-2 text-[12px] !text-dash-textMuted leading-relaxed">
              <p className="font-semibold !text-dash-text">Instructions:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Log in to your Zapier account and click "Create Zap".</li>
                <li>Search for and select the "LeadsMind" app.</li>
                <li>When prompted for authentication, enter your Master API Secret Key and set the Base URL to the one provided above.</li>
                <li>Test your connection and begin building triggers (e.g. Contact Created) and actions.</li>
              </ol>
            </div>

            <div className="pt-2 flex items-center gap-3">
              {apiKey && (
                <DashButton
                  type="button"
                  variant="primary"
                  className="flex-1"
                  onClick={() => {
                    onConnected('Active Connection');
                    onClose();
                  }}
                >
                  Mark Connected
                </DashButton>
              )}
              <DashButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
                Close
              </DashButton>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* CATEGORY: Paystack — bring-your-own-key, real credential shape (one secret key) */}
            {providerKey === 'paystack' && (
              <>
                <DashFormField label="Paystack secret key" required hint="Find this in Paystack > Settings > API Keys & Webhooks. We verify it with a real read-only call before connecting.">
                  <DashInput
                    type="password"
                    autoComplete="new-password"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                    placeholder="sk_live_... or sk_test_..."
                  />
                </DashFormField>
                <DashFormField label="Account name (optional)">
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field3}
                    onChange={e => setField3(e.target.value)}
                    placeholder="e.g. Main Paystack Account"
                  />
                </DashFormField>
              </>
            )}

            {/* CATEGORY: Flutterwave — secret key + separately-generated webhook secret hash */}
            {providerKey === 'flutterwave' && (
              <>
                <DashFormField label="Flutterwave secret key" required>
                  <DashInput
                    type="password"
                    autoComplete="new-password"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                    placeholder="FLWSECK_TEST-... or FLWSECK-..."
                  />
                </DashFormField>
                <DashFormField label="Webhook secret hash" required hint="A separate value you set yourself under Flutterwave's webhook settings — both fields are required.">
                  <DashInput
                    type="password"
                    autoComplete="new-password"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                    placeholder="Set under Flutterwave > Settings > Webhooks"
                  />
                </DashFormField>
                <DashFormField label="Account name (optional)">
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field3}
                    onChange={e => setField3(e.target.value)}
                    placeholder="e.g. Main Flutterwave Account"
                  />
                </DashFormField>
              </>
            )}

            {/* CATEGORY: Ozow — SiteCode + API key + private key, all three required */}
            {providerKey === 'ozow' && (
              <>
                <DashFormField label="Ozow site code" required>
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                    placeholder="e.g. TSTSTE0001"
                  />
                </DashFormField>
                <DashFormField label="API key" required>
                  <DashInput
                    type="password"
                    autoComplete="new-password"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                  />
                </DashFormField>
                <DashFormField label="Private key" required hint="Used to sign/verify checkout requests.">
                  <DashInput
                    type="password"
                    autoComplete="new-password"
                    value={field4}
                    onChange={e => setField4(e.target.value)}
                  />
                </DashFormField>
                <DashFormField label="Account name (optional)" hint="All three values are in your Ozow Merchant Admin under Settings. Ozow has no separate test toggle, so use a real (or Ozow-provided sandbox) SiteCode.">
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field3}
                    onChange={e => setField3(e.target.value)}
                    placeholder="e.g. Main Ozow Account"
                  />
                </DashFormField>
              </>
            )}

            {/* CATEGORY: Bank / other Payments (generic — Paystack/Flutterwave/Ozow handled above) */}
            {(category === 'bank' || category === 'payment_gateway') && !isByoKeyGateway && (
              <>
                <DashFormField label="API key or client ID">
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                    placeholder={`Provided by ${provider} developer portal`}
                  />
                </DashFormField>

                <DashFormField label="API secret">
                  <DashInput
                    type="password"
                    autoComplete="new-password"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                    placeholder="Keep this private"
                  />
                </DashFormField>

                {category === 'payment_gateway' && (
                  <DashFormField label={`Passphrase (optional, if required by ${provider})`}>
                    <DashInput
                      type="password"
                      autoComplete="new-password"
                      value={field4}
                      onChange={e => setField4(e.target.value)}
                      placeholder="Only required if your gateway account has one set"
                    />
                  </DashFormField>
                )}

                <DashFormField label="Account name (optional)" hint={`Find your API credentials in your ${provider} developer or business portal.`}>
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field3}
                    onChange={e => setField3(e.target.value)}
                    placeholder="e.g. LeadsMind Business Account"
                  />
                </DashFormField>
              </>
            )}

            {/* CATEGORY: Tax / Government */}
            {category === 'tax_government' && (
              <>
                <DashFormField label="Username or tax reference number">
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                  />
                </DashFormField>

                <DashFormField label="Password" hint="Your SARS eFiling or CIPC login credentials. LeadsMind connects on your behalf using a secure session.">
                  <DashInput
                    type="password"
                    autoComplete="new-password"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                  />
                </DashFormField>
              </>
            )}

            {/* CATEGORY: Identity, Credit Bureau, Fraud */}
            {(category === 'identity_verification' || category === 'credit_bureau' || category === 'fraud_screening') && (
              <>
                <DashFormField label="API key">
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field1}
                    onChange={e => setField1(e.target.value)}
                  />
                </DashFormField>

                <DashFormField label="Client ID (if required)">
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field2}
                    onChange={e => setField2(e.target.value)}
                  />
                </DashFormField>

                <DashFormField label="Account name (optional)" hint={`Contact ${provider} to get your API credentials. Enterprise pricing applies.`}>
                  <DashInput
                    type="text"
                    autoComplete="off"
                    value={field3}
                    onChange={e => setField3(e.target.value)}
                    placeholder="e.g. Production"
                  />
                </DashFormField>
              </>
            )}

            {/* CATEGORY: Email / Calendar & Communication (OAuth Flow) */}
            {(category === 'email_calendar' || category === 'communication') && (
              <div className="space-y-5 py-2">
                <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-dash-surface border border-dash-border text-center">
                  <ExternalLink className="w-8 h-8 !text-dash-accent mb-3" />
                  <h4 className="!text-dash-text text-[14px] font-bold mb-1.5">
                    Connect via OAuth
                  </h4>
                  <p className="!text-dash-textMuted text-[12px] leading-relaxed max-w-xs">
                    You will be redirected to {provider} to approve the connection. LeadsMind will only request read access to your calendar and email.
                  </p>
                </div>

                <DashButton type="button" variant="primary" className="w-full" onClick={handleSubmit}>
                  Continue to {provider}
                </DashButton>

                {oauthWarning && (
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber/10 border border-amber/20 text-amber text-[11.5px] leading-relaxed">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{oauthWarning}</span>
                  </div>
                )}
              </div>
            )}

            {/* Save & Cancel Buttons for Input-based Categories */}
            {category !== 'email_calendar' && category !== 'communication' && (
              <>
                {/* CATEGORY: Automation, eCommerce, Marketing, Analytics, Courier */}
                {(category === 'automation' || category === 'ecommerce' || category === 'marketing' || category === 'analytics' || category === 'courier') && (
                  <>
                    <DashFormField label="API key or webhook URL">
                      <DashInput
                        type="text"
                        autoComplete="off"
                        value={field1}
                        onChange={e => setField1(e.target.value)}
                        placeholder={`Provided in your ${provider} account settings`}
                      />
                    </DashFormField>

                    <DashFormField label="Account name (optional)" hint={`Check your ${provider} settings or integrations page for API keys.`}>
                      <DashInput
                        type="text"
                        autoComplete="off"
                        value={field2}
                        onChange={e => setField2(e.target.value)}
                      />
                    </DashFormField>
                  </>
                )}

                {/* Security reassurance — subtle info callout, not plain gray text */}
                <div className="flex items-start gap-2.5 bg-dash-accent/5 border border-dash-accent/20 rounded-xl p-3 text-[12px] !text-dash-textMuted leading-relaxed">
                  <ShieldCheck className="w-4 h-4 !text-dash-accent shrink-0 mt-0.5" />
                  <span>These credentials are encrypted at rest and never shared — only used to process your workspace's own transactions.</span>
                </div>

                {errorMsg && (
                  <div className="text-red text-[12px] text-center">
                    {errorMsg}
                  </div>
                )}

                <div className="flex items-center gap-3 pt-1">
                  <DashButton type="button" variant="secondary" className="flex-1" onClick={onClose}>
                    Cancel
                  </DashButton>
                  <DashButton type="submit" variant="primary" className="flex-1" disabled={loading}>
                    {loading && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />}
                    Save Connection
                  </DashButton>
                </div>
              </>
            )}

          </form>
        )}

      </div>
    </div>
  );
}
