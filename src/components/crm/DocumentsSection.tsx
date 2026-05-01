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
          <h3 className="text-xl font-bold text-white">Contact Vault</h3>
          <p className="text-sm text-white/40">Securely stored contracts, briefs, and documents.</p>
        </div>
        <Button className="bg-[#6c47ff] hover:bg-[#5b3ce0] gap-2">
          <Plus className="h-4 w-4" />
          <span>Upload Document</span>
        </Button>
      </div>

      <div className="grid gap-4">
        {documents.length === 0 ? (
          <Card className="bg-[#0b0b10] border-white/5 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <File className="h-6 w-6 text-white/20" />
              </div>
              <p className="text-white/40">No documents yet</p>
            </CardContent>
          </Card>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="bg-white/3 border-white/5 hover:bg-white/5 transition-all">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-[#6c47ff]/10 flex items-center justify-center">
                    <File className="h-5 w-5 text-[#6c47ff]" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{doc.file?.name || 'Document'}</p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">
                      {doc.type}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white/30 hover:text-white"
                    onClick={() => handleDownload(doc.file?.path)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-white/30 hover:text-red-400"
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
