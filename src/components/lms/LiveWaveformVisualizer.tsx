"use client";

import React, { useEffect, useRef, useState } from "react";
import { useAudioPlayer } from "./AudioPlayerProvider";

// Live audio-reactive bar visualizer — the zero-authoring "this player is alive" surface. It is a
// pure CONSUMER of the provider's single <audio> element: it reads the provider's one shared
// AnalyserNode (getAnalyser) and never creates audio nodes, contexts or elements of its own.
//
// Render modes (exposed as data-mode on the canvas for QA/debugging):
//   reactive — playing, analyser live: bar heights follow real frequency energy each frame.
//   pulse    — playing, but no analyser (iOS, Web Audio unavailable): a calm, obviously generic
//              pulse. Deliberately gentle so it never pretends to be reacting to the audio.
//   idle     — paused / not started: low even bars with a slow breathing wave (full variant),
//              or perfectly still (mini variant — it lives in peripheral vision).
//   static   — prefers-reduced-motion: one still frame per state change, no animation loop.
//
// The requestAnimationFrame loop only runs while it has something to animate AND the canvas is
// on screen (IntersectionObserver); it stops itself once settled, and is cancelled on unmount.

type Mode = "reactive" | "pulse" | "idle" | "static";

interface LiveWaveformVisualizerProps {
  /** Whether the provider's loaded track is the one this visualizer represents. */
  active: boolean;
  /** Bar color — pass the AA-safe accent `ui` variant. Falls back to the canvas's CSS color. */
  color?: string;
  /** Optional gradient partner: bars run colorTo (tips) → color (centre) → colorTo (tips), so
   *  louder, taller bars visibly reach further into the partner colour. Drawing only. */
  colorTo?: string;
  bars?: number;
  variant?: "full" | "mini";
  className?: string;
}

const IDLE_HEIGHT = 0.16;
const IDLE_ALPHA = 0.38;
// Per-frame easing at 60fps, normalised by real frame time below. Fast attack, slow release is
// what makes bars "pulse confidently" instead of flickering: a peak lands quickly, then decays.
const ATTACK = 0.34;
const RELEASE = 0.11;

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mq: MediaQueryList;
    try {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    } catch {
      return;
    }
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return reduced;
}

/** Strictly increasing FFT-bin edges for `bands` bands between ~90Hz and ~7kHz, spaced on a
 *  power curve so the speech-heavy low end gets most of the resolution. */
function buildBandEdges(bands: number, binCount: number, sampleRate: number): number[] {
  const binHz = sampleRate / 2 / binCount;
  const lo = Math.max(1, Math.round(90 / binHz));
  const hi = Math.min(binCount - 1, Math.round(7000 / binHz));
  const edges: number[] = [];
  for (let i = 0; i <= bands; i++) {
    const e = Math.round(lo + (hi - lo) * Math.pow(i / bands, 1.7));
    edges.push(i === 0 ? e : Math.max(edges[i - 1] + 1, e));
  }
  return edges;
}

export default function LiveWaveformVisualizer({
  active,
  color,
  colorTo,
  bars = 48,
  variant = "full",
  className = "",
}: LiveWaveformVisualizerProps) {
  const { isPlaying, getAnalyser } = useAudioPlayer();
  const reducedMotion = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Everything the frame loop reads lives in refs so prop/state changes never restart it.
  const stateRef = useRef({ playing: false, reduced: false, color: color ?? "", colorTo: colorTo ?? "", variant });
  stateRef.current = { playing: active && isPlaying, reduced: reducedMotion, color: color ?? "", colorTo: colorTo ?? "", variant };
  const wakeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx2d = canvas.getContext("2d");
    if (!ctx2d) return;

    let rafId: number | null = null;
    let visible = true;
    let lastFrame = 0;
    let lastDrawn = 0;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    let edges: number[] = [];
    let edgesKey = "";
    const heights = new Float32Array(bars).fill(IDLE_HEIGHT);
    const target = new Float32Array(bars);
    let alpha = IDLE_ALPHA;
    let mode: Mode | null = null;
    let cssWidth = 0;
    let cssHeight = 0;
    let gradient: CanvasGradient | null = null;
    let gradientKey = "";

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssWidth = rect.width;
      cssHeight = rect.height;
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const setMode = (next: Mode) => {
      if (next === mode) return;
      mode = next;
      canvas.dataset.mode = next;
    };

    const draw = () => {
      const { color: c, colorTo: c2, variant: v } = stateRef.current;
      const n = heights.length;
      ctx2d.clearRect(0, 0, cssWidth, cssHeight);
      if (cssWidth <= 0 || cssHeight <= 0) return;
      const base = c || getComputedStyle(canvas).color;
      if (c2) {
        // Rebuilt only when height/colours change, not every frame.
        const key = `${cssHeight}|${base}|${c2}`;
        if (key !== gradientKey) {
          gradient = ctx2d.createLinearGradient(0, 0, 0, cssHeight);
          gradient.addColorStop(0, c2);
          gradient.addColorStop(0.5, base);
          gradient.addColorStop(1, c2);
          gradientKey = key;
        }
        ctx2d.fillStyle = gradient!;
      } else {
        ctx2d.fillStyle = base;
      }
      ctx2d.globalAlpha = alpha;
      const slot = cssWidth / n;
      const barW = Math.max(1.5, Math.min(slot * 0.56, v === "mini" ? 4 : 6));
      const radius = barW / 2;
      const mid = cssHeight / 2;
      for (let i = 0; i < n; i++) {
        const h = Math.max(barW, heights[i] * cssHeight);
        const x = slot * i + (slot - barW) / 2;
        const y = mid - h / 2;
        ctx2d.beginPath();
        if (typeof ctx2d.roundRect === "function") ctx2d.roundRect(x, y, barW, h, radius);
        else ctx2d.rect(x, y, barW, h);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;
    };

    // Symmetric layout: the lowest (loudest, speech-carrying) band sits in the centre and higher
    // bands spread outward, with a mild centre-weighted envelope — reads as one shape, not noise.
    const envelope = (i: number, n: number) => {
      const d = n > 1 ? Math.abs(i - (n - 1) / 2) / ((n - 1) / 2) : 0;
      return { d, env: 1 - 0.32 * d * d };
    };

    const computeTargets = (now: number, target: Float32Array): Mode => {
      const { playing, reduced, variant: v } = stateRef.current;
      const n = target.length;
      const analyser = playing ? getAnalyser() : null;

      if (playing && analyser && !reduced) {
        if (!freq || freq.length !== analyser.frequencyBinCount) freq = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freq);
        const bands = Math.ceil(n / 2);
        const key = `${bands}:${freq.length}:${analyser.context.sampleRate}`;
        if (key !== edgesKey) {
          edges = buildBandEdges(bands, freq.length, analyser.context.sampleRate);
          edgesKey = key;
        }
        for (let i = 0; i < n; i++) {
          const { d, env } = envelope(i, n);
          const b = Math.min(bands - 1, Math.floor(d * bands));
          let sum = 0;
          for (let k = edges[b]; k < edges[b + 1]; k++) sum += freq[k];
          const avg = sum / (edges[b + 1] - edges[b]);
          // Treble naturally carries less energy — tilt it up so outer bars still move.
          const tilted = Math.min(1, (avg / 255) * (1 + 0.8 * (b / bands)));
          target[i] = 0.1 + 0.9 * Math.pow(tilted, 1.35) * env;
        }
        return "reactive";
      }

      if (reduced) {
        for (let i = 0; i < n; i++) {
          const { env } = envelope(i, n);
          target[i] = playing ? 0.22 + 0.3 * env : IDLE_HEIGHT;
        }
        return "static";
      }

      const t = now / 1000;
      if (playing) {
        for (let i = 0; i < n; i++) {
          const { env } = envelope(i, n);
          target[i] = (0.26 + 0.1 * Math.sin(t * 2.4 + i * 0.55)) * env;
        }
        return "pulse";
      }

      for (let i = 0; i < n; i++) {
        target[i] = v === "mini" ? IDLE_HEIGHT : IDLE_HEIGHT + 0.045 * Math.sin(t * 1.9 - i * 0.32);
      }
      return "idle";
    };

    const frame = (now: number) => {
      rafId = null;
      const { playing, reduced, variant: v } = stateRef.current;

      // Mini bar and idle breathing don't need 60fps — cap them at ~30 to halve the cost.
      const capped = v === "mini" || !playing;
      if (capped && now - lastDrawn < 32) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      const dt = lastFrame ? Math.min(100, now - lastFrame) : 16.7;
      lastFrame = now;
      lastDrawn = now;

      const nextMode = computeTargets(now, target);
      setMode(nextMode);
      const k = dt / 16.7;
      let settled = true;
      for (let i = 0; i < heights.length; i++) {
        const diff = target[i] - heights[i];
        if (reduced) {
          heights[i] = target[i];
          continue;
        }
        const f = diff > 0 ? ATTACK : RELEASE;
        heights[i] += diff * (1 - Math.pow(1 - f, k));
        if (Math.abs(diff) > 0.002) settled = false;
      }
      const alphaTarget = playing ? 1 : IDLE_ALPHA;
      alpha = reduced ? alphaTarget : alpha + (alphaTarget - alpha) * (1 - Math.pow(0.88, k));
      if (Math.abs(alphaTarget - alpha) > 0.01) settled = false;
      draw();

      // Keep looping only while something is genuinely moving on screen.
      const animating = !reduced && (nextMode === "reactive" || nextMode === "pulse" || (nextMode === "idle" && v === "full"));
      if (visible && (animating || !settled)) rafId = requestAnimationFrame(frame);
      else lastFrame = 0;
    };

    const wake = () => {
      if (rafId != null || !visible) return;
      rafId = requestAnimationFrame(frame);
    };
    wakeRef.current = wake;

    resize();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
      wake();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
      else if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
        lastFrame = 0;
      }
    });
    io.observe(canvas);
    wake();

    return () => {
      ro.disconnect();
      io.disconnect();
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
      wakeRef.current = () => {};
    };
  }, [bars, getAnalyser]);

  // Any state change that could alter what's drawn restarts the (self-stopping) loop.
  useEffect(() => {
    wakeRef.current();
  }, [active, isPlaying, reducedMotion, color, colorTo, variant]);

  return <canvas ref={canvasRef} aria-hidden="true" className={`block ${className}`} />;
}
