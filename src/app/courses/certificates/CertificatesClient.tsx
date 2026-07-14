// @ts-nocheck
'use client';

import React from 'react';
import {
  Trophy,
  Award,
  Download,
  Eye,
  ShieldCheck,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function CertificatesClient({ certificates }: { certificates: any[] }) {
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold !text-dash-text mb-1">
            Certificates
          </h2>
          <p className="!text-dash-textMuted text-xs">
            Verify and manage the certificates issued by your academy.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => toast.info("Opening filters...")}
            className="bg-dash-surface border border-dash-border !text-dash-text font-bold text-[10px] h-11 px-6 rounded-xl hover:bg-dash-border/60 transition-colors motion-reduce:transition-none flex items-center gap-2"
          >
            <Filter size={16} /> Filter
          </Button>
          <Button
            onClick={() => {
              const name = window.prompt("Enter recipient name:");
              if (name) toast.success(`Certificate created for ${name}`);
            }}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[10px] h-11 px-6 rounded-xl shadow-lg shadow-dash-accent/20 flex items-center gap-2"
          >
            <Plus size={16} /> Issue certificate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.length === 0 ? (
          <div className="col-span-full py-20 bg-dash-surface border-2 border-dashed border-dash-border rounded-3xl flex flex-col items-center justify-center text-center group cursor-pointer hover:bg-dash-accent/5 hover:border-dash-accent/30 transition-colors motion-reduce:transition-none">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform motion-reduce:transition-none motion-reduce:group-hover:scale-100 border border-dash-border">
              <Trophy size={28} className="!text-dash-textMuted" />
            </div>
            <h3 className="text-lg font-bold !text-dash-text">No certificates yet</h3>
            <p className="!text-dash-textMuted text-xs mt-2">
              Certificates you issue will show up here.
            </p>
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
    <div className="bg-white border border-dash-border rounded-2xl p-8 group hover:border-dash-accent/50 hover:shadow-md transition-all duration-300 motion-reduce:transition-none shadow-sm relative overflow-hidden flex flex-col items-center text-center">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-dash-accent to-transparent opacity-30 group-hover:opacity-100 transition-opacity motion-reduce:transition-none" />

      <div className="w-24 h-24 rounded-3xl bg-dash-surface border border-dash-border flex items-center justify-center mb-8 relative group-hover:scale-110 transition-transform duration-500 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
        <Award size={48} className="text-dash-accent" />
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-green flex items-center justify-center border-4 border-white">
          <ShieldCheck size={16} className="text-white" />
        </div>
      </div>

      <h4 className="text-xl font-bold !text-dash-text mb-2 group-hover:text-dash-accent transition-colors motion-reduce:transition-none">
        {cert.name || 'Core System Engineer'}
      </h4>
      <p className="text-[10px] font-bold !text-dash-textMuted mb-8">
        Issued to {cert.recipient || 'Builder_X'} &bull; {cert.date || 'May 2024'}
      </p>

      <div className="w-full grid grid-cols-2 gap-4">
        <Button className="bg-dash-surface border border-dash-border !text-dash-text font-bold text-[9px] h-11 rounded-xl hover:bg-dash-border/60 transition-colors motion-reduce:transition-none flex items-center justify-center gap-2">
          <Eye size={14} /> Preview
        </Button>
        <Button className="bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[9px] h-11 rounded-xl shadow-lg shadow-dash-accent/20 transition-colors motion-reduce:transition-none flex items-center justify-center gap-2">
          <Download size={14} /> Download
        </Button>
      </div>

      <div className="mt-8 pt-6 border-t border-dash-border w-full">
        <span className="text-[9px] font-bold !text-dash-textMuted">
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
