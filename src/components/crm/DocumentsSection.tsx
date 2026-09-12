'use client';

import { useState } from 'react';
import {
 File,
 Plus,
 Download,
 Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 Card,
 CardContent
} from '@/components/ui/card';
import { toast } from 'sonner';

interface DocumentsSectionProps {
 contactId: string;
 documents: any[];
}

export function DocumentsSection({ contactId, documents: initialDocuments }: DocumentsSectionProps) {
 const [documents, setDocuments] = useState(initialDocuments);

 async function handleDownload(path: string) {
  // Implement download logic if needed
  toast.info('Download logic not implemented');
 }

 return (
  <div className="space-y-6">
   <div className="flex items-center justify-between">
    <div>
     <h3 className="text-xl font-bold text-dash-text">Contact Vault</h3>
     <p className="text-sm text-dash-textMuted">Securely stored contracts, briefs, and documents.</p>
    </div>
    <Button className="bg-dash-accent hover:bg-dash-accent/90 text-white gap-2">
     <Plus className="h-4 w-4" />
     <span>Upload Document</span>
    </Button>
   </div>

   <div className="grid gap-4">
    {documents.length === 0 ? (
     <Card className="bg-dash-surface border-dash-border border-dashed">
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
       <div className="h-12 w-12 rounded-full bg-dash-bg flex items-center justify-center mb-4">
        <File className="h-6 w-6 text-dash-textMuted" />
       </div>
       <p className="text-dash-textMuted">No documents yet</p>
      </CardContent>
     </Card>
    ) : (
     documents.map((doc) => (
      <Card key={doc.id} className="bg-dash-surface border-dash-border hover:border-dash-accent/30 transition-all">
       <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
         <div className="h-10 w-10 rounded-xl bg-dash-accent/10 flex items-center justify-center">
          <File className="h-5 w-5 text-dash-accent" />
         </div>
         <div>
          <p className="text-sm font-bold text-dash-text">{doc.file?.name || 'Document'}</p>
          <p className="text-[10px] text-dash-textMuted uppercase tracking-wider font-semibold">
           {doc.type}
          </p>
         </div>
        </div>

        <div className="flex items-center gap-2">
         <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-dash-textMuted hover:text-dash-text"
          onClick={() => handleDownload(doc.file?.path)}
         >
          <Download className="h-4 w-4" />
         </Button>
         <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-dash-textMuted hover:text-red-500"
         >
          <Trash2 className="h-4 w-4" />
         </Button>
        </div>
       </CardContent>
      </Card>
     ))
    )}
   </div>
  </div>
 );
}
