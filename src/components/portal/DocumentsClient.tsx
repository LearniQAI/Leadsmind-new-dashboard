'use client';

import React, { useState, useRef, useEffect, useTransition, useCallback } from 'react';
import { FileText, Download, UploadCloud, AlertCircle, CheckCircle2, Lock, PenTool, Calendar, ShieldCheck, HelpCircle, Shield, Upload, Loader2, Camera, Scan, ShieldAlert } from 'lucide-react';
import { generateSignedDocumentUrl, uploadClientDocument, signPortalProposal } from '@/app/actions/documents';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentsClientProps {
  initialDocs: any[];
  initialProposals: any[];
  contactId: string;
  workspaceId: string;
}

export default function DocumentsClient({ initialDocs, initialProposals, contactId, workspaceId }: DocumentsClientProps) {
  const [docs, setDocs] = useState<any[]>(initialDocs);
  const [proposals, setProposals] = useState<any[]>(initialProposals);
  const [activeTab, setActiveTab] = useState<'vault' | 'esign'>('vault');
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // FICA Compliance States
  const [ficaDocs, setFicaDocs] = useState<any[]>([]);
  const [loadingFica, setLoadingFica] = useState(true);
  const [ficaUploading, setFicaUploading] = useState(false);
  const [selectedFicaType, setSelectedFicaType] = useState<string>('green_id');

  // Experian TrueID & OCR States
  const [ocrScanningDoc, setOcrScanningDoc] = useState<string | null>(null);
  const [ocrExtracted, setOcrExtracted] = useState<any | null>(null);
  const [showLivenessModal, setShowLivenessModal] = useState(false);
  const [livenessStep, setLivenessStep] = useState(0); // 0: instructions, 1: align face, 2: capturing/checking, 3: completed
  const [livenessInstruction, setLivenessInstruction] = useState('Position your face within the frame.');
  const [biometricChecking, setBiometricChecking] = useState(false);
  const [livenessResult, setLivenessResult] = useState<any | null>(null);
  const [inputLivenessIdNumber, setInputLivenessIdNumber] = useState('');


  const supabase = React.useMemo(() => createClient(), []);

  const loadFicaDocs = useCallback(async () => {
    setLoadingFica(true);
    try {
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
      if (!error && data) {
        setFicaDocs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFica(false);
    }
  }, [contactId, supabase]);

  useEffect(() => {
    loadFicaDocs();
  }, [loadFicaDocs]);

  // E-Sign States
  const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureType, setSignatureType] = useState<'draw' | 'type'>('draw');
  const [typedName, setTypedName] = useState('');
  
  // Canvas Ref for Drawing Signature
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  const [isPending, startTransition] = useTransition();

  // Helper: format bytes
  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Helper: Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // 1. Signed URL Document Download Handler
  const handleDownload = async (fileId: string, fileName: string) => {
    toast.info("Generating secure signed download link...", { duration: 2000 });
    try {
      const res = await generateSignedDocumentUrl(fileId);
      if (res.success && res.url) {
        toast.success("Secure link ready. Starting download.");
        window.open(res.url, '_blank');
      } else {
        toast.error(res.error || "Failed to generate download URL");
      }
    } catch (err: any) {
      toast.error("Error generating link: " + err.message);
    }
  };

  // 2. Dropzone & File Upload Logic
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File exceeds 15MB limit.");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await uploadClientDocument(formData);
      if (res.success) {
        toast.success(`"${file.name}" uploaded successfully and linked to vault.`);
        // Reload list / state refresh (simplified reload for layout consistency)
        window.location.reload();
      } else {
        toast.error(res.error || "Upload failed");
      }
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  // 3. E-Signature Drawing Logic
  useEffect(() => {
    if (selectedProposal && signatureType === 'draw' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        
        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [selectedProposal, signatureType]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    isDrawingRef.current = true;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    
    // Get mouse/touch coordinates relative to canvas
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
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
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  // 4. Submit Signature Workflow
  const handleSignatureSubmit = async () => {
    if (!selectedProposal) return;
    
    let signatureData = '';
    
    if (signatureType === 'draw') {
      if (!canvasRef.current) return;
      // Convert drawn canvas to base64 image data
      signatureData = canvasRef.current.toDataURL('image/png');
    } else {
      if (!typedName.trim()) {
        toast.error("Please type your name to sign.");
        return;
      }
      signatureData = `TYPED:${typedName}`;
    }

    setIsSigning(true);
    try {
      // Fetch mock client IP address
      const ipRes = await fetch('https://api.ipify.org?format=json').catch(() => null);
      const ipData = ipRes ? await ipRes.json() : null;
      const ipAddress = ipData?.ip || '192.168.1.1';

      const res = await signPortalProposal(selectedProposal.id, signatureData, ipAddress);
      
      if (res.success) {
        toast.success(`Proposal "${selectedProposal.title}" signed successfully!`);
        // Remove from pending tray
        setProposals(proposals.filter(p => p.id !== selectedProposal.id));
        setSelectedProposal(null);
        // Refresh page to load in documents vault
        window.location.reload();
      } else {
        toast.error(res.error || "Failed to record signature.");
      }
    } catch (err: any) {
      toast.error("Error signing proposal: " + err.message);
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Navigation Tabs */}
      <div className="flex border-b border-dash-border gap-2">
        <button
          onClick={() => setActiveTab('vault')}
          className={cn(
            "pb-4 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'vault'
              ? "border-purple-500 text-purple-600"
              : "border-transparent text-dash-textMuted hover:text-dash-text"
          )}
        >
          Secured Vault Locker
        </button>
        <button
          onClick={() => setActiveTab('esign')}
          className={cn(
            "pb-4 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative",
            activeTab === 'esign'
              ? "border-purple-500 text-purple-600"
              : "border-transparent text-dash-textMuted hover:text-dash-text"
          )}
        >
          E-Signature Pending Tray
          {proposals.length > 0 && (
            <span className="absolute top-[-5px] right-[-12px] bg-red-500 text-white rounded-full text-[9px] w-4.5 h-4.5 flex items-center justify-center font-bold animate-pulse">
              {proposals.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'vault' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Files List Directory */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-purple-500" /> Document Locker
            </h3>

            {docs.length === 0 ? (
              <div className="bg-white border border-dash-border p-12 rounded-3xl text-center space-y-3">
                <FileText size={32} className="text-dash-textMuted opacity-40 mx-auto" />
                <p className="text-xs text-dash-textMuted">No documents linked to your contact profile yet.</p>
              </div>
            ) : (
              <div className="bg-white border border-dash-border rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-dash-border bg-dash-surface text-[9.5px] font-black uppercase tracking-widest text-dash-textMuted">
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4">Shared Date</th>
                        <th className="px-6 py-4 text-right">Size</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dash-border">
                      {docs.map((doc, i) => {
                        const file = doc.file;
                        if (!file) return null;

                        return (
                          <tr key={i} className="hover:bg-dash-surface transition-all group">
                            <td className="px-6 py-4.5 text-xs font-bold text-dash-text flex items-center gap-2">
                              <FileText size={14} className="text-dash-accent shrink-0" />
                              <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                            </td>
                            <td className="px-6 py-4.5 text-xs text-dash-textMuted font-mono">
                              {formatDate(doc.created_at)}
                            </td>
                            <td className="px-6 py-4.5 text-xs text-dash-textMuted font-mono text-right">
                              {formatBytes(file.size || 0)}
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              <button
                                onClick={() => handleDownload(file.id, file.name)}
                                className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-dash-accent hover:text-dash-accent/80 bg-dash-accent/5 hover:bg-dash-accent/10 px-3 py-1.5 rounded-lg border border-dash-accent/10 hover:border-dash-accent/20 transition-all active:scale-95"
                              >
                                Download <Download size={11} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Secure Document Upload Dropzone */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
              <UploadCloud size={14} className="text-purple-500" /> Document Upload Vault
            </h3>

            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] bg-white relative overflow-hidden group",
                dragActive 
                  ? "border-purple-500 bg-purple-500/5" 
                  : "border-dash-border hover:border-purple-300"
              )}
            >
              <input 
                ref={fileInputRef}
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              />

              {uploading ? (
                <div className="space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 animate-spin mx-auto">
                    <UploadCloud size={20} />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-purple-400">Vaulting Asset...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-dash-surface border border-dash-border flex items-center justify-center text-dash-textMuted mx-auto group-hover:scale-105 transition-transform duration-300">
                    <UploadCloud size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-dash-text">Secure Document Drop</p>
                    <p className="text-[10px] text-dash-textMuted leading-relaxed">
                      Drag & drop KYC onboarding docs, ID copies, or proofs of address here
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded bg-white border border-dash-border text-[9px] font-bold text-dash-textMuted uppercase tracking-wider">
                    Browse Files
                  </span>
                </div>
              )}
            </div>

            <div className="bg-dash-surface/20 border border-dash-border p-4 rounded-2xl flex gap-3 text-[10.5px] text-dash-textMuted leading-relaxed">
              <AlertCircle size={14} className="shrink-0 text-dash-accent mt-0.5" />
              <span>
                <strong>Privacy Policy:</strong> Vaulted uploads are encrypted in transit and saved directly to contact CRM storage, isolated from public directory indices. Max size: 15MB.
              </span>
            </div>

            {/* Secure FICA KYC Vault Uploader */}
            <div className="space-y-4 pt-6 border-t border-dash-border">
              <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
                <Shield size={14} className="text-purple-500" /> FICA & KYC Compliance Vault
              </h3>
              
              <div className="bg-white border border-dash-border rounded-3xl p-6 space-y-4">
                <div className="space-y-3 text-left">
                  <div>
                    <label className="text-[10px] text-dash-textMuted uppercase font-bold tracking-wider block mb-1">Document Type</label>
                    <select
                      value={selectedFicaType}
                      onChange={e => setSelectedFicaType(e.target.value)}
                      className="w-full h-9 bg-dash-bg border border-dash-border text-xs px-3 rounded-xl text-dash-text outline-none focus:border-purple-400 font-dm-sans"
                    >
                      <option value="green_id">Green Barcoded ID Book</option>
                      <option value="smart_id">Smart ID Card</option>
                      <option value="passport">Passport</option>
                      <option value="utility_bill">Proof of Address / Utility Bill</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="fica-portal-file"
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setFicaUploading(true);
                        const formData = new FormData();
                        formData.append('contactId', contactId);
                        formData.append('workspaceId', workspaceId);
                        formData.append('documentType', selectedFicaType);
                        formData.append('file', file);
                        
                        try {
                          const res = await fetch('/api/kyc/documents/upload', {
                            method: 'POST',
                            body: formData
                          });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || 'Failed to upload document');
                          toast.success('KYC document securely encrypted and vaulted!');
                          
                          // Trigger Experian TrueID OCR parsing
                          const docId = data.document?.id;
                          if (docId) {
                            setOcrScanningDoc(selectedFicaType);
                            setOcrExtracted(null);
                            try {
                              const ocrRes = await fetch('/api/kyc/experian/trueid', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  mode: 'ocr',
                                  contactId,
                                  workspaceId,
                                  documentType: selectedFicaType,
                                  documentId: docId,
                                  fileBase64: 'mock-base64-extracted-ocr-buffer'
                                })
                              });
                              const ocrData = await ocrRes.json();
                              if (ocrRes.ok && ocrData.success) {
                                setOcrExtracted(ocrData.extractedData);
                                toast.success('Experian TrueID Document OCR Complete!');
                              } else {
                                toast.error(ocrData.error || 'OCR processing failed');
                              }
                            } catch (ocrErr: any) {
                              console.error('OCR analysis failed:', ocrErr);
                              toast.error('Experian OCR failed: ' + ocrErr.message);
                            }
                          }
                          
                          loadFicaDocs();
                        } catch (err: any) {
                          toast.error(err.message || 'Upload failed');
                        } finally {
                          setFicaUploading(false);
                          // Clear file input
                          const el = document.getElementById('fica-portal-file') as HTMLInputElement;
                          if (el) el.value = '';
                        }
                      }}
                    />
                    <div className="flex flex-col gap-2 w-full">
                      <button
                        type="button"
                        disabled={ficaUploading}
                        onClick={() => document.getElementById('fica-portal-file')?.click()}
                        className="w-full h-9 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        {ficaUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Upload size={13} />
                            Select & Upload Document
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLivenessModal(true);
                          setLivenessStep(0);
                          setLivenessResult(null);
                        }}
                        className="w-full h-9 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95"
                      >
                        <Camera size={13} />
                        TrueID Biometric Selfie
                      </button>
                    </div>
                  </div>
                </div>

                {/* FICA Documents List */}
                <div className="space-y-2 border-t border-dash-border pt-4 text-left">
                  <span className="text-[10px] text-dash-textMuted uppercase font-bold tracking-wider block">Vaulted Compliance Files</span>
                  
                  {loadingFica ? (
                    <span className="text-xs text-dash-textMuted">Loading vault...</span>
                  ) : ficaDocs.length === 0 ? (
                    <p className="text-[11px] text-dash-textMuted italic leading-normal">
                      No compliance records found. Please upload required ID and Proof of Address.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ficaDocs.map(doc => {
                        const docTypeLabel = 
                          doc.document_type === 'green_id' ? 'Green ID Book' :
                          doc.document_type === 'smart_id' ? 'Smart ID Card' :
                          doc.document_type === 'passport' ? 'Passport' : 'Utility Bill (PoA)';
                        
                        const docExpiry = doc.expiry_date ? new Date(doc.expiry_date) : null;
                        const isDocExpired = docExpiry ? docExpiry.getTime() < Date.now() : false;

                        return (
                          <div key={doc.id} className="flex items-center justify-between p-2.5 bg-dash-bg border border-dash-border rounded-xl text-xs">
                            <div className="flex items-center gap-2">
                              <FileText size={14} className="text-dash-accent shrink-0" />
                              <div className="text-left leading-tight">
                                <span className="font-bold text-dash-text block">{docTypeLabel}</span>
                                <span className="text-[9.5px] text-dash-textMuted block mt-0.5">
                                  Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {doc.document_type === 'utility_bill' && (
                                <span className={`text-[9px] font-black uppercase border px-1.5 py-0.5 rounded tracking-wide ${
                                  isDocExpired ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-green-500/10 text-[#10b981] border-green-500/20'
                                }`}>
                                  {isDocExpired ? 'Expired' : 'Active'}
                                </span>
                              )}
                              <a
                                href={`/api/kyc/documents/download?id=${doc.id}`}
                                className="text-dash-textMuted hover:text-dash-text transition-colors"
                                title="Decrypt & Download"
                              >
                                <Download size={14} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'esign' && (
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-dash-textMuted uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
            <PenTool size={14} className="text-purple-500" /> Signature Requirements
          </h3>

          {proposals.length === 0 ? (
            <div className="bg-white border border-dash-border p-16 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 bg-dash-surface border border-dash-border rounded-2xl flex items-center justify-center text-emerald-400 opacity-55">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-dash-text">All Contracts Sealed</h3>
                <p className="text-xs text-dash-textMuted mt-1.5 max-w-xs leading-relaxed">
                  There are no pending proposal agreements, SLAs, or NDAs requiring your electronic signature. Excellent!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {proposals.map((p, idx) => (
                <div 
                  key={idx} 
                  className="bg-white border border-dash-border rounded-[24px] p-6 shadow-xl flex flex-col justify-between hover:border-dash-accent/30 hover:translate-y-[-1px] transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">
                        Signature Pending
                      </span>
                      <PenTool size={16} className="text-amber-400 opacity-60" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-dash-text line-clamp-1 font-space uppercase">
                        {p.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[9.5px] text-dash-textMuted font-mono uppercase">
                        {p.total_value && (
                          <span>Contract Value: ${Number(p.total_value).toLocaleString()}</span>
                        )}
                        <span>Expires: {formatDate(p.expires_at || p.due_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-dash-border mt-6 flex justify-end">
                    <button
                      onClick={() => setSelectedProposal(p)}
                      className="inline-flex items-center gap-1.5 px-4 h-10 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 active:scale-95"
                    >
                      Sign Now <PenTool size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Embedded Native E-Signature Modal Overlay */}
      {selectedProposal && (
        <div className="fixed inset-0 bg-[#000000c1] backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-white border border-dash-border rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] md:h-auto max-h-[85vh] animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-dash-border flex justify-between items-center bg-dash-surface">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-dash-textMuted">LeadsMind E-Sign Core</span>
                <h4 className="text-base font-bold text-dash-text font-space uppercase mt-0.5">Execute Agreement</h4>
              </div>
              <button 
                onClick={() => setSelectedProposal(null)}
                className="text-dash-textMuted hover:text-dash-text text-xs font-black uppercase tracking-wider bg-white border border-dash-border w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Doc Preview Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-dash-textMuted leading-relaxed font-sans border-b border-dash-border bg-dash-bg">
              <div className="space-y-4">
                <h5 className="text-md font-bold text-dash-text font-space uppercase border-b border-dash-border pb-2">
                  {selectedProposal.title}
                </h5>
                
                {/* Simulated contract terms */}
                <div className="bg-dash-surface p-5 rounded-2xl border border-dash-border space-y-4 text-xs select-none max-h-60 overflow-y-auto font-sans text-dash-textMuted">
                  <p className="font-bold text-dash-text uppercase text-[10px] tracking-wider mb-2">Terms and Conditions</p>
                  <p>1. <strong>Scope of Service:</strong> LeadsMind agrees to deliver professional agency consultation and implementation services specified in the proposal briefing.</p>
                  <p>2. <strong>Term & Value:</strong> This contract value totals ${Number(selectedProposal.total_value || 0).toLocaleString()} and remains binding until all milestones are completed.</p>
                  <p>3. <strong>POs & Payments:</strong> All invoices issued in connection with this agreement are subject to LeadsMind local payment processor protocols.</p>
                  <p>4. <strong>Cryptographic Seal:</strong> By signing electronically below, both parties confirm authorization, recording timestamps, hashed keys, and IP verification nodes.</p>
                </div>
              </div>

              {/* Signature Capture Area */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-dash-text uppercase tracking-wider">Electronic Signature</span>
                  <div className="flex rounded-lg bg-dash-surface p-1 border border-dash-border">
                    <button
                      onClick={() => setSignatureType('draw')}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                        signatureType === 'draw' ? 'bg-dash-accent text-white' : 'text-dash-textMuted'
                      )}
                    >
                      Draw
                    </button>
                    <button
                      onClick={() => setSignatureType('type')}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                        signatureType === 'type' ? 'bg-dash-accent text-white' : 'text-dash-textMuted'
                      )}
                    >
                      Type to Sign
                    </button>
                  </div>
                </div>

                {signatureType === 'draw' ? (
                  <div className="space-y-2">
                    <div className="bg-white rounded-2xl border border-dash-border overflow-hidden relative">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={160}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-40 bg-white cursor-crosshair"
                      />
                      <button 
                        onClick={clearCanvas}
                        className="absolute bottom-3 right-3 px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                    <p className="text-[10px] text-dash-textMuted italic">Use your mouse or touch screen inside the box to draw your signature.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Type your full legal name here"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full bg-dash-surface border border-dash-border rounded-xl px-4 py-3 text-dash-text focus:border-dash-accent outline-none text-sm font-sans"
                    />
                    {typedName.trim() && (
                      <div className="p-4 bg-dash-surface rounded-xl border border-dash-border">
                        <p className="text-[9px] text-dash-textMuted uppercase tracking-wider mb-1">Rendered signature</p>
                        <p className="font-space text-3xl font-bold text-dash-accent italic tracking-wider select-none px-2 py-1 select-none">
                          {typedName}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-dash-surface border-t border-dash-border flex justify-end gap-3">
              <button 
                onClick={() => setSelectedProposal(null)}
                className="h-11 px-6 rounded-xl bg-white border border-dash-border hover:bg-dash-border/40 text-dash-text text-[10px] font-black uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSignatureSubmit}
                disabled={isSigning}
                className="h-11 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white text-[10px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/10 flex items-center gap-1.5 active:scale-95"
              >
                {isSigning ? "Signing..." : <><ShieldCheck size={14} /> Seal Agreement</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Experian TrueID Biometric Selfie Liveness Modal */}
      {showLivenessModal && (
        <div className="fixed inset-0 bg-[#000000c1] backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className="bg-white border border-dash-border rounded-[32px] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col p-6 text-center space-y-6 animate-in zoom-in-95 duration-300">
            {/* Phone/Device Simulator Header */}
            <div className="flex justify-between items-center pb-2 border-b border-dash-border">
              <span className="text-[10px] text-dash-accent font-black uppercase tracking-wider">Experian TrueID Biometric SDK</span>
              <button 
                onClick={() => {
                  setShowLivenessModal(false);
                  setLivenessResult(null);
                }} 
                className="text-dash-textMuted hover:text-dash-text"
              >
                ✕
              </button>
            </div>

            {livenessStep === 0 && (
              <div className="space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-dash-accent mx-auto">
                  <Camera size={28} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-dash-text uppercase tracking-wide">DHA Biometric Check</h4>
                  <p className="text-[11px] text-dash-textMuted leading-relaxed">
                    Experian TrueID will perform a liveness selfie verify scan against your official Home Affairs registration photo.
                  </p>
                </div>
                
                <div className="space-y-1.5 text-left bg-dash-surface border border-dash-border p-3.5 rounded-xl">
                  <label className="text-[9px] text-dash-textMuted uppercase font-bold tracking-wider block">Verify ID Number</label>
                  <input
                    type="text"
                    maxLength={13}
                    placeholder="Enter South African ID number"
                    value={inputLivenessIdNumber}
                    onChange={e => setInputLivenessIdNumber(e.target.value)}
                    className="w-full h-9 bg-dash-surface border border-dash-border rounded-lg px-3 text-xs text-dash-text outline-none focus:border-dash-accent font-mono"
                  />
                </div>

                <button
                  type="button"
                  disabled={inputLivenessIdNumber.length < 13}
                  onClick={() => {
                    setLivenessStep(1);
                    setLivenessInstruction('Align your face inside the frame.');
                    setTimeout(() => {
                      setLivenessInstruction('Hold still... Blinking detected.');
                      setTimeout(() => {
                        setLivenessInstruction('Smile slightly... Capturing.');
                        setTimeout(async () => {
                          setLivenessStep(2);
                          setBiometricChecking(true);
                          try {
                            const res = await fetch('/api/kyc/experian/trueid', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                mode: 'liveness',
                                contactId,
                                workspaceId,
                                idNumber: inputLivenessIdNumber,
                                selfie: 'mock-base64-selfie-data'
                              })
                            });
                            const rData = await res.json();
                            setBiometricChecking(false);
                            if (res.ok && rData.success) {
                              setLivenessResult(rData.check);
                              setLivenessStep(3);
                            } else {
                              toast.error(rData.error || 'Biometric check failed');
                              setLivenessStep(0);
                            }
                          } catch (err: any) {
                            setBiometricChecking(false);
                            toast.error('Connection failure: ' + err.message);
                            setLivenessStep(0);
                          }
                        }, 1200);
                      }, 1200);
                    }, 1500);
                  }}
                  className="w-full h-10 rounded-xl bg-dash-accent hover:bg-dash-accent/90 text-white text-xs font-bold transition-all disabled:opacity-40"
                >
                  Authorize & Initialize Camera
                </button>
              </div>
            )}

            {livenessStep === 1 && (
              <div className="space-y-6 py-4 flex flex-col items-center">
                {/* Simulated Camera Circular Aperture */}
                <div className="relative w-48 h-48 rounded-full border-4 border-dashed border-blue-500/60 flex items-center justify-center p-2 animate-pulse bg-black/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                  <div className="absolute inset-2 rounded-full border border-blue-500/20" />
                  {/* Face outline graphic overlay */}
                  <svg className="w-28 h-28 text-dash-accent/30" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
                  </svg>
                  {/* Dynamic sweeping overlay */}
                  <div className="absolute left-0 right-0 h-0.5 bg-blue-500 top-1/2 shadow-[0_0_10px_#3b82f6] animate-bounce" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-dash-accent animate-pulse">{livenessInstruction}</p>
                  <p className="text-[10px] text-dash-textMuted">Ensure high lighting and no sunglasses.</p>
                </div>
              </div>
            )}

            {livenessStep === 2 && (
              <div className="space-y-4 py-8">
                <Loader2 className="w-10 h-10 animate-spin text-dash-accent mx-auto" />
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-dash-text uppercase tracking-wider">Matching Biometric Matrix...</p>
                  <p className="text-[10px] text-dash-textMuted">Querying Experian TrueID & DHA registry databases.</p>
                </div>
              </div>
            )}

            {livenessStep === 3 && livenessResult && (
              <div className="space-y-6 py-4">
                <div className="space-y-3">
                  {livenessResult.status === 'passed' ? (
                    <>
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                        <CheckCircle2 size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-dash-text uppercase tracking-wide">Verification Passed</h4>
                      <p className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 py-1.5 px-3 rounded-xl inline-block font-mono uppercase font-bold">
                        {livenessResult.result}
                      </p>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <ShieldAlert size={24} />
                      </div>
                      <h4 className="text-sm font-bold text-dash-text uppercase tracking-wide">Verification Failed</h4>
                      <p className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 py-1.5 px-3 rounded-xl inline-block font-mono uppercase font-bold">
                        {livenessResult.result}
                      </p>
                    </>
                  )}
                  <p className="text-[10px] text-dash-textMuted leading-normal px-2">
                    Logs registered securely in the compliance audit timeline. You can close this screen now.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowLivenessModal(false);
                    setLivenessResult(null);
                  }}
                  className="w-full h-10 rounded-xl bg-white hover:bg-dash-border/40 text-dash-text text-xs font-bold transition-all border border-dash-border"
                >
                  Close Screen
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* OCR Laser Scanning & Text Apply Overlay */}
      {ocrScanningDoc && (
        <div className="fixed inset-0 bg-[#000000c1] backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in duration-300">
          <div className="bg-white border border-dash-border rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col p-6 text-center space-y-6 animate-in zoom-in-95 duration-300">
            <style>{`
              @keyframes scan {
                0%, 100% { top: 0%; }
                50% { top: 100%; }
              }
            `}</style>
            <div className="flex justify-between items-center pb-2 border-b border-dash-border">
              <span className="text-[10px] text-purple-400 font-black uppercase tracking-wider">Experian TrueID OCR Pipeline</span>
              {!ocrExtracted && (
                <Loader2 size={14} className="text-purple-400 animate-spin" />
              )}
            </div>

            {!ocrExtracted ? (
              <div className="space-y-6 py-6 flex flex-col items-center">
                {/* Visual Scanner Guide Card */}
                <div className="relative w-56 h-36 bg-purple-500/5 border border-purple-500/20 rounded-2xl overflow-hidden flex items-center justify-center">
                  <FileText size={40} className="text-purple-400/40" />
                  {/* Laser Sweeping Beam */}
                  <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent shadow-[0_0_10px_#8b5cf6] top-0 animate-[scan_2s_ease-in-out_infinite]" style={{ animation: 'scan 2s ease-in-out infinite' }} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-black uppercase tracking-wider text-purple-400 animate-pulse">Running OCR Parsing...</p>
                  <p className="text-[10px] text-dash-textMuted">Extracting identification records & text strings</p>
                </div>
              </div>
            ) : (
              <div className="space-y-5 py-2">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mx-auto">
                  <CheckCircle2 size={22} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-dash-text uppercase tracking-wide">OCR Extraction Complete</h4>
                  <p className="text-[10px] text-dash-textMuted mt-0.5">Please verify the parsed records before applying to profile:</p>
                </div>

                {/* Extracted Fields */}
                <div className="bg-dash-surface border border-dash-border rounded-2xl p-4 text-left space-y-2.5 text-xs text-dash-text max-h-60 overflow-y-auto">
                  {ocrExtracted.idNumber && (
                    <div className="flex justify-between border-b border-dash-border pb-1.5">
                      <span className="text-dash-textMuted">ID Number</span>
                      <span className="font-mono font-bold">{ocrExtracted.idNumber}</span>
                    </div>
                  )}
                  {ocrExtracted.firstName && (
                    <div className="flex justify-between border-b border-dash-border pb-1.5">
                      <span className="text-dash-textMuted">First Name</span>
                      <span className="font-semibold">{ocrExtracted.firstName}</span>
                    </div>
                  )}
                  {ocrExtracted.lastName && (
                    <div className="flex justify-between border-b border-dash-border pb-1.5">
                      <span className="text-dash-textMuted">Last Name</span>
                      <span className="font-semibold">{ocrExtracted.lastName}</span>
                    </div>
                  )}
                  {ocrExtracted.dateOfBirth && (
                    <div className="flex justify-between border-b border-dash-border pb-1.5">
                      <span className="text-dash-textMuted">Date of Birth</span>
                      <span className="font-mono">{ocrExtracted.dateOfBirth}</span>
                    </div>
                  )}
                  {ocrExtracted.creditorName && (
                    <div className="flex justify-between border-b border-dash-border pb-1.5">
                      <span className="text-dash-textMuted">Creditor Name</span>
                      <span className="font-semibold">{ocrExtracted.creditorName}</span>
                    </div>
                  )}
                  {ocrExtracted.accountNumber && (
                    <div className="flex justify-between border-b border-dash-border pb-1.5">
                      <span className="text-dash-textMuted">Account Number</span>
                      <span className="font-mono">{ocrExtracted.accountNumber}</span>
                    </div>
                  )}
                  {ocrExtracted.billingAddress && (
                    <div className="space-y-1">
                      <span className="text-dash-textMuted block">Extracted Address</span>
                      <span className="text-[11px] text-dash-textMuted block leading-relaxed">{ocrExtracted.billingAddress}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setOcrScanningDoc(null);
                      setOcrExtracted(null);
                    }}
                    className="flex-1 h-10 rounded-xl bg-white hover:bg-dash-border/40 border border-dash-border text-dash-text text-xs font-bold transition-all"
                  >
                    Rescan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOcrScanningDoc(null);
                      setOcrExtracted(null);
                      toast.success('Extracted fields applied to contact profile records!');
                    }}
                    className="flex-1 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
                  >
                    Confirm & Apply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
