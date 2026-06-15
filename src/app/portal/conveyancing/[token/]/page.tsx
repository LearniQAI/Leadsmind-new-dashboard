import React from 'react';
import { getConveyancingShareByToken } from '@/app/actions/propertyDeals';
import { 
  ShieldCheck, 
  FileText, 
  Download, 
  AlertCircle, 
  FolderLock,
  ArrowDownToLine,
  ExternalLink
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface ConveyancingPortalPageProps {
  params: { token: string };
}

export default async function ConveyancingPortalPage({ params }: ConveyancingPortalPageProps) {
  const result = await getConveyancingShareByToken(params.token);

  if (!result.success) {
    return (
      <div className="min-h-screen bg-[#04091a] text-[#eef2ff] flex items-center justify-center p-6 font-dm-sans">
        <div className="max-w-md w-full bg-[#080f28]/80 border border-red-500/20 rounded-2xl p-8 text-center space-y-4 shadow-2xl shadow-red-950/10">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold font-space-grotesk tracking-tight">Portal Access Blocked</h1>
          <p className="text-sm text-[#94a3c8] leading-relaxed">
            {result.error || 'The secure sharing link is invalid, has been revoked, or has expired.'}
          </p>
          <div className="pt-2">
            <a 
              href="mailto:compliance@leadsmind.io"
              className="text-xs text-[#3b82f6] hover:underline font-semibold"
            >
              Contact compliance department
            </a>
          </div>
        </div>
      </div>
    );
  }

  const { share, deal, buyer, seller, documents } = result;

  const getDocLabel = (type: string) => {
    switch (type) {
      case 'green_id': return 'Green Barcoded Identification Book';
      case 'smart_id': return 'Smart Identification Card';
      case 'passport': return 'Official Passport Document';
      case 'utility_bill': return 'Proof of Address (Utility Bill)';
      default: return 'FICA Compliance Document';
    }
  };

  return (
    <div className="min-h-screen bg-[#04091a] text-[#eef2ff] p-6 md:p-12 font-dm-sans flex flex-col justify-between">
      
      <div className="max-w-4xl w-full mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-[#080f28]/60 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-blue-500/0 via-blue-500/50 to-blue-500/0" />
          
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-widest font-space-grotesk">
              <FolderLock className="w-4 h-4 text-blue-400" /> Secure Legal File Transfer
            </div>
            <h1 className="text-2xl font-bold font-space-grotesk tracking-tight">
              Conveyancing Exchange Portal
            </h1>
            <p className="text-xs text-[#94a3c8]">
              Authorized recipient: <strong className="text-white">{share.attorney_name}</strong> ({share.attorney_email})
            </p>
          </div>

          <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-1.5 shrink-0 self-start md:self-center">
            <ShieldCheck className="w-4 h-4" /> FICA VERIFIED DIRECTORY
          </div>
        </div>

        {/* Transaction Overview Card */}
        <div className="bg-[#080f28]/60 border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-sm font-bold font-space-grotesk uppercase tracking-wider text-[#3b82f6] border-b border-white/5 pb-2">
            Transaction Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-dm-sans">
            <div className="space-y-1">
              <div className="text-[#4a5a82]">Property Deal / Record:</div>
              <div className="font-bold text-sm text-[#eef2ff]">{deal.title}</div>
            </div>
            <div className="space-y-1">
              <div className="text-[#4a5a82]">Transaction Value:</div>
              <div className="font-bold text-sm text-emerald-400 font-space-grotesk">${deal.value?.toLocaleString()}</div>
            </div>
            <div className="space-y-1 border-t border-white/5 pt-3 md:border-none md:pt-0">
              <div className="text-[#4a5a82]">Linked Buyer:</div>
              <div className="font-bold text-[#eef2ff]">
                {buyer ? `${buyer.first_name} ${buyer.last_name}` : 'Unassigned'}
              </div>
            </div>
            <div className="space-y-1 border-t border-white/5 pt-3 md:border-none md:pt-0">
              <div className="text-[#4a5a82]">Linked Seller:</div>
              <div className="font-bold text-[#eef2ff]">
                {seller ? `${seller.first_name} ${seller.last_name}` : 'Unassigned'}
              </div>
            </div>
          </div>
        </div>

        {/* Document Listing */}
        <div className="bg-[#080f28]/60 border border-white/5 rounded-2xl p-6 shadow-xl space-y-5">
          <h2 className="text-sm font-bold font-space-grotesk uppercase tracking-wider text-[#3b82f6] border-b border-white/5 pb-2 flex justify-between items-center">
            <span>Verified FICA Folders</span>
            <span className="text-[10px] text-[#4a5a82] font-mono lowercase">{documents.length} files shared</span>
          </h2>

          {documents.length === 0 ? (
            <div className="text-center py-10 text-xs text-[#4a5a82]">
              No verified KYC documents are currently uploaded or available in this transaction folder.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {documents.map((doc: any) => {
                const ownerName = doc.contact_id === buyer?.id 
                  ? `${buyer.first_name} ${buyer.last_name} (Buyer)`
                  : doc.contact_id === seller?.id 
                    ? `${seller.first_name} ${seller.last_name} (Seller)` 
                    : 'Transacting Client';

                return (
                  <div key={doc.id} className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-dm-sans">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                        <span className="text-sm font-bold text-[#eef2ff]">{getDocLabel(doc.document_type)}</span>
                      </div>
                      <div className="text-[11px] text-[#94a3c8]">
                        Owner: <strong className="text-white">{ownerName}</strong>
                      </div>
                      <div className="text-[10px] text-[#4a5a82]">
                        Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <a
                      href={`/api/kyc/documents/download?id=${doc.id}`}
                      className="px-4 py-2 bg-white/5 border border-white/5 rounded-lg text-xs font-bold text-white hover:bg-white/10 hover:border-white/10 transition-all flex items-center justify-center gap-1.5 self-start sm:self-center shrink-0"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" /> Download Secure PDF
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Compliance Notice Footer */}
      <div className="max-w-4xl w-full mx-auto text-center text-[10px] text-[#4a5a82] font-dm-sans py-8 border-t border-white/5 mt-10">
        <p className="max-w-2xl mx-auto leading-relaxed">
          <strong>LEGAL DISCLAIMER & COMPLIANCE WARNING</strong>: This secure portal data is exchanged strictly in accordance with FICA Act 38 of 2001 and the Protection of Personal Information Act (POPIA). Access is audited, logged, and restricted to the designated conveyancer recipient.
        </p>
      </div>

    </div>
  );
}
