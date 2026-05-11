// @ts-nocheck
'use client';

import React from 'react';
import { 
  Trophy, 
  Award, 
  Download, 
  Eye, 
  ShieldCheck,
  Search,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CertificatesClient({ certificates }: { certificates: any[] }) {
  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Credential Hub</h2>
          <p className="text-white/40 text-sm font-medium">Verify and manage the official certifications issued by your academy nodes.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => toast.info("Opening Neural Filter Node...")}
            className="bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] h-12 px-6 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <Filter size={16} /> Filter
          </Button>
          <Button 
            onClick={() => {
              const name = window.prompt("Enter Recipient Name:");
              if (name) toast.success(`Credential initialized for ${name}`);
            }}
            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Plus size={16} /> Issue Certificate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {certificates.length === 0 ? (
          <div className="col-span-full py-32 bg-[#0b0b1a] border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-all">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
              <Trophy size={32} className="text-white/20" />
            </div>
            <h3 className="text-xl font-black text-white/40 uppercase tracking-widest">No Credentials Issued</h3>
            <p className="text-white/20 text-xs font-bold mt-2 uppercase tracking-widest">Your academy's certification node is currently idle.</p>
          </div>
        ) : (
          certificates.map((cert) => (
            <CertificateCard key={cert.id} cert={cert} />
          ))
        )}
      </div>
    </div>
  );
}

function CertificateCard({ cert }: any) {
  return (
    <div className="bg-[#0b0b1a] border border-white/10 rounded-[40px] p-8 group hover:border-primary/50 transition-all duration-700 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
      
      <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative group-hover:scale-110 transition-transform duration-500">
        <Award size={48} className="text-primary" />
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-success flex items-center justify-center border-4 border-[#0b0b1a]">
          <ShieldCheck size={16} className="text-white" />
        </div>
      </div>

      <h4 className="text-2xl font-black text-white uppercase tracking-tighter mb-2 italic-none group-hover:text-primary transition-colors">
        {cert.name || 'Core System Engineer'}
      </h4>
      <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-8 italic-none">
        Issued to {cert.recipient || 'Builder_X'} • {cert.date || 'MAY 2024'}
      </p>

      <div className="w-full grid grid-cols-2 gap-4">
        <Button className="bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] h-12 rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
          <Eye size={14} /> Preview
        </Button>
        <Button className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[9px] h-12 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
          <Download size={14} /> Download
        </Button>
      </div>

      <div className="mt-8 pt-8 border-t border-white/5 w-full">
        <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] italic-none">
          Verify ID: LM-CERT-{(Math.random()*10000).toFixed(0)}
        </span>
      </div>
    </div>
  );
}

function Plus({ size, className }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  );
}
