"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Phone, CheckCircle2, AlertTriangle, ExternalLink, Search, Download, Trash2, Mic, MessageSquare, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { getTwilioStatus, saveTwilioCredentials } from '@/app/actions/settings';
import {
  searchAvailableNumbers,
  purchaseWorkspacePhoneNumber,
  listImportableTwilioNumbers,
  importWorkspacePhoneNumber,
  listWorkspacePhoneNumbers,
  releaseWorkspacePhoneNumber,
  type AvailableNumberResult,
  type ImportableNumber,
  type WorkspacePhoneNumber,
} from '@/app/actions/telephony';
import { DashButton } from '@/components/dashboard-ui';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

const TWILIO_SIGNUP_URL = 'https://www.twilio.com/try-twilio';

export default function PhoneTab() {
  const { role } = useDashboardContext() as any;
  const isAdmin = role === 'admin' || role === 'owner';

  const [loading, setLoading] = useState(true);
  const [twilioConfigured, setTwilioConfigured] = useState(false);
  const [twilioNumber, setTwilioNumber] = useState<string | null>(null);
  const [showTwilioForm, setShowTwilioForm] = useState(false);
  const [twilioSid, setTwilioSid] = useState('');
  const [twilioToken, setTwilioToken] = useState('');
  const [twilioPhone, setTwilioPhone] = useState('');
  const [savingTwilio, setSavingTwilio] = useState(false);

  useEffect(() => {
    getTwilioStatus().then(res => {
      if (res.data) {
        setTwilioConfigured(res.data.configured);
        setTwilioNumber(res.data.twilioNumber);
      }
      setLoading(false);
    });
  }, []);

  const handleSaveTwilio = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTwilio(true);
    const res = await saveTwilioCredentials(twilioSid, twilioToken, twilioPhone);
    setSavingTwilio(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success('Twilio account connected.');
      setTwilioConfigured(true);
      setTwilioNumber(twilioPhone);
      setShowTwilioForm(false);
      setTwilioSid('');
      setTwilioToken('');
      setTwilioPhone('');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 motion-reduce:animate-none">
      <div className="flex items-start gap-2 p-4 bg-blue-50/50 border border-blue-200 rounded-2xl">
        <Phone size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-[12px] text-blue-800/90 leading-relaxed">
          Connect your own Twilio account to send SMS/WhatsApp reminders and, as this area grows,
          set up numbers and call routing — usage is billed by Twilio directly to your account,
          LeadsMind never marks it up.
        </p>
      </div>

      {loading ? (
        <div className="p-16 flex justify-center">
          <div className="w-6 h-6 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
        </div>
      ) : (
        <div className="bg-white border border-dash-border rounded-2xl p-8 space-y-6 relative overflow-hidden shadow-sm">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Phone className="text-blue-500 w-5 h-5" />
              <div>
                <h4 className="text-[15px] font-bold !text-dash-text">Twilio account</h4>
                <p className="text-[11px] !text-dash-textMuted mt-0.5">
                  Your own Account SID, Auth Token and number — encrypted at rest, never shared across workspaces.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {twilioConfigured && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-600/10 text-green-700 text-[10px] font-bold border border-green-600/20">
                  <CheckCircle2 size={10} /> Connected
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowTwilioForm(v => !v)}
                  className="text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none"
                >
                  {showTwilioForm ? 'Cancel' : twilioConfigured ? 'Rotate credentials' : 'Connect Twilio'}
                </button>
              )}
            </div>
          </div>

          {twilioConfigured && !showTwilioForm && (
            <div className="flex items-center gap-3 p-3 bg-dash-surface border border-dash-border rounded-xl">
              <Phone size={14} className="text-blue-500 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] font-semibold !text-dash-text">Phone number</p>
                <p className="text-[11px] font-mono !text-dash-textMuted">
                  {twilioNumber ? twilioNumber.replace(/\d(?=\d{4})/g, '•') : 'Configured (number hidden)'}
                </p>
              </div>
              <p className="text-[10px] !text-dash-textMuted">Account SID & Auth Token are encrypted at rest</p>
            </div>
          )}

          {!twilioConfigured && !showTwilioForm && isAdmin && (
            <div className="flex items-center gap-3 p-4 bg-dash-surface border border-dash-border rounded-xl">
              <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
              <p className="text-[12px] !text-dash-textMuted">No Twilio account connected yet.</p>
            </div>
          )}

          {showTwilioForm && (
            <form onSubmit={handleSaveTwilio} className="space-y-4">
              <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <AlertTriangle size={13} className="text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-blue-700 leading-relaxed">
                  Credentials are verified against your Twilio account, then encrypted (AES-256-GCM)
                  before being stored. The plaintext values are never persisted.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Account SID</label>
                  <input
                    type="text"
                    value={twilioSid}
                    onChange={e => setTwilioSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-[12px] font-mono !text-dash-text outline-none focus:border-dash-accent transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Auth Token</label>
                  <input
                    type="password"
                    value={twilioToken}
                    onChange={e => setTwilioToken(e.target.value)}
                    placeholder="Your Twilio auth token"
                    className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-[12px] font-mono !text-dash-text outline-none focus:border-dash-accent transition-colors"
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Phone number <span className="font-normal !text-dash-textMuted">(E.164 format)</span></label>
                  <input
                    type="text"
                    value={twilioPhone}
                    onChange={e => setTwilioPhone(e.target.value)}
                    placeholder="+15551234567"
                    className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-[12px] font-mono !text-dash-text outline-none focus:border-dash-accent transition-colors"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-2 flex-wrap">
                <a
                  href={TWILIO_SIGNUP_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-[11px] font-semibold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none"
                >
                  Don't have a Twilio account? Create one <ExternalLink size={11} />
                </a>
                <div className="flex justify-end gap-3">
                  <DashButton
                    type="button"
                    onClick={() => { setShowTwilioForm(false); setTwilioSid(''); setTwilioToken(''); setTwilioPhone(''); }}
                    variant="secondary"
                    size="sm"
                  >
                    Cancel
                  </DashButton>
                  <DashButton type="submit" disabled={savingTwilio} variant="primary" size="sm">
                    {savingTwilio ? 'Verifying with Twilio…' : 'Verify & connect'}
                  </DashButton>
                </div>
              </div>
            </form>
          )}

          {!twilioConfigured && !showTwilioForm && (
            <a
              href={TWILIO_SIGNUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[11px] font-semibold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none w-fit"
            >
              Don't have a Twilio account? Create one <ExternalLink size={11} />
            </a>
          )}
        </div>
      )}

      {!loading && twilioConfigured && isAdmin && <NumbersSection />}
    </div>
  );
}

function CapabilityBadges({ capabilities }: { capabilities: { voice?: boolean; sms?: boolean; mms?: boolean } }) {
  return (
    <div className="flex items-center gap-1.5">
      {capabilities.voice && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-dash-surface border border-dash-border text-[10px] font-semibold !text-dash-textMuted">
          <Mic size={10} /> Voice
        </span>
      )}
      {capabilities.sms && (
        <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-dash-surface border border-dash-border text-[10px] font-semibold !text-dash-textMuted">
          <MessageSquare size={10} /> SMS
        </span>
      )}
      {capabilities.mms && (
        <span className="px-1.5 py-0.5 rounded bg-dash-surface border border-dash-border text-[10px] font-semibold !text-dash-textMuted">
          MMS
        </span>
      )}
    </div>
  );
}

function NumbersSection() {
  const [numbers, setNumbers] = useState<WorkspacePhoneNumber[]>([]);
  const [loadingNumbers, setLoadingNumbers] = useState(true);

  const [country, setCountry] = useState('ZA');
  const [areaCode, setAreaCode] = useState('');
  const [numberType, setNumberType] = useState<'local' | 'mobile'>('local');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AvailableNumberResult[] | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<AvailableNumberResult | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importable, setImportable] = useState<ImportableNumber[] | null>(null);
  const [loadingImportable, setLoadingImportable] = useState(false);
  const [importingSid, setImportingSid] = useState<string | null>(null);

  const [pendingRelease, setPendingRelease] = useState<WorkspacePhoneNumber | null>(null);
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const refreshNumbers = useCallback(async () => {
    setLoadingNumbers(true);
    const res = await listWorkspacePhoneNumbers();
    if (res.error) toast.error(res.error);
    setNumbers(res.data || []);
    setLoadingNumbers(false);
  }, []);

  useEffect(() => { refreshNumbers(); }, [refreshNumbers]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearching(true);
    setSearchResults(null);
    const res = await searchAvailableNumbers({ country, areaCode: areaCode || undefined, numberType });
    setSearching(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setSearchResults(res.data || []);
    if ((res.data || []).length === 0) toast.info('No available numbers matched that search.');
  };

  const confirmPurchase = async () => {
    if (!pendingPurchase) return;
    setPurchasing(true);
    const res = await purchaseWorkspacePhoneNumber(pendingPurchase.phoneNumber);
    setPurchasing(false);
    setPendingPurchase(null);
    if (res.error) {
      // A longer duration here on purpose — a purchasedButUnsaved error is important enough
      // that it shouldn't disappear on the default toast timeout.
      toast.error(res.error, { duration: res.purchasedButUnsaved ? 20000 : 5000 });
      if (res.purchasedButUnsaved) setShowImport(true);
      return;
    }
    toast.success(`${res.data?.phone_number} purchased and added to your workspace.`);
    setSearchResults((prev) => prev?.filter((n) => n.phoneNumber !== pendingPurchase.phoneNumber) ?? null);
    refreshNumbers();
  };

  const openImport = async () => {
    setShowImport(true);
    setLoadingImportable(true);
    const res = await listImportableTwilioNumbers();
    setLoadingImportable(false);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    setImportable(res.data || []);
  };

  const handleImport = async (n: ImportableNumber) => {
    setImportingSid(n.twilioNumberSid);
    const res = await importWorkspacePhoneNumber(n.twilioNumberSid);
    setImportingSid(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(`${res.data?.phone_number} imported.`);
    setImportable((prev) => prev?.filter((x) => x.twilioNumberSid !== n.twilioNumberSid) ?? null);
    refreshNumbers();
  };

  const confirmRelease = async () => {
    if (!pendingRelease) return;
    setReleasingId(pendingRelease.id);
    const res = await releaseWorkspacePhoneNumber(pendingRelease.id);
    setReleasingId(null);
    setPendingRelease(null);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success('Number released from your Twilio account.');
    refreshNumbers();
  };

  return (
    <div className="space-y-6">
      {/* Provisioned numbers */}
      <div className="bg-white border border-dash-border rounded-2xl p-8 space-y-4 shadow-sm">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="text-[15px] font-bold !text-dash-text">Your numbers</h4>
            <p className="text-[11px] !text-dash-textMuted mt-0.5">Numbers purchased or imported into this workspace.</p>
          </div>
          <button
            onClick={refreshNumbers}
            className="flex items-center gap-1.5 text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text transition-colors motion-reduce:transition-none"
          >
            <RefreshCw size={12} className={loadingNumbers ? 'animate-spin motion-reduce:animate-none' : ''} /> Refresh
          </button>
        </div>

        {loadingNumbers ? (
          <div className="p-8 flex justify-center">
            <div className="w-5 h-5 border-2 border-dash-accent border-t-transparent rounded-full animate-spin motion-reduce:animate-none" />
          </div>
        ) : numbers.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center border border-dashed border-dash-border rounded-xl">
            <Phone size={24} className="!text-dash-textMuted mb-2 opacity-40" />
            <p className="text-[12px] font-semibold !text-dash-textMuted">No numbers provisioned yet</p>
          </div>
        ) : (
          <div className="border border-dash-border rounded-xl overflow-hidden divide-y divide-dash-border">
            {numbers.map((n) => (
              <div key={n.id} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500 flex-shrink-0">
                    <Phone size={15} />
                  </div>
                  <div>
                    <p className="text-[13px] font-bold !text-dash-text font-mono">{n.phone_number}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CapabilityBadges capabilities={n.capabilities} />
                      <span className="text-[10px] !text-dash-textMuted">{n.source === 'purchased' ? 'Purchased' : 'Imported'}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPendingRelease(n)}
                  disabled={releasingId === n.id}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 hover:text-red-700 transition-colors motion-reduce:transition-none disabled:opacity-50"
                >
                  <Trash2 size={13} /> Release
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={openImport}
          className="flex items-center gap-1.5 text-[11px] font-bold text-dash-accent hover:text-dash-accent/80 transition-colors motion-reduce:transition-none"
        >
          <Download size={13} /> Import existing numbers from Twilio
        </button>

        {showImport && (
          <div className="border border-dash-border rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-bold !text-dash-text">Numbers already on your Twilio account</p>
              <button onClick={() => setShowImport(false)} className="text-[11px] font-bold !text-dash-textMuted hover:!text-dash-text">Close</button>
            </div>
            {loadingImportable ? (
              <div className="p-4 flex justify-center"><RefreshCw className="animate-spin motion-reduce:animate-none text-dash-accent" size={16} /></div>
            ) : !importable || importable.length === 0 ? (
              <p className="text-[11px] !text-dash-textMuted py-2">No unimported numbers found on your connected Twilio account.</p>
            ) : (
              <div className="divide-y divide-dash-border">
                {importable.map((n) => (
                  <div key={n.twilioNumberSid} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-[12px] font-bold !text-dash-text font-mono">{n.phoneNumber}</p>
                      <CapabilityBadges capabilities={n.capabilities} />
                    </div>
                    <DashButton
                      size="sm"
                      variant="secondary"
                      disabled={importingSid === n.twilioNumberSid}
                      onClick={() => handleImport(n)}
                    >
                      {importingSid === n.twilioNumberSid ? 'Importing…' : 'Import'}
                    </DashButton>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & buy */}
      <div className="bg-white border border-dash-border rounded-2xl p-8 space-y-5 shadow-sm">
        <div>
          <h4 className="text-[15px] font-bold !text-dash-text">Find a number</h4>
          <p className="text-[11px] !text-dash-textMuted mt-0.5">Search real numbers available to buy on your connected Twilio account.</p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Country</label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
            >
              <option value="ZA">South Africa</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Type</label>
            <select
              value={numberType}
              onChange={(e) => setNumberType(e.target.value as 'local' | 'mobile')}
              className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] !text-dash-text outline-none focus:border-dash-accent"
            >
              <option value="local">Geographic</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold !text-dash-text mb-1.5">Area code <span className="font-normal !text-dash-textMuted">(optional)</span></label>
            <input
              type="text"
              value={areaCode}
              onChange={(e) => setAreaCode(e.target.value)}
              placeholder="e.g. 11"
              className="bg-dash-surface border border-dash-border rounded-xl px-3 py-2.5 text-[12px] font-mono !text-dash-text outline-none focus:border-dash-accent w-28"
            />
          </div>
          <DashButton type="submit" variant="primary" size="sm" disabled={searching}>
            <span className="flex items-center gap-1.5"><Search size={13} /> {searching ? 'Searching…' : 'Search'}</span>
          </DashButton>
        </form>

        {searchResults && (
          <div className="border border-dash-border rounded-xl overflow-hidden divide-y divide-dash-border">
            {searchResults.length === 0 ? (
              <p className="text-[12px] !text-dash-textMuted p-4 text-center">No available numbers matched that search.</p>
            ) : (
              searchResults.map((n) => (
                <div key={n.phoneNumber} className="p-4 flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-[13px] font-bold !text-dash-text font-mono">{n.phoneNumber}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <CapabilityBadges capabilities={n.capabilities} />
                      {(n.locality || n.region) && (
                        <span className="text-[10px] !text-dash-textMuted">{[n.locality, n.region].filter(Boolean).join(', ')}</span>
                      )}
                      {n.monthlyPrice && (
                        <span className="text-[10px] font-semibold !text-dash-text">{n.monthlyPrice} {n.priceUnit}/mo</span>
                      )}
                    </div>
                  </div>
                  <DashButton size="sm" variant="primary" onClick={() => setPendingPurchase(n)}>
                    Buy
                  </DashButton>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!pendingPurchase}
        onClose={() => setPendingPurchase(null)}
        onConfirm={confirmPurchase}
        title="This will charge your Twilio account"
        description={`Buying ${pendingPurchase?.phoneNumber} is a real transaction on your own connected Twilio account${pendingPurchase?.monthlyPrice ? ` (approx. ${pendingPurchase.monthlyPrice} ${pendingPurchase.priceUnit}/month, billed by Twilio)` : ''}. LeadsMind does not charge or mark this up. Continue?`}
        confirmLabel={purchasing ? 'Purchasing…' : 'Yes, buy this number'}
        variant="warning"
      />

      <ConfirmDialog
        isOpen={!!pendingRelease}
        onClose={() => setPendingRelease(null)}
        onConfirm={confirmRelease}
        title="Release this number?"
        description={`This permanently releases ${pendingRelease?.phone_number} back to Twilio and stops billing for it on your Twilio account. This cannot be undone — you would need to search and buy it again (if still available) to get it back.`}
        confirmLabel="Release number"
        variant="danger"
      />
    </div>
  );
}
