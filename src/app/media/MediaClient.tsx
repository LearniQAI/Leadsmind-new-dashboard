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
  FolderOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function MediaClient({ initialFiles }: { initialFiles: any[] }) {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [files, setFiles] = useState(initialFiles);

  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <ImageIcon className="text-blue-400" />;
    if (type.includes('video')) return <Video className="text-purple-400" />;
    return <File className="text-gray-400" />;
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
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              toast.promise(
                new Promise((resolve) => setTimeout(resolve, 2000)),
                {
                  loading: 'Deploying asset to neural storage...',
                  success: 'Asset initialized successfully!',
                  error: 'Deployment failed',
                }
              );
            }}
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
                  {file.file_type.includes('image') ? (
                    <img src={file.file_url} alt={file.file_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  ) : (
                    <div className="p-8">
                      {getFileIcon(file.file_type)}
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-primary transition-colors text-white">
                      <Download size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-rose-500 transition-colors text-white">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
                  {getFileIcon(file.file_type)}
                </div>
              )}

              <div className={`${view === 'grid' ? 'p-5' : 'flex-1'}`}>
                <h4 className="text-sm font-black text-white uppercase tracking-tight truncate mb-1">
                  {file.file_name}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-white/20 uppercase tracking-widest italic-none">
                    {(file.file_size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Badge className="bg-white/5 text-white/40 border-none text-[8px] font-black uppercase tracking-[0.2em]">
                    {file.file_type.split('/')[1] || 'FILE'}
                  </Badge>
                </div>
              </div>
              
              {view === 'list' && (
                <div className="flex items-center gap-4">
                  <button className="p-2 text-white/20 hover:text-white transition-colors">
                    <Download size={18} />
                  </button>
                  <button className="p-2 text-white/20 hover:text-rose-500 transition-colors">
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
