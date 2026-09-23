"use client";

import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import {
  AUDIO_ARTWORK_ACCEPT,
  AUDIO_ARTWORK_PATH_PREFIX,
  audioArtworkFileProblem,
} from '@/lib/lms/audio/artworkUrl';

interface AudioArtworkUploaderProps {
  contentBlockId: string;
  artworkUrl: string | null;
  onChange: (url: string | null) => void;
}

// Per-lesson cover art for the full player's split layout (waveform left, art right). Upload goes
// through the shared /api/lms/upload endpoint exactly like Speaker Library photos (same public
// bucket, allowlist, size cap), then the returned URL is saved via the block's own artwork
// endpoint, which re-validates it. The local file is previewed instantly while that happens.
export default function AudioArtworkUploader({ contentBlockId, artworkUrl, onChange }: AudioArtworkUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState<'uploading' | 'removing' | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  const upload = async (file: File) => {
    const problem = audioArtworkFileProblem(file);
    if (problem) {
      toast.error(problem);
      return;
    }
    setLocalPreview(URL.createObjectURL(file));
    setBusy('uploading');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('pathPrefix', AUDIO_ARTWORK_PATH_PREFIX);
      const uploaded = await fetch('/api/lms/upload', { method: 'POST', body: formData }).then((r) => r.json());
      if (uploaded.error) {
        toast.error(uploaded.error);
        return;
      }
      const saved = await fetch(`/api/lms/content-blocks/${contentBlockId}/artwork`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artwork_url: uploaded.url }),
      }).then((r) => r.json());
      if (saved.error) {
        toast.error(saved.error);
        return;
      }
      onChange(saved.data.audio_artwork_url);
      toast.success(artworkUrl ? 'Artwork replaced' : 'Artwork added');
    } catch {
      toast.error('Upload failed — please try again.');
    } finally {
      setBusy(null);
      setLocalPreview(null);
    }
  };

  const remove = async () => {
    setBusy('removing');
    try {
      const res = await fetch(`/api/lms/content-blocks/${contentBlockId}/artwork`, { method: 'DELETE' }).then((r) => r.json());
      if (res.error) {
        toast.error(res.error);
        return;
      }
      onChange(null);
      toast.success('Artwork removed — the player shows the full-width waveform again');
    } catch {
      toast.error('Could not remove the artwork — please try again.');
    } finally {
      setBusy(null);
    }
  };

  const onFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file && !busy) upload(file);
  };

  const shown = localPreview || artworkUrl;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          onFiles(e.dataTransfer.files);
        }}
        disabled={!!busy}
        aria-label={shown ? 'Replace artwork image' : 'Upload artwork image'}
        className={`relative flex aspect-[4/5] w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors duration-150 motion-reduce:transition-none ${
          isDragging ? 'border-dash-accent bg-dash-accent/5' : shown ? 'border-transparent' : 'border-dash-border bg-dash-surface hover:border-dash-accent/60'
        }`}
      >
        {shown ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shown} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="pointer-events-none flex flex-col items-center gap-1.5 px-3 text-center">
            <ImagePlus size={20} className="!text-dash-textMuted" />
            <span className="text-[11px] font-bold !text-dash-text">Drop an image</span>
            <span className="text-[10px] !text-dash-textMuted">or click to browse</span>
          </span>
        )}
        {busy && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35">
            <Loader2 size={20} className="animate-spin text-white motion-reduce:animate-none" />
          </span>
        )}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={AUDIO_ARTWORK_ACCEPT}
        className="hidden"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <div className="min-w-0 flex-1 space-y-2">
        <p className="text-[12px] !text-dash-textMuted">
          Shown on the right side of the student player (as a small thumbnail beside the title on narrow
          screens). Without artwork, the player simply has no image.
        </p>
        <p className="text-[12px] !text-dash-text">
          <span className="font-bold">Recommended: portrait 4:5, at least 800 × 1000 px.</span>{' '}
          <span className="!text-dash-textMuted">
            PNG, JPG or WebP, up to 10 MB. It&apos;s cropped to a 4:5 portrait from the centre, so keep the subject centred.
          </span>
        </p>
        {artworkUrl && (
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={!!busy}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3 text-[12px] font-bold !text-dash-text hover:bg-dash-surface disabled:opacity-50"
            >
              <RefreshCw size={12} /> Replace
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={!!busy}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3 text-[12px] font-bold !text-dash-text hover:border-red/40 hover:!text-red disabled:opacity-50"
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
