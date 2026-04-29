"use client";

import React, { useRef, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, Video as VideoIcon } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export const VideoSettings = () => {
    const { actions: { setProp }, url, provider, autoPlay, controls, loop, muted, borderRadius } = useNode((node) => ({
        url: node.data.props.url,
        provider: node.data.props.provider,
        autoPlay: node.data.props.autoPlay,
        controls: node.data.props.controls,
        loop: node.data.props.loop,
        muted: node.data.props.muted,
        borderRadius: node.data.props.borderRadius,
    }));

    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsUploading(true);
            const supabase = createClient();
            
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.floor(Math.random() * 10000)}.${fileExt}`;
            const filePath = `builder/videos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('builder-media')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('builder-media')
                .getPublicUrl(filePath);

            setProp((props: any) => {
                props.url = publicUrl;
                props.provider = 'custom';
            });
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload video. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="space-y-3">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Video Source</Label>
                
                <div className="grid grid-cols-3 bg-muted p-1 rounded-md border border-white/5 mb-3">
                    {['youtube', 'vimeo', 'custom'].map((p) => (
                        <button
                            key={p}
                            onClick={() => setProp((props: any) => props.provider = p)}
                            className={`text-[9px] py-1.5 rounded capitalize ${provider === p ? 'bg-primary text-white font-bold shadow' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {p === 'custom' ? 'Upload' : p}
                        </button>
                    ))}
                </div>

                {provider === 'custom' ? (
                    <div className="space-y-2">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleUpload} 
                            accept="video/*" 
                            className="hidden" 
                        />
                        <Button 
                            variant="outline" 
                            className="w-full h-20 border-dashed border-2 bg-white/5 hover:bg-white/10 flex flex-col gap-2"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                        >
                            {isUploading ? (
                                <Loader2 className="w-6 h-6 animate-spin text-[#6c47ff]" />
                            ) : (
                                <>
                                    <Upload className="w-5 h-5 text-muted-foreground" />
                                    <span className="text-xs font-medium text-muted-foreground">Click to upload MP4</span>
                                </>
                            )}
                        </Button>
                        <Input 
                            value={url || ''}
                            placeholder="Or paste direct video URL (.mp4)"
                            onChange={(e) => setProp((props: any) => props.url = e.target.value)}
                            className="h-8 text-xs bg-white/5 border-white/10 mt-2"
                        />
                    </div>
                ) : (
                    <div className="space-y-2">
                        <Input 
                            value={url || ''}
                            placeholder={`Paste ${provider} URL...`}
                            onChange={(e) => setProp((props: any) => props.url = e.target.value)}
                            className="h-9 text-xs bg-white/5 border-white/10"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-3 pt-2 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Playback Controls</Label>
                
                <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={autoPlay} 
                            onChange={(e) => setProp((props: any) => props.autoPlay = e.target.checked)}
                            className="w-3 h-3 rounded-sm bg-background border-white/20 text-primary accent-primary"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Autoplay</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={loop} 
                            onChange={(e) => setProp((props: any) => props.loop = e.target.checked)}
                            className="w-3 h-3 rounded-sm bg-background border-white/20 text-primary accent-primary"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Loop</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={muted} 
                            onChange={(e) => setProp((props: any) => props.muted = e.target.checked)}
                            className="w-3 h-3 rounded-sm bg-background border-white/20 text-primary accent-primary"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Muted</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer p-2 rounded border border-white/5 bg-white/5 hover:bg-white/10 transition-colors">
                        <input 
                            type="checkbox" 
                            checked={controls} 
                            onChange={(e) => setProp((props: any) => props.controls = e.target.checked)}
                            className="w-3 h-3 rounded-sm bg-background border-white/20 text-primary accent-primary"
                        />
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">Controls</span>
                    </label>
                </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-white/5">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Border Radius ({borderRadius}px)</Label>
                <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={borderRadius || 0}
                    onChange={(e) => setProp((props: any) => props.borderRadius = Number(e.target.value))}
                    className="w-full"
                />
            </div>
        </div>
    );
};
