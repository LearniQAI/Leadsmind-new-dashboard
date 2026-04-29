"use client";

import React, { useRef, useState } from 'react';
import { useNode } from '@craftjs/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export const ImageSettings = () => {
    const { actions: { setProp }, src, alt, borderRadius, objectFit, width, height, shape } = useNode((node) => ({
        src: node.data.props.src,
        alt: node.data.props.alt,
        borderRadius: node.data.props.borderRadius,
        objectFit: node.data.props.objectFit,
        width: node.data.props.width,
        height: node.data.props.height,
        shape: node.data.props.shape,
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
            const filePath = `builder/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('builder-media')
                .upload(filePath, file, { cacheControl: '3600', upsert: false });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('builder-media')
                .getPublicUrl(filePath);

            setProp((props: any) => props.src = publicUrl);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block">Image Source</Label>
                
                <div className="flex gap-2">
                    <Input 
                        value={src || ''}
                        placeholder="https://..."
                        onChange={(e) => setProp((props: any) => props.src = e.target.value)}
                        className="h-9 text-xs bg-white/5 border-white/10 flex-1"
                    />
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleUpload} 
                        accept="image/*" 
                        className="hidden" 
                    />
                    <Button 
                        variant="secondary" 
                        size="icon" 
                        className="h-9 w-9 shrink-0 bg-white/5 hover:bg-white/10 border-none"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                    >
                        {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-white/50" /> : <Upload className="w-4 h-4 text-white/50" />}
                    </Button>
                </div>
            </div>
            
            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Alt Text (SEO)</Label>
                <Input 
                    value={alt || ''}
                    placeholder="Describe image..."
                    onChange={(e) => setProp((props: any) => props.alt = e.target.value)}
                    className="h-8 text-xs bg-white/5 border-white/10"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block text-center">Width</Label>
                    <Input 
                        value={width || '100%'}
                        onChange={(e) => setProp((props: any) => props.width = e.target.value)}
                        className="h-8 text-xs text-center bg-white/5 border-white/10"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground block text-center">Height</Label>
                    <Input 
                        value={height || 'auto'}
                        onChange={(e) => setProp((props: any) => props.height = e.target.value)}
                        className="h-8 text-xs text-center bg-white/5 border-white/10"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Shape</Label>
                <div className="grid grid-cols-2 bg-muted p-1 rounded-md border border-white/5">
                    {['square', 'circle'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setProp((props: any) => props.shape = s)}
                            className={`text-[10px] py-1.5 rounded capitalize font-bold ${shape === s ? 'bg-primary text-white shadow' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {shape !== 'circle' && (
                <div className="space-y-2 pt-2">
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
            )}

            <div className="space-y-2 pt-2">
                <Label className="text-xs uppercase tracking-wider font-bold text-muted-foreground">Object Fit</Label>
                <div className="grid grid-cols-4 bg-muted p-1 rounded-md border border-white/5">
                    {['cover', 'contain', 'fill', 'none'].map((fit) => (
                        <button
                            key={fit}
                            onClick={() => setProp((props: any) => props.objectFit = fit)}
                            className={`text-[9px] py-1 rounded capitalize ${objectFit === fit ? 'bg-[#6c47ff] text-white font-bold shadow' : 'text-muted-foreground hover:text-white'}`}
                        >
                            {fit}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
