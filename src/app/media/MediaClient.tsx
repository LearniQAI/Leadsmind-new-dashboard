// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { 
  File, 
  Image as ImageIcon, 
  Video, 
  MoreVertical, 
  Download, 
  Trash2, 
  Upload,
  Search,
  Grid,
  List as ListIcon,
  FolderOpen,
  Copy
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

import { createClient } from '@/lib/supabase/client';

export default function MediaClient({ initialFiles, workspaceId }: { initialFiles: any[], workspaceId: string }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState(initialFiles);
  const supabase = createClient();

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="text-blue-400" />;
    if (type.includes('video')) return <Video className="text-purple-400" />;
    return <File className="text-gray-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !workspaceId) return;
    
    const filePath = `${workspaceId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

    toast.promise(
      async () => {
        // 1. Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, file);
          
        if (uploadError) throw uploadError;

        // 2. Register file in database
        const { data: dbData, error: dbError } = await supabase
          .from('media_files')
          .insert({
            workspace_id: workspaceId,
            name: file.name,
            path: filePath,
            type: 'file',
            mime_type: file.type || 'application/octet-stream',
            size: file.size
          })
          .select()
          .single();
          
        if (dbError) throw dbError;
        
        // 3. Update local state
        setFiles(prev => [dbData, ...prev]);
        return dbData;
      },
      {
        loading: 'Deploying asset to neural storage...',
        success: 'Asset initialized successfully!',
        error: (err) => `Deployment failed: ${err.message}`,
      }
    );
  };

  const handleDelete = async (fileId: string, path: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;
    toast.promise(
      async () => {
        if (!path.startsWith('http') && !path.startsWith('draft://')) {
          await supabase.storage.from('media').remove([path]);
        }
        await supabase.from('media_files').delete().eq('id', fileId);
        setFiles(prev => prev.filter(f => f.id !== fileId));
      },
      {
        loading: 'Deleting file...',
        success: 'File deleted successfully',
        error: 'Failed to delete file'
      }
    );
  };

  const handleDownload = async (file: any) => {
    try {
      if (file.path.startsWith('draft://')) {
        const content = file.metadata?.content || '';
        const blob = new Blob([content], { type: 'text/plain' });
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = file.name.endsWith('.txt') ? file.name : `${file.name}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        return;
      }

      const url = file.path.startsWith('http') ? file.path : supabase.storage.from('media').getPublicUrl(file.path).data.publicUrl;
      // Fetch as blob to force download instead of opening in new tab
      const res = await fetch(url);
      if (!res.ok) throw new Error('Network error');
      const blob = await res.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(objectUrl);
    } catch (err) {
      toast.error('Failed to download file');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Media Center</h2>
          <p className="text-white/40 text-sm font-medium">Manage and deploy your digital assets across the LeadsMind network.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            id="media-upload" 
            className="hidden" 
            onChange={handleUpload}
          />
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
            <button 
              onClick={() => setView('grid')}
              className={`p-2 rounded-lg transition-all ${view === 'grid' ? 'bg-primary text-white' : 'text-white/40 hover:text-white'}`}
            >
              <Grid size={18} />
            </button>
            <button 
              onClick={() => setView('list')}
              className={`p-2 rounded-lg transition-all ${view === 'list' ? 'bg-primary text-white' : 'text-white/40 hover:text-white'}`}
            >
              <ListIcon size={18} />
            </button>
          </div>
          <Button 
            onClick={() => document.getElementById('media-upload').click()}
            className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-xl shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Upload size={16} /> Upload Asset
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4 bg-white/[0.02] border border-white/5 p-4 rounded-2xl">
        <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-xl px-4 py-2">
          <Search className="w-4 h-4 text-white/20 mr-2" />
          <input 
            type="text" 
            placeholder="Search assets by name or type..." 
            className="bg-transparent border-none outline-none text-xs text-white placeholder:text-white/20 w-full"
          />
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-white/5 border-white/10 text-white/40 hover:text-white cursor-pointer px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Images</Badge>
          <Badge className="bg-white/5 border-white/10 text-white/40 hover:text-white cursor-pointer px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Videos</Badge>
          <Badge className="bg-white/5 border-white/10 text-white/40 hover:text-white cursor-pointer px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest">Documents</Badge>
        </div>
      </div>

      {files.length === 0 ? (
        <div className="py-32 flex flex-col items-center justify-center text-center bg-[#0b0b1a] border-2 border-dashed border-white/10 rounded-[40px] group">
          <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform border border-white/10">
            <FolderOpen size={32} className="text-white/20" />
          </div>
          <h3 className="text-xl font-black text-white/40 uppercase tracking-widest">Storage Empty</h3>
          <p className="text-white/20 text-xs font-bold mt-2 uppercase tracking-widest">Your neural asset repository is offline.</p>
        </div>
      ) : (
        <div className={view === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xxl:grid-cols-5 gap-6" : "space-y-4"}>
          {files.map((file) => (
            <div 
              key={file.id} 
              className={`bg-[#0b0b1a] border border-white/10 rounded-3xl overflow-hidden group hover:border-primary/50 transition-all duration-500 shadow-xl ${view === 'list' ? 'flex items-center p-4 gap-6' : ''}`}
            >
              {view === 'grid' ? (
                <div className="aspect-square bg-white/5 flex items-center justify-center relative overflow-hidden">
                  {(file.mime_type || '').includes('image') ? (
                    <img src={file.path.startsWith('http') ? file.path : (file.path.startsWith('draft://') ? '' : supabase.storage.from('media').getPublicUrl(file.path).data.publicUrl)} alt={file.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="p-8">
                      {getFileIcon(file.mime_type || '')}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => {
                        if (file.path.startsWith('draft://')) {
                          toast.error('Drafts do not have a public URL');
                          return;
                        }
                        const url = file.path.startsWith('http') ? file.path : supabase.storage.from('media').getPublicUrl(file.path).data.publicUrl;
                        navigator.clipboard.writeText(url);
                        toast.success('Asset URL copied to clipboard!');
                      }}
                      className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-emerald-500 transition-colors text-white"
                      title="Copy Public URL"
                    >
                      <Copy size={16} />
                    </button>
                    <button onClick={() => handleDownload(file)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-primary transition-colors text-white" title="Download">
                      <Download size={16} />
                    </button>
                    <button onClick={() => handleDelete(file.id, file.path)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-rose-500 transition-colors text-white" title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                  {getFileIcon(file.mime_type || '')}
                </div>
              )}

              <div className={`${view === 'grid' ? 'p-5' : 'flex-1'}`}>
                <h4 className="text-sm font-black text-white uppercase tracking-tight truncate mb-1" title={file.name}>
                  {file.name}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic-none">
                    {formatFileSize(file.size || 0)}
                  </span>
                  <Badge className="bg-white/5 text-white/40 border-none text-[8px] font-black uppercase tracking-[0.2em]">
                    {(file.mime_type || '').split('/')[1] || 'FILE'}
                  </Badge>
                </div>
              </div>
              
              {view === 'list' && (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => {
                      if (file.path.startsWith('draft://')) {
                        toast.error('Drafts do not have a public URL');
                        return;
                      }
                      const url = file.path.startsWith('http') ? file.path : supabase.storage.from('media').getPublicUrl(file.path).data.publicUrl;
                      navigator.clipboard.writeText(url);
                      toast.success('Asset URL copied to clipboard!');
                    }}
                    className="p-2 text-white/20 hover:text-emerald-500 transition-colors"
                    title="Copy Public URL"
                  >
                    <Copy size={18} />
                  </button>
                  <button onClick={() => handleDownload(file)} className="p-2 text-white/20 hover:text-white transition-colors" title="Download">
                    <Download size={18} />
                  </button>
                  <button onClick={() => handleDelete(file.id, file.path)} className="p-2 text-white/20 hover:text-rose-500 transition-colors" title="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
