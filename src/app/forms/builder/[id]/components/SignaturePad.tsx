'use client';

import React, { useRef, useEffect, useState } from 'react';
import { PenTool, RotateCcw } from 'lucide-react';

interface Props {
  fieldId: string;
  disabled?: boolean;
  isBuilder?: boolean;
  value?: string; // base64 image
  onChange?: (val: string | null) => void;
}

export function SignaturePad({ fieldId, disabled, isBuilder, value, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Handle high DPI displays
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set actual size in memory (scaled to account for extra pixel density).
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Check if we need to resize to prevent clearing on re-renders
    if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      // Setup drawing styles
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#eef2ff'; // White ink for dark mode
      
      // If we have an existing value, try to redraw it (simplified for now)
      if (value && hasSignature) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
        img.src = value;
      }
    }
  }, [value, hasSignature]);

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isBuilder || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isBuilder || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    e.preventDefault(); // Prevent scrolling on touch
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing || isBuilder || disabled) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    setHasSignature(true);
    
    if (onChange) {
      // Save as base64 png
      const dataUrl = canvas.toDataURL('image/png');
      onChange(dataUrl);
    }
  };

  const clearSignature = () => {
    if (isBuilder || disabled) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    setHasSignature(false);
    
    if (onChange) {
      onChange(null);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  return (
    <div className="w-full">
      <div 
        className={`relative w-full h-32 bg-[#080f28]/95 border border-white/10 rounded-xl overflow-hidden ${
          isBuilder || disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-crosshair focus-within:border-[#2563eb] transition-colors'
        }`}
      >
        {!hasSignature && !isDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-[24px] font-space-grotesk text-white/10 uppercase tracking-widest select-none">
              Sign Here
            </span>
          </div>
        )}
        
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height: '100%', display: 'block', touchAction: 'none' }}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        
        <div className="absolute bottom-2 right-2 flex items-center pointer-events-none">
          <PenTool size={12} className="text-[#4a5a82]" />
        </div>
      </div>
      
      {hasSignature && !isBuilder && !disabled && (
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={clearSignature}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#4a5a82] hover:text-white transition-colors"
          >
            <RotateCcw size={10} /> Clear Signature
          </button>
        </div>
      )}
    </div>
  );
}
