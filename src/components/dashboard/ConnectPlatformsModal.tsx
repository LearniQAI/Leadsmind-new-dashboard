'use client';

import React, { useEffect, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface ConnectPlatformsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetPlatform?: 'facebook' | 'instagram' | 'whatsapp' | null;
}

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

  const loadConnections = async () => {
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
  };

  useEffect(() => {
    if (open) {
      loadConnections();
    }
  }, [open]);

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
        color: 'text-red-400 border-red-500/20 bg-red-500/5', 
        icon: 'fa-solid fa-circle-exclamation' 
      };
    }
    
    switch (healthStatus) {
      case 'token_expiring':
        return { 
          label: 'Token Expiring', 
          color: 'text-amber-400 border-amber-500/20 bg-amber-500/5', 
          icon: 'fa-solid fa-triangle-exclamation' 
        };
      case 'token_expired':
        return { 
          label: 'Token Expired', 
          color: 'text-red-400 border-red-500/20 bg-red-500/5', 
          icon: 'fa-solid fa-circle-xmark' 
        };
      case 'reconnect_required':
        return { 
          label: 'Reconnect Required', 
          color: 'text-red-400 border-red-500/20 bg-red-500/5', 
          icon: 'fa-solid fa-circle-exclamation' 
        };
      case 'connected':
      default:
        return { 
          label: 'Connected', 
          color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5', 
          icon: 'fa-solid fa-circle-check' 
        };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] bg-[#080f28]/95 border border-white/10 backdrop-blur-2xl text-white rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold tracking-tight font-space-grotesk text-[#eef2ff]">
              {isOauthWizard 
                ? `${targetPlatform ? targetPlatform.charAt(0).toUpperCase() + targetPlatform.slice(1) : 'Meta'} Onboarding (Step ${wizardStep}/${totalSteps})` 
                : 'Meta Connections'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-[#4a5a82] font-dm-sans leading-relaxed">
            {isOauthWizard
              ? `Select your ${targetPlatform === 'whatsapp' ? 'WhatsApp Business Account and Phone Line' : targetPlatform === 'instagram' ? 'Facebook Page and Instagram Account' : 'Facebook Page'} to finalize the integration.`
              : 'Link and manage connected Pages, Instagram accounts, and WhatsApp lines integrated with the Unified Inbox.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 flex flex-col gap-4">
          {isLoading ? (
            <div className="flex flex-col gap-4 py-8 items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
              <span className="text-xs text-[#4a5a82]">Loading connection details...</span>
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
                      <div className={`h-1 rounded-full transition-all duration-300 ${
                        stepNum <= wizardStep ? 'bg-indigo-500' : 'bg-white/10'
                      }`} />
                      <span className={`text-[8.5px] text-center font-bold tracking-wider uppercase ${
                        stepNum === wizardStep ? 'text-indigo-400' : 'text-[#4a5a82]'
                      }`}>
                        {stepName}
                      </span>
                    </div>
                  );
                })}
              </div>

              {wizardLoading ? (
                <div className="flex flex-col gap-4 py-8 items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
                  <span className="text-xs text-[#4a5a82]">Syncing asset metadata...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {/* STEP 1: SELECT BUSINESS */}
                  {wizardStep === 1 && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                        <span className="text-[11.5px] font-bold text-white block mb-1">Select Meta Business Account</span>
                        <p className="text-[10px] text-[#4a5a82] leading-relaxed mb-0">
                          Choose the Business Manager portfolio containing your Facebook Pages and WhatsApp lines.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-[#4a5a82] font-semibold">Meta Business Portfolio</label>
                        <select
                          value={selectedBusiness}
                          onChange={(e) => handleBusinessSelect(e.target.value)}
                          className="bg-[#0c1538] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
                        >
                          {businesses.length === 0 ? (
                            <option value="">No Business Portfolios Found</option>
                          ) : (
                            businesses.map((biz) => (
                              <option key={biz.id} value={biz.id}>{biz.name}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div className="flex items-center gap-3 mt-4">
                        <Button 
                          type="button" 
                          onClick={handleExitWizard} 
                          variant="ghost" 
                          className="flex-1 text-xs text-[#4a5a82] hover:text-white"
                        >
                          Cancel Setup
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleStep1Next}
                          disabled={!selectedBusiness}
                          className="flex-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                        >
                          Continue
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: SELECT FACEBOOK PAGE OR WHATSAPP BUSINESS */}
                  {wizardStep === 2 && (
                    targetPlatform === 'whatsapp' ? (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                          <span className="text-[11.5px] font-bold text-white block mb-1">Select WhatsApp Business Account</span>
                          <p className="text-[10px] text-[#4a5a82] leading-relaxed mb-0">
                            Select the WhatsApp Business Account (WABA) containing the phone lines you wish to link.
                          </p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#4a5a82] font-semibold">WhatsApp Business Account (WABA)</label>
                          <select
                            value={selectedWaba?.id || ''}
                            onChange={(e) => handleWabaChange(e.target.value)}
                            className="bg-[#0c1538] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
                          >
                            {waAccounts.length === 0 ? (
                              <option value="">No WhatsApp Business Accounts Found</option>
                            ) : (
                              waAccounts.map((wa) => (
                                <option key={wa.id} value={wa.id}>{wa.name} ({wa.id})</option>
                              ))
                            )}
                          </select>
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                          <Button 
                            type="button" 
                            onClick={() => setWizardStep(1)} 
                            variant="ghost" 
                            className="flex-1 text-xs text-[#4a5a82] hover:text-white"
                          >
                            Back
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleStep2Next}
                            disabled={!selectedWaba}
                            className="flex-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                          >
                            Continue
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                          <span className="text-[11.5px] font-bold text-white block mb-1">Select Facebook Page</span>
                          <p className="text-[10px] text-[#4a5a82] leading-relaxed mb-0">
                            Select the Facebook Page you wish to link for routing messages.
                          </p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#4a5a82] font-semibold">Facebook Page</label>
                          <select
                            value={selectedPage?.id || ''}
                            onChange={(e) => {
                              const pg = pages.find(p => p.id === e.target.value);
                              setSelectedPage(pg || null);
                            }}
                            className="bg-[#0c1538] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
                          >
                            {pages.length === 0 ? (
                              <option value="">No Facebook Pages Found</option>
                            ) : (
                              pages.map((p) => (
                                <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                              ))
                            )}
                          </select>
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                          <Button 
                            type="button" 
                            onClick={() => setWizardStep(1)} 
                            variant="ghost" 
                            className="flex-1 text-xs text-[#4a5a82] hover:text-white"
                          >
                            Back
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleStep2Next}
                            disabled={!selectedPage}
                            className="flex-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                          >
                            {targetPlatform === 'facebook' ? 'Save Connection' : 'Continue'}
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {/* STEP 3: LINK INSTAGRAM OR WHATSAPP PHONE */}
                  {wizardStep === 3 && (
                    targetPlatform === 'whatsapp' ? (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-[#25d366]/5 border border-[#25d366]/10 rounded-xl">
                          <span className="text-[11.5px] font-bold text-white block mb-1">Select WhatsApp Phone Line</span>
                          <p className="text-[10px] text-[#4a5a82] leading-relaxed mb-0">
                            Select the specific phone number line to link for customer chats.
                          </p>
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#4a5a82] font-semibold">Phone Number / Line</label>
                          <select
                            value={selectedPhone?.id || ''}
                            onChange={(e) => {
                              const phone = phoneNumbers.find(p => p.id === e.target.value);
                              setSelectedPhone(phone || null);
                            }}
                            className="bg-[#0c1538] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
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
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                          <Button 
                            type="button" 
                            onClick={() => setWizardStep(2)} 
                            variant="ghost" 
                            className="flex-1 text-xs text-[#4a5a82] hover:text-white"
                          >
                            Back
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleSaveWizard}
                            disabled={!selectedPhone}
                            className="flex-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-semibold"
                          >
                            Save Connection
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        <div className="p-3 bg-[#ec4899]/5 border border-[#ec4899]/10 rounded-xl">
                          <span className="text-[11.5px] font-bold text-white block mb-1">Link Instagram Direct</span>
                          <p className="text-[10px] text-[#4a5a82] leading-relaxed mb-0">
                            Choose the Instagram Business Account connected to your selected Facebook page.
                          </p>
                        </div>

                        <div className="flex flex-col gap-2">
                          {igAccounts.length === 0 ? (
                            <div className="p-3 rounded-lg border border-dashed border-white/10 text-center text-[11px] text-[#4a5a82]">
                              No linked Instagram Business Account detected for <strong>{selectedPage?.name}</strong>.
                            </div>
                          ) : (
                            igAccounts.map((ig) => (
                              <label 
                                key={ig.id} 
                                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                                  selectedInstagram?.id === ig.id 
                                    ? 'bg-[#ec4899]/5 border-[#ec4899]/30' 
                                    : 'bg-white/5 border-white/5 hover:border-white/10'
                                }`}
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
                                    <span className="text-[12px] font-bold text-white">@{ig.username}</span>
                                    <span className="text-[9px] text-[#4a5a82] mt-0.5">ID: {ig.id}</span>
                                  </div>
                                </div>
                                <i className="fa-brands fa-instagram text-[#ec4899] text-base"></i>
                              </label>
                            ))
                          )}
                        </div>

                        <div className="flex items-center gap-3 mt-4">
                          <Button 
                            type="button" 
                            onClick={() => setWizardStep(2)} 
                            variant="ghost" 
                            className="flex-1 text-xs text-[#4a5a82] hover:text-white"
                          >
                            Back
                          </Button>
                          <Button 
                            type="button" 
                            onClick={handleSaveWizard}
                            disabled={igAccounts.length > 0 && !selectedInstagram}
                            className="flex-1 text-xs text-white bg-indigo-600 hover:bg-indigo-700 font-semibold"
                          >
                            Save Connection
                          </Button>
                        </div>
                      </div>
                    )
                  )}

                  {/* STEP 4: LEGACY FALLBACK FOR WHATSAPP */}
                  {wizardStep === 4 && !targetPlatform && (
                    <div className="flex flex-col gap-3">
                      <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-xl">
                        <span className="text-[11.5px] font-bold text-white block mb-1">Link WhatsApp Cloud API</span>
                        <p className="text-[10px] text-[#4a5a82] leading-relaxed mb-0">
                          Select the WhatsApp Business Account (WABA) and specific phone number you wish to link.
                        </p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] text-[#4a5a82] font-semibold">WhatsApp Business Account (WABA)</label>
                          <select
                            value={selectedWaba?.id || 'skip'}
                            onChange={(e) => handleWabaChange(e.target.value)}
                            className="bg-[#0c1538] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
                          >
                            <option value="skip">Do not connect WhatsApp (Skip)</option>
                            {waAccounts.map((wa) => (
                              <option key={wa.id} value={wa.id}>{wa.name} ({wa.id})</option>
                            ))}
                          </select>
                        </div>

                        {selectedWaba && (
                          <div className="flex flex-col gap-1 mt-1 animate-fadeIn">
                            <label className="text-[10px] text-[#4a5a82] font-semibold">Phone Number / Line</label>
                            <select
                              value={selectedPhone?.id || ''}
                              onChange={(e) => {
                                const phone = phoneNumbers.find(p => p.id === e.target.value);
                                setSelectedPhone(phone || null);
                              }}
                              className="bg-[#0c1538] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 w-full"
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
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3 mt-6">
                        <Button 
                          type="button" 
                          onClick={() => setWizardStep(3)} 
                          variant="ghost" 
                          className="flex-1 text-xs text-[#4a5a82] hover:text-white"
                        >
                          Back
                        </Button>
                        <Button 
                          type="button" 
                          onClick={handleSaveWizard}
                          disabled={selectedWaba && !selectedPhone}
                          className="flex-1 text-xs text-white bg-emerald-600 hover:bg-emerald-700 font-semibold"
                        >
                          Save Connection
                        </Button>
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
                  <div className="w-16 h-16 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                    <i className="fa-brands fa-meta text-2xl text-indigo-400"></i>
                  </div>
                  <h5 className="text-base font-bold text-[#eef2ff] mb-1 font-space-grotesk">OAuth-First Meta Onboarding</h5>
                  <p className="text-[11.5px] text-[#4a5a82] max-w-sm mb-6 leading-relaxed">
                    Connect your Meta Business Account once to automatically discover and integrate Facebook Pages, Instagram DM endpoints, and WhatsApp Cloud APIs.
                  </p>
                  <Button
                    asChild
                    className="w-full max-w-xs h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center justify-center gap-2 rounded-xl"
                  >
                    <a href={metaUrl}>
                      <i className="fa-brands fa-facebook text-lg"></i>
                      Connect Meta Account
                    </a>
                  </Button>
                </div>
              ) : (
                /* Connected Assets Display */
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className="text-[12px] font-bold uppercase tracking-wider text-indigo-400 font-space-grotesk">Connected Assets</h5>
                    <Button
                      asChild
                      className="h-7 px-2.5 text-[10px] bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20"
                    >
                      <a href={metaUrl}>
                        <i className="fa-solid fa-arrows-rotate me-1.5"></i>
                        Reconnect Account
                      </a>
                    </Button>
                  </div>

                  {/* Facebook Asset */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <i className="fa-brands fa-facebook-messenger text-sm text-[#3b82f6]"></i>
                        <span className="text-[11.5px] font-bold text-white">Facebook Messenger</span>
                      </div>
                      {fbConn ? (
                        <div className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1.5 ${getHealthBadge(fbConn.credentials?.health_status, fbConn.status).color}`}>
                          <i className={getHealthBadge(fbConn.credentials?.health_status, fbConn.status).icon}></i>
                          {getHealthBadge(fbConn.credentials?.health_status, fbConn.status).label}
                        </div>
                      ) : (
                        <span className="text-[9px] text-[#4a5a82] font-semibold">Not Linked</span>
                      )}
                    </div>
                    {fbConn && (
                      <div className="flex items-center justify-between mt-1 pl-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white/90 font-bold">{fbConn.credentials?.page_name || 'Facebook Page'}</span>
                          <span className="text-[9px] text-[#4a5a82] mt-0.5">ID: {fbConn.credentials?.page_id || 'N/A'}</span>
                        </div>
                        <Button
                          onClick={() => handleDisconnect('facebook')}
                          className="h-6 px-2 text-[9px] font-bold bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400"
                        >
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Instagram Asset */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <i className="fa-brands fa-instagram text-sm text-[#ec4899]"></i>
                        <span className="text-[11.5px] font-bold text-white">Instagram Direct</span>
                      </div>
                      {igConn ? (
                        <div className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1.5 ${getHealthBadge(igConn.credentials?.health_status, igConn.status).color}`}>
                          <i className={getHealthBadge(igConn.credentials?.health_status, igConn.status).icon}></i>
                          {getHealthBadge(igConn.credentials?.health_status, igConn.status).label}
                        </div>
                      ) : (
                        <span className="text-[9px] text-[#4a5a82] font-semibold">Not Linked</span>
                      )}
                    </div>
                    {igConn && (
                      <div className="flex items-center justify-between mt-1 pl-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white/90 font-bold">@{igConn.credentials?.instagram_username || 'ig_account'}</span>
                          <span className="text-[9px] text-[#4a5a82] mt-0.5">ID: {igConn.credentials?.instagram_id || 'N/A'}</span>
                        </div>
                        <Button
                          onClick={() => handleDisconnect('instagram')}
                          className="h-6 px-2 text-[9px] font-bold bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400"
                        >
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* WhatsApp Asset */}
                  <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex flex-col gap-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <i className="fa-brands fa-whatsapp text-sm text-[#25d366]"></i>
                        <span className="text-[11.5px] font-bold text-white">WhatsApp Cloud API</span>
                      </div>
                      {waConn ? (
                        <div className={`px-2 py-0.5 rounded text-[9px] font-bold border flex items-center gap-1.5 ${getHealthBadge(waConn.credentials?.health_status, waConn.status).color}`}>
                          <i className={getHealthBadge(waConn.credentials?.health_status, waConn.status).icon}></i>
                          {getHealthBadge(waConn.credentials?.health_status, waConn.status).label}
                        </div>
                      ) : (
                        <span className="text-[9px] text-[#4a5a82] font-semibold">Not Linked</span>
                      )}
                    </div>
                    {waConn && (
                      <div className="flex items-center justify-between mt-1 pl-6">
                        <div className="flex flex-col">
                          <span className="text-[11px] text-white/90 font-bold">{waConn.credentials?.whatsapp_business_name || 'WhatsApp Line'}</span>
                          <span className="text-[9px] text-[#4a5a82] mt-0.5">Num: {waConn.credentials?.whatsapp_phone_number || 'N/A'}</span>
                        </div>
                        <Button
                          onClick={() => handleDisconnect('whatsapp')}
                          className="h-6 px-2 text-[9px] font-bold bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 text-red-400"
                        >
                          Disconnect
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* General details / Last sync */}
              <div className="mt-2 p-3 rounded-lg bg-white/5 text-[10px] text-[#4a5a82] font-medium flex items-center justify-between">
                <span>Asset Synced State</span>
                <span className="text-[#eef2ff]">
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
