'use client';

import React, { useState, useRef, useEffect, useTransition } from 'react';
import { FileText, Download, UploadCloud, AlertCircle, CheckCircle2, Lock, PenTool, Calendar, ShieldCheck, HelpCircle } from 'lucide-react';
import { generateSignedDocumentUrl, uploadClientDocument, signPortalProposal } from '@/app/actions/documents';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface DocumentsClientProps {
  initialDocs: any[];
  initialProposals: any[];
}

export default function DocumentsClient({ initialDocs, initialProposals }: DocumentsClientProps) {
  const [docs, setDocs] = useState<any[]>(initialDocs);
  const [proposals, setProposals] = useState<any[]>(initialProposals);
  const [activeTab, setActiveTab] = useState<'vault' | 'esign'>('vault');
  
  // Upload States
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => setActiveTab('vault')}
          className={cn(
            "pb-4 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'vault' 
              ? "border-[#8b5cf6] text-[#8b5cf6]" 
              : "border-transparent text-[#4a5a82] hover:text-[var(--t2)]"
          )}
        >
          Secured Vault Locker
        </button>
        <button
          onClick={() => setActiveTab('esign')}
          className={cn(
            "pb-4 px-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all relative",
            activeTab === 'esign' 
              ? "border-[#8b5cf6] text-[#8b5cf6]" 
              : "border-transparent text-[#4a5a82] hover:text-[var(--t2)]"
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
            <h3 className="text-xs font-bold text-[#4a5a82] uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
              <FileText size={14} className="text-[#8b5cf6]" /> Document Locker
            </h3>

            {docs.length === 0 ? (
              <div className="bg-[var(--n800)] border border-[var(--bdr)] p-12 rounded-3xl text-center space-y-3">
                <FileText size={32} className="text-[#4a5a82] opacity-40 mx-auto" />
                <p className="text-xs text-[var(--t3)]">No documents linked to your contact profile yet.</p>
              </div>
            ) : (
              <div className="bg-[var(--n800)] border border-[var(--bdr)] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-[var(--bdr)] bg-white/[0.01] text-[9.5px] font-black uppercase tracking-widest text-[#4a5a82]">
                        <th className="px-6 py-4">File Name</th>
                        <th className="px-6 py-4">Shared Date</th>
                        <th className="px-6 py-4 text-right">Size</th>
                        <th className="px-6 py-4 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--bdr)]">
                      {docs.map((doc, i) => {
                        const file = doc.file;
                        if (!file) return null;

                        return (
                          <tr key={i} className="hover:bg-white/[0.01] transition-all group">
                            <td className="px-6 py-4.5 text-xs font-bold text-[#eef2ff] flex items-center gap-2">
                              <FileText size={14} className="text-blue-400 shrink-0" />
                              <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                            </td>
                            <td className="px-6 py-4.5 text-xs text-[var(--t3)] font-mono">
                              {formatDate(doc.created_at)}
                            </td>
                            <td className="px-6 py-4.5 text-xs text-[var(--t3)] font-mono text-right">
                              {formatBytes(file.size || 0)}
                            </td>
                            <td className="px-6 py-4.5 text-center">
                              <button
                                onClick={() => handleDownload(file.id, file.name)}
                                className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-400 hover:text-white bg-blue-500/5 hover:bg-blue-500/15 px-3 py-1.5 rounded-lg border border-blue-500/10 hover:border-blue-500/20 transition-all active:scale-95"
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
            <h3 className="text-xs font-bold text-[#4a5a82] uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
              <UploadCloud size={14} className="text-[#8b5cf6]" /> Document Upload Vault
            </h3>

            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center min-h-[220px] bg-[var(--n800)] relative overflow-hidden group",
                dragActive 
                  ? "border-[#8b5cf6] bg-[#8b5cf6]/5" 
                  : "border-white/10 hover:border-white/20"
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
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-[#4a5a82] mx-auto group-hover:scale-105 transition-transform duration-300">
                    <UploadCloud size={20} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-[#eef2ff]">Secure Document Drop</p>
                    <p className="text-[10px] text-[var(--t3)] leading-relaxed">
                      Drag & drop KYC onboarding docs, ID copies, or proofs of address here
                    </p>
                  </div>
                  <span className="inline-block px-3 py-1 rounded bg-[#080f28] border border-white/5 text-[9px] font-bold text-[#4a5a82] uppercase tracking-wider">
                    Browse Files
                  </span>
                </div>
              )}
            </div>

            <div className="bg-[#111d47]/20 border border-white/5 p-4 rounded-2xl flex gap-3 text-[10.5px] text-[#4a5a82] leading-relaxed">
              <AlertCircle size={14} className="shrink-0 text-blue-400 mt-0.5" />
              <span>
                <strong>Privacy Policy:</strong> Vaulted uploads are encrypted in transit and saved directly to contact CRM storage, isolated from public directory indices. Max size: 15MB.
              </span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'esign' && (
        <div className="space-y-6">
          <h3 className="text-xs font-bold text-[#4a5a82] uppercase tracking-[1.5px] mb-2 flex items-center gap-1.5">
            <PenTool size={14} className="text-[#8b5cf6]" /> Signature Requirements
          </h3>

          {proposals.length === 0 ? (
            <div className="bg-[var(--n800)] border border-[var(--bdr)] p-16 rounded-3xl flex flex-col items-center justify-center text-center space-y-4 shadow-xl">
              <div className="w-14 h-14 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-center text-emerald-400 opacity-55">
                <ShieldCheck size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--t2)]">All Contracts Sealed</h3>
                <p className="text-xs text-[var(--t3)] mt-1.5 max-w-xs leading-relaxed">
                  There are no pending proposal agreements, SLAs, or NDAs requiring your electronic signature. Excellent!
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {proposals.map((p, idx) => (
                <div 
                  key={idx} 
                  className="bg-[var(--n800)] border border-[var(--bdr)] rounded-[24px] p-6 shadow-xl flex flex-col justify-between hover:border-white/10 hover:translate-y-[-1px] transition-all relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-[#8b5cf6]/5 rounded-full blur-2xl pointer-events-none" />

                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 tracking-wider">
                        Signature Pending
                      </span>
                      <PenTool size={16} className="text-amber-400 opacity-60" />
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-[#eef2ff] line-clamp-1 font-space uppercase">
                        {p.title}
                      </h4>
                      <div className="flex flex-wrap items-center gap-4 mt-2.5 text-[9.5px] text-[#4a5a82] font-mono uppercase">
                        {p.total_value && (
                          <span>Contract Value: ${Number(p.total_value).toLocaleString()}</span>
                        )}
                        <span>Expires: {formatDate(p.expires_at || p.due_date)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5 mt-6 flex justify-end">
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
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-[#080f28] border border-white/10 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[90vh] md:h-auto max-h-[85vh] animate-in zoom-in-95 duration-300">
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#0b1329]/50">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-[#4a5a82]">LeadsMind E-Sign Core</span>
                <h4 className="text-base font-bold text-white font-space uppercase mt-0.5">Execute Agreement</h4>
              </div>
              <button 
                onClick={() => setSelectedProposal(null)}
                className="text-[#4a5a82] hover:text-white text-xs font-black uppercase tracking-wider bg-white/5 w-8 h-8 rounded-full flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Doc Preview Area */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-white/70 leading-relaxed font-sans border-b border-white/5 bg-[#04091a]/30">
              <div className="space-y-4">
                <h5 className="text-md font-bold text-white font-space uppercase border-b border-white/5 pb-2">
                  {selectedProposal.title}
                </h5>
                
                {/* Simulated contract terms */}
                <div className="bg-[#0b1329] p-5 rounded-2xl border border-white/5 space-y-4 text-xs select-none max-h-60 overflow-y-auto font-sans text-white/60">
                  <p className="font-bold text-white uppercase text-[10px] tracking-wider mb-2">Terms and Conditions</p>
                  <p>1. <strong>Scope of Service:</strong> LeadsMind agrees to deliver professional agency consultation and implementation services specified in the proposal briefing.</p>
                  <p>2. <strong>Term & Value:</strong> This contract value totals ${Number(selectedProposal.total_value || 0).toLocaleString()} and remains binding until all milestones are completed.</p>
                  <p>3. <strong>POs & Payments:</strong> All invoices issued in connection with this agreement are subject to LeadsMind local payment processor protocols.</p>
                  <p>4. <strong>Cryptographic Seal:</strong> By signing electronically below, both parties confirm authorization, recording timestamps, hashed keys, and IP verification nodes.</p>
                </div>
              </div>

              {/* Signature Capture Area */}
              <div className="space-y-4 pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">Electronic Signature</span>
                  <div className="flex rounded-lg bg-[#0b1329] p-1 border border-white/5">
                    <button
                      onClick={() => setSignatureType('draw')}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                        signatureType === 'draw' ? 'bg-blue-600 text-white' : 'text-[#4a5a82]'
                      )}
                    >
                      Draw
                    </button>
                    <button
                      onClick={() => setSignatureType('type')}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all",
                        signatureType === 'type' ? 'bg-blue-600 text-white' : 'text-[#4a5a82]'
                      )}
                    >
                      Type to Sign
                    </button>
                  </div>
                </div>

                {signatureType === 'draw' ? (
                  <div className="space-y-2">
                    <div className="bg-white rounded-2xl border border-white/10 overflow-hidden relative">
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
                    <p className="text-[10px] text-[#4a5a82] italic">Use your mouse or touch screen inside the box to draw your signature.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      placeholder="Type your full legal name here"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full bg-[#0b1329] border border-white/5 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 outline-none text-sm font-sans"
                    />
                    {typedName.trim() && (
                      <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                        <p className="text-[9px] text-[#4a5a82] uppercase tracking-wider mb-1">Rendered signature</p>
                        <p className="font-space text-3xl font-bold text-blue-400 italic tracking-wider select-none px-2 py-1 select-none">
                          {typedName}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 bg-[#0b1329]/50 border-t border-white/5 flex justify-end gap-3">
              <button 
                onClick={() => setSelectedProposal(null)}
                className="h-11 px-6 rounded-xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
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
    </div>
  );
}
