"use client";

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Check, Info, Loader2, RotateCcw } from 'lucide-react';
import { PLAYER } from '@/lib/lms/audio/playerIdentity';
import {
  WAVEFORM_FIELD,
  WAVEFORM_MIN_CONTRAST,
  normalizeWaveformColor,
  resolveWaveformColor,
} from '@/lib/lms/audio/waveformColor';
import { contrastRatio } from '@/lib/color/accessibleAccent';
import { waveformBarOpacity } from '@/components/lms/LiveWaveformVisualizer';

interface AudioWaveformColorPickerProps {
  contentBlockId: string;
  /** Saved value: content_blocks.audio_waveform_color (the admin's raw pick; null = default). */
  color: string | null;
  onChange: (color: string | null) => void;
}

// A fixed, speech-like frame of bar heights (0-1): loud centre, quieter edges, uneven like a real
// voice. Static on purpose: this preview shows the colour, not the audio.
const PREVIEW_HEIGHTS = [
  0.18, 0.26, 0.2, 0.34, 0.28, 0.42, 0.3, 0.5, 0.38, 0.62, 0.46, 0.72, 0.58, 0.84, 0.66, 0.92, 0.74, 0.88,
  0.7, 0.96, 0.78, 0.9, 0.64, 0.8, 0.56, 0.7, 0.48, 0.6, 0.4, 0.52, 0.32, 0.44, 0.26, 0.36, 0.22, 0.3, 0.18, 0.24,
];

/** The same bars the full player draws (3px, fully rounded, mirrored about the centre line, opacity
 *  from waveformBarOpacity), rendered once, in the colour the player would use. */
function WaveformSwatch({ color }: { color: string }) {
  const n = PREVIEW_HEIGHTS.length;
  return (
    <div className="flex h-12 items-center rounded-xl border border-player-border bg-player-raised px-3" aria-hidden>
      <div className="flex h-8 w-full items-center justify-between">
        {PREVIEW_HEIGHTS.map((h, i) => (
          <span
            key={i}
            className="w-[3px] rounded-full"
            style={{ height: `${Math.max(10, h * 100)}%`, backgroundColor: color, opacity: waveformBarOpacity(i, n, h, true) }}
          />
        ))}
      </div>
    </div>
  );
}

function Chip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] !text-dash-textMuted">
      <span className="h-3.5 w-3.5 rounded-full ring-1 ring-inset ring-black/10" style={{ backgroundColor: color }} />
      {label} <span className="font-mono !text-dash-text">{color}</span>
    </span>
  );
}

// Open picker + automatic adjustment: any colour can be picked; what students see is always
// resolveWaveformColor(pick).rendered, darkened (hue kept) until it clears 3:1 on the waveform
// field. When that changes the pick, both are shown with a note. Nothing is swapped silently.
export default function AudioWaveformColorPicker({ contentBlockId, color, onChange }: AudioWaveformColorPickerProps) {
  const [draft, setDraft] = useState<string | null>(color);
  const [hexInput, setHexInput] = useState(color ?? '');
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null);

  useEffect(() => {
    setDraft(color);
    setHexInput(color ?? '');
  }, [color]);

  const resolved = resolveWaveformColor(draft);
  const dirty = draft !== color;

  const pick = (value: string) => {
    setHexInput(value.toUpperCase());
    const normalized = normalizeWaveformColor(value);
    if (normalized) setDraft(normalized);
  };

  const save = async () => {
    if (!draft) return;
    setBusy('save');
    try {
      const res = await fetch(`/api/lms/content-blocks/${contentBlockId}/waveform-color`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color: draft }),
      });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      onChange(json.data.audio_waveform_color);
      toast.success('Waveform colour saved');
    } finally {
      setBusy(null);
    }
  };

  const reset = async () => {
    if (!color) {
      // Nothing saved yet: just discard the unsaved pick.
      setDraft(null);
      setHexInput('');
      return;
    }
    setBusy('reset');
    try {
      const res = await fetch(`/api/lms/content-blocks/${contentBlockId}/waveform-color`, { method: 'DELETE' });
      const json = await res.json();
      if (json.error) {
        toast.error(json.error);
        return;
      }
      onChange(null);
      toast.success('Waveform colour reset to default');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-[12px] !text-dash-textMuted">
        The colour of this lesson&apos;s live waveform, for every student. Louder moments show the colour at full
        strength, quieter ones lighter. The play button and scrubber stay in the player&apos;s standard ink.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative h-9 w-9 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-dash-border">
          <span className="sr-only">Pick a waveform colour</span>
          <span className="absolute inset-0" style={{ backgroundColor: draft ?? PLAYER.ink }} />
          <input
            type="color"
            value={(draft ?? PLAYER.ink).toLowerCase()}
            onChange={(e) => pick(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </label>
        <input
          value={hexInput}
          onChange={(e) => pick(e.target.value)}
          placeholder="#1D4ED8"
          maxLength={7}
          spellCheck={false}
          aria-label="Waveform colour hex code"
          className="h-9 w-28 rounded-lg border border-dash-border bg-white px-2.5 font-mono text-[12px] uppercase !text-dash-text outline-none focus:border-dash-accent"
        />
        <button
          type="button"
          onClick={save}
          disabled={!draft || !dirty || !!busy}
          className="flex h-9 items-center gap-1.5 rounded-lg bg-dash-accent px-3.5 text-[12px] font-bold text-white disabled:opacity-50"
        >
          {busy === 'save' ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <Check size={13} />}
          Save colour
        </button>
        {(color || draft) && (
          <button
            type="button"
            onClick={reset}
            disabled={!!busy}
            className="flex h-9 items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3 text-[12px] font-bold !text-dash-text hover:bg-dash-surface disabled:opacity-50"
          >
            {busy === 'reset' ? <Loader2 size={13} className="animate-spin motion-reduce:animate-none" /> : <RotateCcw size={13} />}
            Reset to default
          </button>
        )}
      </div>

      <div>
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide !text-dash-textMuted">
          Preview{dirty ? ' (not saved yet)' : ''}
        </p>
        <WaveformSwatch color={resolved.rendered} />
      </div>

      {!resolved.pick ? (
        <p className="text-[12px] !text-dash-textMuted">Default: the player&apos;s standard monochrome waveform.</p>
      ) : resolved.adjusted ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
          <Info size={14} className="mt-0.5 shrink-0 text-amber-700" />
          <div className="space-y-1.5">
            <p className="text-[12px] font-semibold text-amber-800">Adjusted slightly for readability</p>
            <p className="text-[12px] text-amber-800">
              Your colour was too light to stand out on the player, so students see a darker shade of the same hue. It
              needs at least {WAVEFORM_MIN_CONTRAST}:1 contrast; your pick has{' '}
              {(Math.floor(contrastRatio(resolved.pick, WAVEFORM_FIELD) * 100) / 100).toFixed(2)}:1 and the
              adjusted shade has {(Math.floor(resolved.contrast * 100) / 100).toFixed(2)}:1.
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <Chip color={resolved.pick} label="Your pick" />
              <Chip color={resolved.rendered} label="Students see" />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-[12px] !text-dash-textMuted">
          Used exactly as picked. It already has enough contrast on the player.
        </p>
      )}
    </div>
  );
}
