'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Shield, ShieldAlert, Award, FileText, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface KycConsentClientProps {
  consent: any;
}

export default function KycConsentClient({ consent }: KycConsentClientProps) {
  const [isSubmitted, setIsSubmitted] = useState(consent.status === 'obtained');
  const [loading, setLoading] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const contact = consent.contact || {};
  const workspace = consent.workspace || {};
  const checkTypes = consent.check_types || [];

  const checkMap: Record<string, string> = {
    hanis_identity: 'Home Affairs ID verification (HANIS)',
    credit_report: 'Bureaux Credit History & Credit score verification',
    sanctions_screen: 'International Sanctions screening (AML/CFT compliance)',
    pep_check: 'Politically Exposed Persons Screening',
    address_verification: 'Proof of Address verification',
  };

  useEffect(() => {
    if (isSubmitted) return;
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = canvas.parentElement?.clientWidth || 450;
      canvas.height = 180;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0c1535';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [isSubmitted]);

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      if (e.cancelable) e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#0c1535';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSubmit = async () => {
    if (!consentChecked) {
      toast.error('You must tick the legal declaration checkbox to proceed.');
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const signatureData = canvas.toDataURL();

    setLoading(true);
    try {
      const res = await fetch('/api/kyc/consent/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consentId: consent.id,
          signatureData,
          deviceFingerprint: typeof window !== 'undefined' ? window.navigator.userAgent : 'Client UI'
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Consent successfully recorded!');
      setIsSubmitted(true);
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while submitting consent.');
    } finally {
      setLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#04091a] text-[#eef2ff] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-[#080f28] border border-white/5 p-8 rounded-[32px] text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-emerald-500" />
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto">
            <CheckCircle2 size={32} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold uppercase tracking-wide font-space-grotesk">Consent Completed</h1>
            <p className="text-xs text-[#94a3c8] leading-relaxed">
              Thank you, <strong className="text-white">{contact.first_name || 'Customer'}</strong>. Your explicit POPIA consent has been registered and cryptographically logged in the CRM database.
            </p>
          </div>
          <div className="p-4 bg-white/[0.01] border border-white/5 rounded-2xl text-[11px] text-[#4a5a82] text-left space-y-2 font-mono">
            <div><strong>Reference:</strong> {consent.reference}</div>
            <div><strong>Dispatched By:</strong> {workspace.name}</div>
            <div><strong>Date Signed:</strong> {new Date().toLocaleDateString()}</div>
          </div>
          <p className="text-[10px] text-[#4a5a82]">You may now close this browser tab safely.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#04091a] text-[#eef2ff] flex flex-col items-center justify-center py-12 px-4 md:px-6 font-sans">
      <div className="max-w-lg w-full bg-[#080f28] border border-white/5 rounded-[32px] shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-purple-500" />
        
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-3">
            {workspace.logo_url && (
              <img src={workspace.logo_url} alt={workspace.name} className="h-10 mx-auto object-contain max-w-[150px] mb-2" />
            )}
            <h1 className="text-xl font-bold uppercase tracking-wide font-space-grotesk">
              POPIA <span className="text-purple-400">Consent Form</span>
            </h1>
            <p className="text-xs text-[#94a3c8] tracking-[0.05em] uppercase font-medium">
              Requested by {workspace.name}
            </p>
          </div>

          <div className="border-t border-white/5 pt-5 space-y-5">
            {/* Context message */}
            <p className="text-xs text-[#94a3c8] leading-relaxed">
              Hello <strong className="text-[#eef2ff]">{contact.first_name} {contact.last_name || ''}</strong>, in compliance with the South African Protection of Personal Information Act (POPIA) and FICA guidelines, we require your explicit authorization to verify your identity and credentials.
            </p>

            {/* List of verifications */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider font-dm-sans">
                Specific checks to be run:
              </span>
              <div className="space-y-2">
                {checkTypes.map((t: string) => (
                  <div key={t} className="flex items-center gap-3 p-3 bg-[#0c1535] border border-white/5 rounded-xl text-xs text-[#eef2ff] font-semibold">
                    <Shield size={14} className="text-purple-400 shrink-0" />
                    <span>{checkMap[t] || t.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclosures & Terms */}
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4.5 space-y-3 text-[11px] text-[#94a3c8] leading-relaxed">
              <div className="flex items-start gap-2">
                <FileText size={14} className="text-[#4a5a82] shrink-0 mt-0.5" />
                <p>
                  <strong>Purpose of Processing:</strong> We collect and share your details solely to run security and credential verifications required under FICA anti-money laundering (AML) laws.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Award size={14} className="text-[#4a5a82] shrink-0 mt-0.5" />
                <p>
                  <strong>5-Year FICA Retention Notice:</strong> To comply with Section 22 of the Financial Intelligence Centre Act, all consent records and background verification logs are stored securely for a mandatory 5-year period, after which they are permanently purged.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <ShieldAlert size={14} className="text-[#4a5a82] shrink-0 mt-0.5" />
                <p>
                  <strong>Data Sharing Entities:</strong> Your personal data will be processed securely through regulated third-party credit bureaus and government registries (e.g. HANIS, TransUnion, Experian).
                </p>
              </div>
            </div>

            {/* Signature Area */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-wider font-dm-sans">
                  Touchscreen Signature
                </label>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[10px] font-black uppercase text-purple-400 hover:text-white transition-colors"
                >
                  Clear Signature
                </button>
              </div>
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#0c1535] cursor-crosshair touch-none">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-[180px]"
                />
              </div>
            </div>

            {/* Declaration Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none py-1">
              <input
                type="checkbox"
                checked={consentChecked}
                onChange={(e) => setConsentChecked(e.target.checked)}
                className="mt-0.5 accent-purple-500 rounded border border-white/5 bg-transparent"
              />
              <span className="text-[11px] text-[#94a3c8] leading-relaxed">
                I hereby declare that I am the owner of this information and explicitly consent to <strong>{workspace.name}</strong> verifying my identity and credentials using the channels listed above.
              </span>
            </label>

            {/* Actions */}
            <button
              onClick={handleSubmit}
              disabled={loading || !consentChecked}
              className="w-full h-11 bg-purple-600 hover:bg-purple-500 text-white font-black uppercase tracking-widest text-[11px] rounded-xl shadow-lg shadow-purple-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? 'Registering Consent...' : 'Submit Signed Consent'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
