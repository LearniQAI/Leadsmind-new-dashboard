'use client';

import { useState } from 'react';
import { 
 Dialog, 
 DialogContent, 
 DialogHeader, 
 DialogTitle, 
 DialogTrigger,
 DialogDescription,
 DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { createContact } from '@/app/actions/contacts';
import { toast } from 'sonner';

export function ImportContactsModal() {
 const [open, setOpen] = useState(false);
 const [file, setFile] = useState<File | null>(null);
 const [importing, setImporting] = useState(false);
 const [stats, setStats] = useState<{ total: number; success: number; failed: number } | null>(null);

 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  if (e.target.files && e.target.files[0]) {
   setFile(e.target.files[0]);
  }
 };

 const processImport = async () => {
  if (!file) return;
  setImporting(true);
  setStats(null);

  try {
   const text = await file.text();
   const lines = text.split('\n').filter(line => line.trim());
   
   let startIndex = 0;
   if (lines[0].toLowerCase().includes('name') || lines[0].toLowerCase().includes('email')) {
    startIndex = 1;
   }

   let successCount = 0;
   let failCount = 0;

   for (let i = startIndex; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length < 2) {
     failCount++;
     continue;
    }

    const firstName = parts[0];
    const lastName = parts[1] || 'Import';
    const email = parts[2] || undefined;

    const result = await createContact({
     firstName,
     lastName,
     email,
     source: 'CSV Import'
    });

    if (result.success) successCount++;
    else failCount++;
   }

   setStats({ total: lines.length - startIndex, success: successCount, failed: failCount });
   toast.success(`Import complete! ${successCount} added, ${failCount} failed.`);
  } catch (error) {
   console.error('Import error:', error);
   toast.error('Failed to parse file. Please ensure it is a valid CSV.');
  } finally {
   setImporting(false);
  }
 };

 return (
  <Dialog open={open} onOpenChange={setOpen}>
   <DialogTrigger asChild>
    <button className="btn btn-md btn-outline-theme-border !rounded-xl text-[10px] uppercase font-black tracking-widest gap-2">
     <Upload size={14} />
     Import CSV
    </button>
   </DialogTrigger>
   <DialogContent className="bg-[#0b0b10] border border-white/5 text-white max-w-md rounded-[32px] overflow-hidden shadow-2xl">
    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-30" />
    
    <DialogHeader className="pt-6">
     <DialogTitle className="text-xl font-black uppercase tracking-tighter">Import Contacts</DialogTitle>
     <DialogDescription className="text-[10px] text-white/20 uppercase font-black tracking-[0.2em]">
      Sync your database via CSV file
     </DialogDescription>
    </DialogHeader>

    <div className="py-8">
     {!stats ? (
      <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all relative group ${file ? 'border-primary/50 bg-primary/5 shadow-[0_0_30px_rgba(56,96,226,0.1)]' : 'border-white/5 bg-white/[0.02] hover:border-white/10'}`}>
       <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-5 transition-transform group-hover:scale-110 shadow-xl ${file ? 'bg-primary text-white shadow-primary/20' : 'bg-white/5 text-white/10'}`}>
        {file ? <FileText size={24} /> : <Upload size={24} />}
       </div>
       <p className="text-xs font-black text-white mb-1 text-center uppercase tracking-tight">
        {file ? file.name : 'Choose a CSV file'}
       </p>
       <p className="text-[9px] text-white/10 uppercase tracking-[0.3em] font-black">
        FirstName, LastName, Email
       </p>
       <input 
        type="file" 
        accept=".csv" 
        className="absolute inset-0 opacity-0 cursor-pointer" 
        onChange={handleFileChange}
        disabled={importing}
       />
      </div>
     ) : (
      <div className="space-y-4">
       <div className="bg-success/5 border border-success/10 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-success/10">
        <div className="h-10 w-10 rounded-xl bg-success/20 text-success flex items-center justify-center shadow-lg shadow-success/20">
         <CheckCircle2 size={20} />
        </div>
        <div>
         <p className="text-sm font-black uppercase text-success">{stats.success} Processed</p>
         <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Records synced successfully</p>
        </div>
       </div>
       {stats.failed > 0 && (
        <div className="bg-danger/5 border border-danger/10 rounded-2xl p-5 flex items-center gap-4 transition-all hover:bg-danger/10">
         <div className="h-10 w-10 rounded-xl bg-danger/20 text-danger flex items-center justify-center shadow-lg shadow-danger/20">
          <AlertCircle size={20} />
         </div>
         <div>
          <p className="text-sm font-black uppercase text-danger">{stats.failed} Failed</p>
          <p className="text-[10px] text-white/30 font-bold uppercase tracking-widest">Duplicate or invalid data</p>
         </div>
        </div>
       )}
      </div>
     )}
    </div>

    <DialogFooter className="pb-6">
     {!stats ? (
       <div className="flex items-center gap-3 w-full">
        <button 
         className="btn btn-md btn-outline-theme-border !rounded-xl text-[10px] uppercase font-black tracking-widest flex-1"
         onClick={() => setOpen(false)}
         disabled={importing}
        >
         Cancel
        </button>
        <button 
         onClick={processImport} 
         disabled={!file || importing}
         className="btn btn-md btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest flex-1 shadow-lg shadow-primary/20"
        >
         {importing ? <><Loader2 size={14} className="mr-2 animate-spin" /> Syncing...</> : 'Sync Database'}
        </button>
       </div>
     ) : (
      <button 
       className="btn btn-md btn-outline-theme-border !rounded-xl text-[10px] uppercase font-black tracking-widest w-full"
       onClick={() => {
        setOpen(false);
        setFile(null);
        setStats(null);
       }}
      >
       Close Panel
      </button>
     )}
    </DialogFooter>
   </DialogContent>
  </Dialog>
 );
}

