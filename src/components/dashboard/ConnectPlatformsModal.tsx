'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  getConnectedPlatforms,
  disconnectPlatform,
  getMetaAuthUrl,
  connectPlatformManually,
  getMetaOauthToken,
  fetchMetaBusinesses,
  fetchMetaPages,
  fetchMetaInstagramAccounts,
  fetchMetaWhatsAppAccounts,
  fetchWhatsAppPhoneNumbers,
  saveMetaConnections
} from '@/app/actions/messaging';
import { DashButton } from '@/components/dashboard-ui/Button';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ConnectPlatformsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlatform?: 'facebook' | 'instagram' | 'whatsapp' | null;
}

// Same dash-* control treatment DashInput uses — no dedicated DashSelect primitive exists yet
// (see FormField.tsx's header comment), so native <select> is styled to match rather than
// introducing a one-off dark control here.
const selectBase =
  "w-full h-11 rounded-xl border border-dash-border bg-white px-3.5 text-sm !text-dash-text transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dash-accent";

export function ConnectPlatformsModal({ open, onOpenChange, targetPlatform = null }: ConnectPlatformsModalProps) {
  const [connections, setConnections] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [metaUrl, setMetaUrl] = useState('');
  const [isAdvancedMode, setIsAdvancedMode] = useState(false);
  const [activeManualPlatform, setActiveManualPlatform] = useState<string | null>(null);

  // Wizard state variables
  const [isOauthWizard, setIsOauthWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardLoading, setWizardLoading] = useState(false);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [igAccounts, setIgAccounts] = useState<any[]>([]);
  const [waAccounts, setWaAccounts] = useState<any[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<any[]>([]);

  const [selectedBusiness, setSelectedBusiness] = useState<string>('');
  const [selectedPage, setSelectedPage] = useState<any>(null);
  const [selectedInstagram, setSelectedInstagram] = useState<any>(null);
  const [selectedWaba, setSelectedWaba] = useState<any>(null);
  const [selectedPhone, setSelectedPhone] = useState<any>(null);

  const [formData, setFormData] = useState({
    pageId: '',
    pageName: '',
    pageAccessToken: '',
    instagramBusinessAccountId: '',
    phoneNumberId: '',
    whatsappBusinessAccountId: '',
    systemUserAccessToken: ''
  });

  const getSteps = () => {
    if (targetPlatform === 'facebook') {
      return ['Business', 'Page'];
    } else if (targetPlatform === 'instagram') {
      return ['Business', 'Page', 'Instagram'];
    } else if (targetPlatform === 'whatsapp') {
      return ['Business', 'WABA', 'Phone Line'];
    }
    return ['Business', 'Page', 'Instagram', 'WhatsApp'];
  };

  const stepsList = getSteps();
  const totalSteps = stepsList.length;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeManualPlatform) return;

    setIsLoading(true);
    try {
      const res = await connectPlatformManually(activeManualPlatform, formData);
      if (res.success) {
        toast.success(`${activeManualPlatform.toUpperCase()} connected successfully!`);
        setActiveManualPlatform(null);
        setFormData({
          pageId: '',
          pageName: '',
          pageAccessToken: '',
          instagramBusinessAccountId: '',
          phoneNumberId: '',
          whatsappBusinessAccountId: '',
          systemUserAccessToken: ''
        });
        loadConnections();
      } else {
        toast.error(res.error || 'Failed to save connection');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while saving connection');
    } finally {
      setIsLoading(false);
    }
  };

  const loadConnections = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getConnectedPlatforms();
      // Only include fully connected platforms in active list (exclude pending)
      const connectedData = data.filter((c: any) => c.status === 'connected');
      setConnections(connectedData);

      const url = await getMetaAuthUrl(targetPlatform || undefined);
      setMetaUrl(url);

      // Check if there is a pending OAuth session to trigger Wizard onboarding
      const oauthSession = await getMetaOauthToken();
      if (oauthSession && oauthSession.token && targetPlatform && targetPlatform !== 'facebook') {
        setIsOauthWizard(true);
        setWizardStep(1);
        setWizardLoading(true);
        try {
          if (targetPlatform === 'whatsapp') {
            // For WhatsApp we need business selection
            const bizList = await fetchMetaBusinesses();
            setBusinesses(bizList);
            if (bizList.length > 0) setSelectedBusiness(bizList[0].id);
          } else {
            // For Instagram go straight to pages
            const pageList = await fetchMetaPages('personal');
            setPages(pageList);
            if (pageList.length > 0) setSelectedPage(pageList[0]);
            // Skip to step 2 directly
            setWizardStep(2);
          }
        } catch (bizErr: any) {
          toast.error(bizErr.message || 'Failed to fetch Meta assets');
        } finally {
          setWizardLoading(false);
        }
      } else {
        setIsOauthWizard(false);
      }
    } catch (e: any) {
      toast.error('Failed to load connections');
    } finally {
      setIsLoading(false);
    }
  }, [targetPlatform]);

  useEffect(() => {
    if (open) {
      loadConnections();
    }
  }, [open, loadConnections]);

  const handleDisconnect = async (platform: string) => {
    const res = await disconnectPlatform(platform);
    if (res.success) {
      toast.success(`${platform.toUpperCase()} disconnected successfully.`);
      loadConnections();
    } else {
      toast.error(res.error || 'Failed to disconnect');
    }
  };

  const handleExitWizard = async () => {
    setWizardLoading(true);
    try {
      await disconnectPlatform('facebook');
      setIsOauthWizard(false);
      loadConnections();
      toast.info('Onboarding wizard cancelled.');
    } catch (e) {
      toast.error('Failed to cancel onboarding');
    } finally {
      setWizardLoading(false);
    }
  };

  const handleBusinessSelect = async (bizId: string) => {
    setSelectedBusiness(bizId);
  };

  const handleStep1Next = async () => {
    if (!selectedBusiness) return;
    setWizardLoading(true);
    try {
      if (targetPlatform === 'whatsapp') {
        const wabaList = await fetchMetaWhatsAppAccounts(selectedBusiness);
        setWaAccounts(wabaList);
        if (wabaList.length > 0) {
          setSelectedWaba(wabaList[0]);
          const phoneList = await fetchWhatsAppPhoneNumbers(wabaList[0].id);
          setPhoneNumbers(phoneList);
          if (phoneList.length > 0) {
            setSelectedPhone(phoneList[0]);
          } else {
            setSelectedPhone(null);
          }
        } else {
          setSelectedWaba(null);
          setPhoneNumbers([]);
          setSelectedPhone(null);
        }
      } else {
        const pageList = await fetchMetaPages(selectedBusiness);
        setPages(pageList);
        if (pageList.length > 0) {
          setSelectedPage(pageList[0]);
        } else {
          setSelectedPage(null);
        }
      }
      setWizardStep(2);
    } catch (e: any) {
      toast.error(e.message || 'Failed to load assets');
    } finally {
      setWizardLoading(false);
    }
  };

  const handleStep2Next = async () => {
    if (targetPlatform === 'whatsapp') {
      if (!selectedWaba) {
        toast.error('Please select a WhatsApp Business Account');
        return;
      }
      setWizardStep(3);
    } else {
      if (!selectedPage) {
        toast.error('Please select a Facebook Page');
        return;
      }
      if (targetPlatform === 'facebook') {
        await handleSaveWizard();
      } else {
        setWizardLoading(true);
        try {
          const igList = await fetchMetaInstagramAccounts(selectedPage.id, selectedPage.access_token);
          setIgAccounts(igList);
          if (igList.length > 0) {
            setSelectedInstagram(igList[0]);
          } else {
            setSelectedInstagram(null);
          }
          setWizardStep(3);
        } catch (e: any) {
          setSelectedInstagram(null);
          setWizardStep(3);
        } finally {
          setWizardLoading(false);
        }
      }
    }
  };

  const handleStep3Next = async () => {
    if (targetPlatform === 'instagram') {
      await handleSaveWizard();
    } else if (targetPlatform === 'whatsapp') {
      await handleSaveWizard();
    } else {
      // Legacy fallback behavior
      setWizardLoading(true);
      try {
        const wabaList = await fetchMetaWhatsAppAccounts(selectedBusiness);
        setWaAccounts(wabaList);
        if (wabaList.length > 0) {
          setSelectedWaba(wabaList[0]);
          const phoneList = await fetchWhatsAppPhoneNumbers(wabaList[0].id);
          setPhoneNumbers(phoneList);
          if (phoneList.length > 0) {
            setSelectedPhone(phoneList[0]);
          } else {
            setSelectedPhone(null);
          }
        } else {
          setSelectedWaba(null);
          setPhoneNumbers([]);
          setSelectedPhone(null);
        }
        setWizardStep(4);
      } catch (e: any) {
        setSelectedWaba(null);
        setPhoneNumbers([]);
        setSelectedPhone(null);
        setWizardStep(4);
      } finally {
        setWizardLoading(false);
      }
    }
  };

  const handleWabaChange = async (wabaId: string) => {
    if (wabaId === 'skip') {
      setSelectedWaba(null);
      setPhoneNumbers([]);
      setSelectedPhone(null);
      return;
    }
    const waba = waAccounts.find(w => w.id === wabaId);
    setSelectedWaba(waba || null);
    if (wabaId) {
      setWizardLoading(true);
      try {
        const phoneList = await fetchWhatsAppPhoneNumbers(wabaId);
        setPhoneNumbers(phoneList);
        if (phoneList.length > 0) {
          setSelectedPhone(phoneList[0]);
        } else {
          setSelectedPhone(null);
        }
      } catch (e: any) {
        toast.error('Failed to load WhatsApp Phone Numbers');
      } finally {
        setWizardLoading(false);
      }
    }
  };

  const handleSaveWizard = async () => {
    setWizardLoading(true);
    try {
      let dataToSave: any = {};
      if (targetPlatform === 'facebook') {
        if (!selectedPage) throw new Error('Please select a Facebook Page');
        dataToSave = {
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          pageAccessToken: selectedPage.access_token
        };
      } else if (targetPlatform === 'instagram') {
        if (!selectedPage) throw new Error('Please select a Facebook Page');
        dataToSave = {
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          pageAccessToken: selectedPage.access_token,
          instagramBusinessAccountId: selectedInstagram?.id || null,
          instagramUsername: selectedInstagram?.username || null
        };
      } else if (targetPlatform === 'whatsapp') {
        if (!selectedWaba || !selectedPhone) throw new Error('Please select a WhatsApp Business Account and Line');
        dataToSave = {
          pageId: 'whatsapp_placeholder',
          pageName: 'whatsapp_placeholder',
          pageAccessToken: 'whatsapp_placeholder',
          whatsappBusinessAccountId: selectedWaba.id,
          whatsappBusinessName: selectedWaba.name,
          phoneNumberId: selectedPhone.id,
          whatsappPhoneNumber: selectedPhone.display_phone_number
        };
      } else {
        if (!selectedPage) throw new Error('Please complete the setup');
        dataToSave = {
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          pageAccessToken: selectedPage.access_token,
          instagramBusinessAccountId: selectedInstagram?.id || null,
          instagramUsername: selectedInstagram?.username || null,
          whatsappBusinessAccountId: selectedWaba?.id || null,
          whatsappBusinessName: selectedWaba?.name || null,
          phoneNumberId: selectedPhone?.id || null,
          whatsappPhoneNumber: selectedPhone?.display_phone_number || null
        };
      }

      const res = await saveMetaConnections(dataToSave, targetPlatform);

      if (res.success) {
        toast.success(`${targetPlatform ? targetPlatform.charAt(0).toUpperCase() + targetPlatform.slice(1) : 'Meta'} connection configured successfully!`);
        setIsOauthWizard(false);
        onOpenChange(false);
      } else {
        toast.error(res.error || 'Failed to save connection');
      }
    } catch (e: any) {
      toast.error(e.message || 'An error occurred during save');
    } finally {
      setWizardLoading(false);
    }
  };

  // Find connections
  const fbConn = connections.find(c => c.platform === 'facebook');
  const igConn = connections.find(c => c.platform === 'instagram');
  const waConn = connections.find(c => c.platform === 'whatsapp');
  const isAnyConnected = fbConn || igConn || waConn;

  const getHealthBadge = (healthStatus: string, dbStatus: string) => {
    if (dbStatus === 'error') {
      return {
        label: 'Reconnect Required',
        color: 'text-red-600 border-red-200 bg-red-50',
        icon: 'fa-solid fa-circle-exclamation'
      };
    }

    switch (healthStatus) {
      case 'token_expiring':
        return {
          label: 'Token Expiring',
          color: 'text-amber-600 border-amber-200 bg-amber-50',
          icon: 'fa-solid fa-triangle-exclamation'
        };
      case 'token_expired':
        return {
          label: 'Token Expired',
          color: 'text-red-600 border-red-200 bg-red-50',
          icon: 'fa-solid fa-circle-xmark'
        };
      case 'reconnect_required':
        return {
          label: 'Reconnect Required',
          color: 'text-red-600 border-red-200 bg-red-50',
          icon: 'fa-solid fa-circle-exclamation'
        };
      case 'connected':
      default:
        return {
          label: 'Connected',
          color: 'text-emerald-600 border-emerald-200 bg-emerald-50',
          icon: 'fa-solid fa-circle-check'
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-white border-dash-border !text-dash-text rounded-2xl shadow-xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header — icon badge + title + subtitle, matches the AI/Write-with-AI and Tag modal chrome */}
        <div className="px-6 py-5 border-b border-dash-border bg-dash-surface shrink-0">
          <DialogHeader className="space-y-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-dash-accent/10 !text-dash-accent flex items-center justify-center shrink-0">
                <i className="fa-brands fa-meta text-sm"></i>
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-sm font-bold !text-dash-text">
                  {isOauthWizard
                    ? `${targetPlatform ? targetPlatform.charAt(0).toUpperCase() + targetPlatform.slice(1) : 'Meta'} Onboarding (Step ${wizardStep}/${totalSteps})`
                    : 'Meta Connections'}
                </DialogTitle>
                <DialogDescription className="text-[11px] font-medium !text-dash-textMuted mt-0.5 leading-relaxed">
                  {isOauthWizard
                    ? `Select your ${targetPlatform === 'whatsapp' ? 'WhatsApp Business Account and Phone Line' : targetPlatform === 'instagram' ? 'Facebook Page and Instagram Account' : 'Facebook Page'} to finalize the integration.`
                    : 'Link and manage connected Pages, Instagram accounts, and WhatsApp lines integrated with the Unified Inbox.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto p-6 common-scrollbar">
          {isLoading ? (
            <div className="flex flex-col gap-4 py-8 items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-dash-accent border-t-transparent animate-spin motion-reduce:animate-none"></div>
              <span className="text-xs !text-dash-textMuted">Loading connection details...</span>
            </div>
          ) : isOauthWizard ? (
            /* OAUTH-FIRST WIZARD STEP-BY-STEP UI */
            <div className="flex flex-col gap-4">
              {/* Step Progress Bar */}
              <div className="flex items-center justify-between gap-1 mb-2">
                {stepsList.map((stepName, index) => {
                  const stepNum = index + 1;
                  return (
                    <div key={stepName} className="flex-1 flex flex-col gap-1.5">
                      <div className={cn(
                        "h-1 rounded-full transition-all duration-300",
                        stepNum <= wizardStep ? 'bg-dash-accent' : 'bg-dash-border'
                      )} />
                      <span className={cn(
                        "text-[8.5px] text-center font-bold tracking-wider uppercase",
                        stepNum === wizardStep ? '!text-dash-accent' : '!text-dash-textMuted'
                      )}>
                        {stepName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {wizardLoading ? (
                <div className="flex flex-col gap-4 py-8 items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-dash-accent border-t-transparent animate-spin motion-reduce:animate-none"></div>
                  <span className="text-xs !text-dash-textMuted">Syncing asset metadata...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* STEP 1: SELECT BUSINESS */}
                  {wizardStep === 1 && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-dash-accent/5 border border-dash-accent/10 rounded-xl">
                        <span className="text-[11.5px] font-bold !text-dash-text block mb-1">Select Meta Business Account</span>
                        <p className="text-[10px] !text-dash-textMuted leading-relaxed mb-0">
                          Choose the Business Manager portfolio containing your Facebook Pages and WhatsApp lines.
                        </p>
                      </div>

                      <DashFormField label="Meta Business Portfolio">
                        <select
                          value={selectedBusiness}
                          onChange={(e) => handleBusinessSelect(e.target.value)}
                          className={selectBase}
                        >
                          {businesses.length === 0 ? (
                            <option value="">No Business Portfolios Found</option>
                          ) : (
                            businesses.map((biz) => (
                              <option key={biz.id} value={biz.id}>{biz.name}</option>
                            ))
                          )}
                        </select>
                      </DashFormField>

                      <div className="flex items-center gap-3 mt-4">
                        <DashButton
                          type="button"
                          onClick={handleExitWizard}
                          variant="ghost"
                          className="flex-1"
                        >
                          Cancel Setup
                        </DashButton>
                        <DashButton
                          type="button"
                          onClick={handleStep1Next}
                          disabled={!selectedBusiness}
                          variant="primary"
                          className="flex-1"
                        >
                          Continue
                        </DashButton>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: SELECT FACEBOOK PAGE OR WHATSAPP BUSINESS */}
                  {wizardStep === 2 && (
                    targetPlatform === 'whatsapp' ? (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-dash-accent/5 border border-dash-accent/10 rounded-xl">
                          <span className="text-[11.5px] font-bold !text-dash-text block mb-1">Select WhatsApp Business Account</span>
                          <p className="text-[10px] !text-dash-textMuted leading-relaxed mb-0">
                            Select the WhatsApp Business Account (WABA) containing the phone lines you wish to link.
                          </p>
                        </div>

                        <DashFormField label="WhatsApp Business Account (WABA)">
                          <select
                            value={selectedWaba?.id || ''}
                            onChange={(e) => handleWabaChange(e.target.value)}
                            className={selectBase}
                          >
                            {waAccounts.length === 0 ? (
                              <option value="">No WhatsApp Business Accounts Found</option>
                            ) : (
                              waAccounts.map((wa) => (
                                <option key={wa.id} value={wa.id}>{wa.name} ({wa.id})</option>
                              ))
                            )}
                          </select>
                        </DashFormField>

                        <div className="flex items-center gap-3 mt-4">
                          <DashButton
                            type="button"
                            onClick={() => setWizardStep(1)}
                            variant="ghost"
                            className="flex-1"
                          >
                            Back
                          </DashButton>
                          <DashButton
                            type="button"
                            onClick={handleStep2Next}
                            disabled={!selectedWaba}
                            variant="primary"
                            className="flex-1"
                          >
                            Continue
                          </DashButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-dash-accent/5 border border-dash-accent/10 rounded-xl">
                          <span className="text-[11.5px] font-bold !text-dash-text block mb-1">Select Facebook Page</span>
                          <p className="text-[10px] !text-dash-textMuted leading-relaxed mb-0">
                            Select the Facebook Page you wish to link for routing messages.
                          </p>
                        </div>

                        <DashFormField label="Facebook Page">
                          <select
                            value={selectedPage?.id || ''}
                            onChange={(e) => {
                              const pg = pages.find(p => p.id === e.target.value);
                              setSelectedPage(pg || null);
                            }}
                            className={selectBase}
                          >
                            {pages.length === 0 ? (
                              <option value="">No Facebook Pages Found</option>
                            ) : (
                              pages.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                              ))
                            )}
                          </select>
                        </DashFormField>

                        <div className="flex items-center gap-3 mt-4">
                          <DashButton
                            type="button"
                            onClick={() => setWizardStep(1)}
                            variant="ghost"
                            className="flex-1"
                          >
                            Back
                          </DashButton>
                          <DashButton
                            type="button"
                            onClick={handleStep2Next}
                            disabled={!selectedPage}
                            variant="primary"
                            className="flex-1"
                          >
                            {targetPlatform === 'facebook' ? 'Save Connection' : 'Continue'}
                          </DashButton>
                        </div>
                      </div>
                    )
                  )}

                  {/* STEP 3: LINK INSTAGRAM OR WHATSAPP PHONE */}
                  {wizardStep === 3 && (
                    targetPlatform === 'whatsapp' ? (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-[#25d366]/5 border border-[#25d366]/10 rounded-xl">
                          <span className="text-[11.5px] font-bold !text-dash-text block mb-1">Select WhatsApp Phone Line</span>
                          <p className="text-[10px] !text-dash-textMuted leading-relaxed mb-0">
                            Select the specific phone number line to link for customer chats.
                          </p>
                        </div>

                        <DashFormField label="Phone Number / Line">
                          <select
                            value={selectedPhone?.id || ''}
                            onChange={(e) => {
                              const phone = phoneNumbers.find(p => p.id === e.target.value);
                              setSelectedPhone(phone || null);
                            }}
                            className={selectBase}
                          >
                            {phoneNumbers.length === 0 ? (
                              <option value="">No WhatsApp Phone Numbers Found</option>
                            ) : (
                              phoneNumbers.map((phone) => (
                                <option key={phone.id} value={phone.id}>
                                  {phone.verified_name} ({phone.display_phone_number})
                                </option>
                              ))
                            )}
                          </select>
                        </DashFormField>

                        <div className="flex items-center gap-3 mt-4">
                          <DashButton
                            type="button"
                            onClick={() => setWizardStep(2)}
                            variant="ghost"
                            className="flex-1"
                          >
                            Back
                          </DashButton>
                          <DashButton
                            type="button"
                            onClick={handleSaveWizard}
                            disabled={!selectedPhone}
                            variant="primary"
                            className="flex-1"
                          >
                            Save Connection
                          </DashButton>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-[#ec4899]/5 border border-[#ec4899]/10 rounded-xl">
                          <span className="text-[11.5px] font-bold !text-dash-text block mb-1">Link Instagram Direct</span>
                          <p className="text-[10px] !text-dash-textMuted leading-relaxed mb-0">
                            Choose the Instagram Business Account connected to your selected Facebook page.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          {igAccounts.length === 0 ? (
                            <div className="flex flex-col gap-3">
                              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber/10 border border-amber/20 text-[11px] text-amber leading-relaxed">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>Auto-detection unavailable. Enter your Instagram Business Account ID manually.</span>
                              </div>
                              <DashFormField label="Instagram Business Account ID">
                                <DashInput
                                  type="text"
                                  placeholder="Enter Instagram Business Account ID"
                                  value={selectedInstagram?.id || ''}
                                  onChange={(e) => setSelectedInstagram(e.target.value ? { id: e.target.value, username: 'instagram_account' } : null)}
                                />
                              </DashFormField>
                              <DashFormField label="Instagram Username (optional)">
                                <DashInput
                                  type="text"
                                  placeholder="Enter Instagram username"
                                  value={selectedInstagram?.username || ''}
                                  onChange={(e) => setSelectedInstagram(prev => prev ? { ...prev, username: e.target.value } : null)}
                                />
                              </DashFormField>
                            </div>
                          ) : (
                            igAccounts.map((ig) => (
                              <label
                                key={ig.id}
                                className={cn(
                                  "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer",
                                  selectedInstagram?.id === ig.id
                                    ? 'bg-[#ec4899]/5 border-[#ec4899]/30'
                                    : 'bg-dash-surface border-dash-border hover:border-dash-textMuted/40'
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <input
                                    type="radio"
                                    name="instagram_select"
                                    checked={selectedInstagram?.id === ig.id}
                                    onChange={() => setSelectedInstagram(ig)}
                                    className="accent-[#ec4899]"
                                  />
                                  <div className="flex flex-col">
                                    <span className="text-[12px] font-bold !text-dash-text">@{ig.username}</span>
                                    <span className="text-[9px] !text-dash-textMuted mt-0.5">ID: {ig.id}</span>
                                  </div>
                                </div>
                                <i className="fa-brands fa-instagram text-[#ec4899] text-base"></i>
                              </label>
                            ))
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                          <DashButton
                            type="button"
                            onClick={() => setWizardStep(2)}
                            variant="ghost"
                            className="flex-1"
                          >
                            Back
                          </DashButton>
                          <DashButton
                            type="button"
                            onClick={handleSaveWizard}
                            disabled={igAccounts.length > 0 && !selectedInstagram}
                            variant="primary"
                            className="flex-1"
                          >
                            Save Connection
                          </DashButton>
                        </div>
                      </div>
                    )
                  )}

                  {/* STEP 4: LEGACY FALLBACK FOR WHATSAPP */}
                  {wizardStep === 4 && !targetPlatform && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-dash-accent/5 border border-dash-accent/10 rounded-xl">
                        <span className="text-[11.5px] font-bold !text-dash-text block mb-1">Link WhatsApp Cloud API</span>
                        <p className="text-[10px] !text-dash-textMuted leading-relaxed mb-0">
                          Select the WhatsApp Business Account (WABA) and specific phone number you wish to link.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <DashFormField label="WhatsApp Business Account (WABA)">
                          <select
                            value={selectedWaba?.id || 'skip'}
                            onChange={(e) => handleWabaChange(e.target.value)}
                            className={selectBase}
                          >
                            <option value="skip">Do not connect WhatsApp (Skip)</option>
                            {waAccounts.map((wa) => (
                              <option key={wa.id} value={wa.id}>{wa.name} ({wa.id})</option>
                            ))}
                          </select>
                        </DashFormField>

                        {selectedWaba && (
                          <DashFormField label="Phone Number / Line" className="mt-1 animate-fadeIn">
                            <select
                              value={selectedPhone?.id || ''}
                              onChange={(e) => {
                                const phone = phoneNumbers.find(p => p.id === e.target.value);
                                setSelectedPhone(phone || null);
                              }}
                              className={selectBase}
                            >
                              {phoneNumbers.length === 0 ? (
                                <option value="">No WhatsApp Phone Numbers Found</option>
                              ) : (
                                phoneNumbers.map((phone) => (
                                  <option key={phone.id} value={phone.id}>
                                    {phone.verified_name} ({phone.display_phone_number})
                                  </option>
                                ))
                              )}
                            </select>
                          </DashFormField>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-6">
                        <DashButton
                          type="button"
                          onClick={() => setWizardStep(3)}
                          variant="ghost"
                          className="flex-1"
                        >
                          Back
                        </DashButton>
                        <DashButton
                          type="button"
                          onClick={handleSaveWizard}
                          disabled={selectedWaba && !selectedPhone}
                          variant="primary"
                          className="flex-1"
                        >
                          Save Connection
                        </DashButton>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* STANDARD OAUTH-FIRST MODE (FALLBACK IF NO WIZARD) */
            <div className="flex flex-col gap-4">
              {!isAnyConnected ? (
                /* Empty state, connect main button */
                <div className="py-6 flex flex-col items-center justify-center text-center px-4">
                  <div className="w-16 h-16 rounded-full bg-dash-accent/10 border border-dash-accent/20 flex items-center justify-center mb-4">
                    <i className="fa-brands fa-meta text-2xl !text-dash-accent"></i>
                  </div>
                  <h5 className="text-base font-bold !text-dash-text mb-1">OAuth-First Meta Onboarding</h5>
                  <p className="text-[11.5px] !text-dash-textMuted max-w-sm mb-6 leading-relaxed">
                    Connect your Meta Business Account once to automatically discover and integrate Facebook Pages, Instagram DM endpoints, and WhatsApp Cloud APIs.
                  </p>
                  <DashButton
                    asChild
                    variant="primary"
                    className="w-full max-w-xs"
                  >
                    <a href={metaUrl}>
                      <i className="fa-brands fa-facebook text-lg"></i>
                      Connect Meta Account
                    </a>
                  </DashButton>
                </div>
              ) : (
                /* Connected Assets Display */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-[12px] font-bold uppercase tracking-wider !text-dash-accent">Connected Assets</h5>
                    <DashButton
                      asChild
                      variant="secondary"
                      size="sm"
                      className="h-7 px-2.5 text-[10px]"
                    >
                      <a href={metaUrl}>
                        <i className="fa-solid fa-arrows-rotate"></i>
                        Reconnect Account
                      </a>
                    </DashButton>
                  </div>

                  {/* Facebook Asset */}
                  <div className="p-3 rounded-xl bg-dash-surface border border-dash-border flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <i className="fa-brands fa-facebook-messenger text-sm text-[#1877f2]"></i>
                        <span className="text-[11.5px] font-bold !text-dash-text">Facebook Messenger</span>
                      </div>
                      {fbConn ? (
                        <div className={cn("px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1.5", getHealthBadge(fbConn.credentials?.health_status, fbConn.status).color)}>
                          <i className={getHealthBadge(fbConn.credentials?.health_status, fbConn.status).icon}></i>
                          {getHealthBadge(fbConn.credentials?.health_status, fbConn.status).label}
                        </div>
                      ) : (
                        <span className="text-[9px] !text-dash-textMuted font-semibold">Not Linked</span>
                      )}
                    </div>
                    {fbConn && (
                      <div className="flex items-center justify-between mt-1 pl-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] !text-dash-text font-bold">{fbConn.credentials?.page_name || 'Facebook Page'}</span>
                          <span className="text-[9px] !text-dash-textMuted mt-0.5">ID: {fbConn.credentials?.page_id || 'N/A'}</span>
                        </div>
                        <DashButton
                          onClick={() => handleDisconnect('facebook')}
                          variant="secondary"
                          size="sm"
                          className="h-6 px-2 text-[9px] bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                        >
                          Disconnect
                        </DashButton>
                      </div>
                    )}
                  </div>

                  {/* Instagram Asset */}
                  <div className="p-3 rounded-xl bg-dash-surface border border-dash-border flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <i className="fa-brands fa-instagram text-sm text-[#ec4899]"></i>
                        <span className="text-[11.5px] font-bold !text-dash-text">Instagram Direct</span>
                      </div>
                      {igConn ? (
                        <div className={cn("px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1.5", getHealthBadge(igConn.credentials?.health_status, igConn.status).color)}>
                          <i className={getHealthBadge(igConn.credentials?.health_status, igConn.status).icon}></i>
                          {getHealthBadge(igConn.credentials?.health_status, igConn.status).label}
                        </div>
                      ) : (
                        <span className="text-[9px] !text-dash-textMuted font-semibold">Not Linked</span>
                      )}
                    </div>
                    {igConn && (
                      <div className="flex items-center justify-between mt-1 pl-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] !text-dash-text font-bold">@{igConn.credentials?.instagram_username || 'ig_account'}</span>
                          <span className="text-[9px] !text-dash-textMuted mt-0.5">ID: {igConn.credentials?.instagram_id || 'N/A'}</span>
                        </div>
                        <DashButton
                          onClick={() => handleDisconnect('instagram')}
                          variant="secondary"
                          size="sm"
                          className="h-6 px-2 text-[9px] bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                        >
                          Disconnect
                        </DashButton>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Asset */}
                  <div className="p-3 rounded-xl bg-dash-surface border border-dash-border flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <i className="fa-brands fa-whatsapp text-sm text-[#25d366]"></i>
                        <span className="text-[11.5px] font-bold !text-dash-text">WhatsApp Cloud API</span>
                      </div>
                      {waConn ? (
                        <div className={cn("px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1.5", getHealthBadge(waConn.credentials?.health_status, waConn.status).color)}>
                          <i className={getHealthBadge(waConn.credentials?.health_status, waConn.status).icon}></i>
                          {getHealthBadge(waConn.credentials?.health_status, waConn.status).label}
                        </div>
                      ) : (
                        <span className="text-[9px] !text-dash-textMuted font-semibold">Not Linked</span>
                      )}
                    </div>
                    {waConn && (
                      <div className="flex items-center justify-between mt-1 pl-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] !text-dash-text font-bold">{waConn.credentials?.whatsapp_business_name || 'WhatsApp Line'}</span>
                          <span className="text-[9px] !text-dash-textMuted mt-0.5">Num: {waConn.credentials?.whatsapp_phone_number || 'N/A'}</span>
                        </div>
                        <DashButton
                          onClick={() => handleDisconnect('whatsapp')}
                          variant="secondary"
                          size="sm"
                          className="h-6 px-2 text-[9px] bg-red-50 border-red-200 text-red-600 hover:bg-red-100"
                        >
                          Disconnect
                        </DashButton>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General details / Last sync */}
              <div className="mt-2 p-3 rounded-lg bg-dash-surface border border-dash-border text-[10px] !text-dash-textMuted font-medium flex items-center justify-between">
                <span>Asset Synced State</span>
                <span className="!text-dash-text">
                  {connections.length > 0 && connections[0].last_sync_at
                    ? format(new Date(connections[0].last_sync_at), 'MMM dd, yyyy hh:mm a')
                    : 'Never synced'}
                </span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
