"use client";

import React, { useRef, useState } from 'react';
import { Loader2, Upload, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import { getActiveWorkspaceId } from '@/lib/workspace/activeWorkspaceClient';
import { toast } from 'sonner';
import { MediaVaultModal } from '../MediaVaultModal';

interface LogoUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
}

export const LogoUploadField = ({ value, onChange }: LogoUploadFieldProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploading(true);
      const supabase = createClient();
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
      const filePath = `${getActiveWorkspaceId()}/builder/${fileName}`;
      const { error } = await supabase.storage.from('builder-media').upload(filePath, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('builder-media').getPublicUrl(filePath);
      onChange(publicUrl);
    } catch (err) {
      console.error('Logo upload failed', err);
      toast.error('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex gap-2">
      <Input
        value={value || ''}
        placeholder="https://..."
        onChange={(e) => onChange(e.target.value)}
        className="h-8 bg-white border-slate-200 rounded-lg flex-1 font-mono text-[10px] text-slate-700 focus-visible:border-slate-300"
      />
      <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-8 w-8 shrink-0 bg-slate-100 hover:bg-slate-200 border border-transparent text-slate-700 transition-colors motion-reduce:transition-none"
        onClick={() => setIsVaultOpen(true)}
        title="Browse Media Library"
      >
        <ImageIcon className="w-3.5 h-3.5" />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        className="h-8 w-8 shrink-0 bg-slate-100 hover:bg-slate-200 border-none transition-colors motion-reduce:transition-none"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        title="Direct File Upload"
      >
        {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin motion-reduce:animate-none text-slate-500" /> : <Upload className="w-3.5 h-3.5 text-slate-500" />}
      </Button>
      <MediaVaultModal isOpen={isVaultOpen} onOpenChange={setIsVaultOpen} onSelect={(u) => onChange(u)} />
    </div>
  );
};
