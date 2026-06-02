'use client';

import React, { useState, useEffect } from 'react';
import { Space_Grotesk, DM_Sans } from 'next/font/google';
import { BusinessStep } from './steps/BusinessStep';
import { PageStep } from './steps/PageStep';
import { InstagramStep } from './steps/InstagramStep';
import { WhatsAppStep } from './steps/WhatsAppStep';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-space-grotesk',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
});

interface ConnectPlatformsModalProps {
  open: boolean;
  platform: 'facebook' | 'instagram' | 'whatsapp' | 'all';
  onClose: () => void;
  onComplete: (result: { platform: string; assetName: string }) => void;
}

const FBIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const IGIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="24" height="24" rx="6" fill="url(#ig-modal-grad)"/>
    <path d="M12 6.865A5.135 5.135 0 1017.135 12 5.139 5.139 0 0012 6.865zm0 8.468A3.333 3.333 0 1115.333 12 3.338 3.338 0 0112 15.333z" fill="white"/>
    <circle cx="17.6" cy="6.4" r="1.2" fill="white"/>
    <defs>
      <linearGradient id="ig-modal-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
        <stop stop-color="#E1306C"/>
        <stop offset="0.5" stop-color="#C13584"/>
        <stop offset="1" stop-color="#833AB4"/>
      </linearGradient>
    </defs>
  </svg>
);

const WAIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M19.001 4.908A9.817 9.817 0 0012.04 2c-5.46 0-9.902 4.443-9.905 9.905 0 1.747.457 3.45 1.321 4.95L2 22l5.255-1.377a9.833 9.833 0 004.782 1.237h.004c5.46 0 9.902-4.444 9.905-9.906a9.83 9.83 0 00-2.945-6.946z" fill="#25D366"/>
    <path d="M12.04 3.655c4.548 0 8.249 3.7 8.251 8.251a8.217 8.217 0 01-2.456 5.834c-1.56 1.56-3.636 2.418-5.8 2.418h-.003a8.227 8.227 0 01-4.195-1.155l-.301-.18-3.12.817.832-3.042-.197-.315a8.232 8.232 0 01-1.218-4.275c.002-4.55 3.702-8.25 8.251-8.251z" fill="white"/>
    <path d="M15.42 13.567c-.201-.1-.1.1-.989-.44l-.794-.37c-.165-.08-.285-.12-.405.06-.12.18-.465.586-.57.705-.105.12-.21.135-.411.035a5.178 5.178 0 01-1.524-.94c-.424-.378-.71-.845-.794-.99-.084-.144-.009-.222.091-.322.09-.09.2-.234.3-.35.1-.118.134-.198.201-.33.067-.132.033-.249-.017-.35-.05-.1-.405-.989-.556-1.353-.146-.354-.294-.306-.405-.312l-.345-.006c-.12 0-.315.045-.48.225-.165.18-.63.615-.63 1.502s.645 1.741.735 1.861c.09.12 1.27 1.939 3.076 2.718a10.24 10.24 0 001.025.378c.432.138.825.118 1.136.072.347-.052 1.07-.438 1.22-.84.15-.402.15-.747.105-.82-.045-.072-.165-.112-.366-.212z" fill="#25D366"/>
  </svg>
);

const MetaIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
  </svg>
);

export function ConnectPlatformsModal({
  open,
  platform,
  onClose,
  onComplete,
}: ConnectPlatformsModalProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form selections
  const [business, setBusiness] = useState('');
  const [page, setPage] = useState('');
  const [instagramAccount, setInstagramAccount] = useState('');
  const [waba, setWaba] = useState('');
  const [phoneLine, setPhoneLine] = useState('');

  // Simulate loading assets when moving steps
  useEffect(() => {
    setIsLoading(true);
    setErrorMsg(null);
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Simulate an error state if the user chose GulfBridge Ventures
      if (currentStep === 2 && business === 'GulfBridge Ventures') {
        setErrorMsg('Failed to sync portfolios. Connection timed out.');
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [currentStep, business]);

  if (!open) return null;

  const stepsList =
    platform === 'facebook' ? ['Business', 'Page'] :
    platform === 'instagram' ? ['Business', 'Page', 'Instagram'] :
    platform === 'whatsapp' ? ['Business', 'WhatsApp', 'Phone Line'] :
    ['Business', 'Page', 'Instagram', 'WhatsApp'];

  const totalSteps = stepsList.length;

  const handleContinue = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step: Complete Setup
      let assetName = '';
      if (platform === 'facebook') assetName = page;
      else if (platform === 'instagram') assetName = instagramAccount;
      else if (platform === 'whatsapp') assetName = phoneLine;
      else assetName = phoneLine || instagramAccount || page;

      onComplete({
        platform,
        assetName: assetName || 'Meta Connected Line',
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const getHeaderIcon = () => {
    switch (platform) {
      case 'facebook': return <FBIcon />;
      case 'instagram': return <IGIcon />;
      case 'whatsapp': return <WAIcon />;
      default: return <MetaIcon />;
    }
  };

  const getPlatformLabel = () => {
    switch (platform) {
      case 'facebook': return 'Facebook';
      case 'instagram': return 'Instagram';
      case 'whatsapp': return 'WhatsApp';
      default: return 'Meta';
    }
  };

  const isNextDisabled = () => {
    if (isLoading || errorMsg) return true;
    if (currentStep === 1 && !business) return true;
    if (platform === 'facebook') {
      if (currentStep === 2 && !page) return true;
    }
    if (platform === 'instagram') {
      if (currentStep === 2 && !page) return true;
      if (currentStep === 3 && !instagramAccount) return true;
    }
    if (platform === 'whatsapp') {
      if (currentStep === 2 && !waba) return true;
      if (currentStep === 3 && !phoneLine) return true;
    }
    if (platform === 'all') {
      if (currentStep === 2 && !page) return true;
      if (currentStep === 3 && !instagramAccount) return true;
      if (currentStep === 4 && !phoneLine) return true;
    }
    return false;
  };

  // Render proper step content
  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col gap-2.5">
          <div className="h-4 bg-white/4 rounded w-1/3 animate-pulse"></div>
          <div className="h-10 bg-white/4 rounded-lg animate-pulse"></div>
          <div className="h-3 bg-white/4 rounded w-2/3 animate-pulse"></div>
        </div>
      );
    }

    if (errorMsg) {
      return (
        <div className="bg-[rgba(245,158,11,0.08)] border-l-2 border-[#f59e0b] px-4 py-3 rounded-r-lg flex items-start gap-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-[#94a3c8] font-medium leading-tight">{errorMsg}</span>
            <button onClick={() => setCurrentStep(currentStep)} className="text-[#3b82f6] text-[11px] hover:underline font-semibold self-start mt-1">Try again</button>
          </div>
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return <BusinessStep value={business} onChange={setBusiness} />;
      case 2:
        if (platform === 'whatsapp') {
          return <WhatsAppStep mode="waba" value={waba} onChange={setWaba} />;
        }
        return <PageStep value={page} onChange={setPage} />;
      case 3:
        if (platform === 'whatsapp') {
          return <WhatsAppStep mode="phone" value={phoneLine} onChange={setPhoneLine} />;
        }
        return <InstagramStep value={instagramAccount} onChange={setInstagramAccount} />;
      case 4:
        return <WhatsAppStep mode="phone" value={phoneLine} onChange={setPhoneLine} />;
      default:
        return null;
    }
  };

  return (
    <div className={`${spaceGrotesk.variable} ${dmSans.variable} font-dm-sans min-h-[500px] w-full flex items-center justify-center bg-[#04091a]/75 backdrop-blur-sm p-4`}>
      <div className="w-[520px] max-h-[80vh] overflow-y-auto bg-[#080f28] border border-white/13 rounded-[16px] p-[28px] text-[#eef2ff] shadow-2xl relative flex flex-col justify-between">
        
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {getHeaderIcon()}
              <h3 className="text-[17px] font-semibold font-space-grotesk text-[#eef2ff]">
                {getPlatformLabel()} Setup
              </h3>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 border border-white/7 hover:bg-white/10 hover:border-white/13 flex items-center justify-center text-[#94a3c8] hover:text-[#eef2ff] transition-all cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-[12px] text-[#4a5a82] leading-normal font-medium">
            Connect your account to start receiving messages in the Unified Inbox.
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="my-6 relative">
          {/* Progress Connecting Line */}
          <div className="absolute top-[14px] left-[14px] right-[14px] h-[1px] bg-white/7 z-0" />
          <div 
            className="absolute top-[14px] left-[14px] h-[1px] bg-[#2563eb] transition-all duration-300 z-0" 
            style={{ width: `${((currentStep - 1) / (totalSteps - 1 || 1)) * 100}%` }}
          />

          <div className="flex items-center justify-between relative z-10">
            {stepsList.map((stepLabel, idx) => {
              const stepNum = idx + 1;
              const isCompleted = stepNum < currentStep;
              const isActive = stepNum === currentStep;

              return (
                <div key={stepLabel} className="flex flex-col items-center gap-1.5 flex-1">
                  {/* Circle */}
                  <div
                    className={`w-7 h-7 rounded-full text-[11px] font-bold font-space-grotesk transition-all duration-300 ${
                      isCompleted ? 'bg-[#2563eb] text-white flex items-center justify-center' :
                      isActive ? 'bg-[#2563eb] text-white ring-4 ring-[#2563eb]/25 flex items-center justify-center' :
                      'bg-[#080f28] border border-white/13 text-[#4a5a82] flex items-center justify-center'
                    }`}
                  >
                    {isCompleted ? (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      stepNum
                    )}
                  </div>

                  {/* Label */}
                  <span
                    className={`text-[10px] font-medium uppercase tracking-wider font-dm-sans transition-colors duration-300 ${
                      isActive ? 'text-[#94a3c8]' : 'text-[#4a5a82]'
                    }`}
                  >
                    {stepLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 py-2 min-h-[140px]">
          {currentStep > 1 && !isLoading && !errorMsg && (
            <button
              onClick={handleBack}
              className="text-[#94a3c8] hover:text-[#eef2ff] text-[11px] font-semibold flex items-center gap-1 mb-3 transition-colors outline-none cursor-pointer"
            >
              ← Back
            </button>
          )}
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-white/7 pt-5 mt-6 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 h-10 rounded-[8px] bg-white/6 hover:bg-white/10 border border-white/7 text-[13px] font-semibold text-[#94a3c8] hover:text-[#eef2ff] transition-all cursor-pointer"
          >
            Cancel Setup
          </button>
          <button
            onClick={handleContinue}
            disabled={isNextDisabled()}
            className="px-4 h-10 rounded-[8px] bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 disabled:hover:bg-[#2563eb] disabled:cursor-not-allowed text-[13px] font-semibold text-white transition-all cursor-pointer flex items-center gap-1.5"
          >
            {currentStep === totalSteps ? 'Finish Setup ✓' : 'Continue →'}
          </button>
        </div>

      </div>
    </div>
  );
}

export default ConnectPlatformsModal;
