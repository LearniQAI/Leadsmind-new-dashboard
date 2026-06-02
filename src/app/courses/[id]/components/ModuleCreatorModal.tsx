"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, Sparkles, X } from "lucide-react";
import { useDashboardContext } from "@/components/layouts/DashboardProvider";

interface ModuleCreatorModalProps {
  courseId: string;
  moduleId?: string;
  onClose: () => void;
  onSaved: () => void;
  isOpen?: boolean;
}

const EMOJI_OPTIONS = ["📚", "🎯", "⚡", "💼", "🧪", "📋"];
const NQF_LEVELS = [
  "None",
  "NQF Level 1",
  "NQF Level 2",
  "NQF Level 3",
  "NQF Level 4",
  "NQF Level 5",
  "NQF Level 6",
  "NQF Level 7",
  "NQF Level 8",
  "NQF Level 9",
  "NQF Level 10"
];

export default function ModuleCreatorModal({
  courseId,
  moduleId,
  onClose,
  onSaved,
  isOpen = true
}: ModuleCreatorModalProps) {
  const { workspace } = useDashboardContext();
  const workspaceId = workspace?.id || null;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [customIcon, setCustomIcon] = useState("");
  const [publishStatus, setPublishStatus] = useState<"published" | "draft" | "coming_soon">("draft");
  const [nqfLevel, setNqfLevel] = useState("None");
  const [requiredForCompletion, setRequiredForCompletion] = useState(true);
  const [dripDays, setDripDays] = useState(0);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (moduleId && isOpen) {
      // Load existing data
      fetch(`/api/lms/modules?id=${moduleId}`)
        .then((res) => res.json())
        .then((resData) => {
          if (resData.data) {
            const m = resData.data;
            setTitle(m.title || "");
            setDescription(m.description || "");
            setPublishStatus(m.publish_status || "draft");
            setNqfLevel(m.nqf_level || "None");
            setRequiredForCompletion(m.required_for_completion !== false);
            setDripDays(m.drip_days || 0);
            
            if (EMOJI_OPTIONS.includes(m.icon)) {
              setIcon(m.icon);
              setCustomIcon("");
            } else {
              setIcon("custom");
              setCustomIcon(m.icon || "");
            }
          }
        })
        .catch(() => toast.error("Failed to load module details"));
    } else {
      setTitle("");
      setDescription("");
      setIcon("📚");
      setCustomIcon("");
      setPublishStatus("draft");
      setNqfLevel("None");
      setRequiredForCompletion(true);
      setDripDays(0);
    }
  }, [moduleId, isOpen]);

  if (!isOpen) return null;

  const handleLenaGenerate = async () => {
    if (!title.trim()) {
      toast.error("Please enter a module name first!");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `Write a student-facing module description for a module called: ${title}. Keep it 2-3 sentences. Friendly, motivating tone.`
        })
      });
      
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else if (result.text) {
        setDescription(result.text);
        toast.success("LENA AI description generated!");
      }
    } catch {
      toast.error("Failed to generate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Module name is required");
      return;
    }
    if (!workspaceId) {
      toast.error("No active workspace found");
      return;
    }

    setIsSaving(true);
    const finalIcon = icon === "custom" ? customIcon : icon;

    try {
      const url = moduleId ? `/api/lms/modules?id=${moduleId}` : "/api/lms/modules";
      const method = moduleId ? "PATCH" : "POST";
      const bodyPayload = moduleId 
        ? { title, description, icon: finalIcon, publish_status: publishStatus, nqf_level: nqfLevel, required_for_completion: requiredForCompletion, drip_days: dripDays }
        : { course_id: courseId, workspace_id: workspaceId, title, description, icon: finalIcon, publish_status: publishStatus, nqf_level: nqfLevel, required_for_completion: requiredForCompletion, drip_days: dripDays };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyPayload)
      });

      const resData = await res.json();
      if (resData.error) {
        toast.error(resData.error);
      } else {
        toast.success(moduleId ? "Module updated successfully!" : "Module created successfully!");
        onSaved();
        onClose();
      }
    } catch {
      toast.error("Failed to save module");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#04091a]/75 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-[#080f28] border border-[rgba(255,255,255,0.07)] rounded-xl w-full max-w-lg max-h-[85vh] overflow-y-auto shadow-2xl relative flex flex-col text-white">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(255,255,255,0.07)]">
          <h2 className="text-base font-semibold font-space-grotesk uppercase tracking-wide">
            {moduleId ? "Edit Module" : "Create Module"}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
          {/* Module Name */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Module Name</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Advanced Invoicing"
              className="w-full bg-[#111d47] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2563eb] transition-all"
              required
            />
          </div>

          {/* Icon Selection */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50 block">Module Icon</label>
            <div className="flex flex-wrap gap-2 items-center">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => { setIcon(emoji); setCustomIcon(""); }}
                  className={`w-9 h-9 rounded-lg border text-lg flex items-center justify-center transition-all ${
                    icon === emoji ? "border-[#2563eb] bg-[rgba(37,99,235,0.14)]" : "border-[rgba(255,255,255,0.07)] bg-white/5 hover:bg-white/10"
                  }`}
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setIcon("custom")}
                className={`px-3 h-9 rounded-lg border text-xs transition-all ${
                  icon === "custom" ? "border-[#2563eb] bg-[rgba(37,99,235,0.14)]" : "border-[rgba(255,255,255,0.07)] bg-white/5 hover:bg-white/10"
                }`}
              >
                Custom Emoji
              </button>
              {icon === "custom" && (
                <input
                  type="text"
                  value={customIcon}
                  onChange={(e) => setCustomIcon(e.target.value)}
                  placeholder="Paste emoji"
                  className="w-16 bg-[#111d47] border border-[rgba(255,255,255,0.07)] rounded-lg px-2 py-1.5 text-sm outline-none text-center"
                  maxLength={4}
                />
              )}
            </div>
          </div>

          {/* Status & NQF Level */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Publish Status</label>
              <select
                value={publishStatus}
                onChange={(e) => setPublishStatus(e.target.value as any)}
                className="w-full bg-[#111d47] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#2563eb]"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="coming_soon">Coming Soon</option>
              </select>
            </div>
            
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50">NQF Level</label>
              <select
                value={nqfLevel}
                onChange={(e) => setNqfLevel(e.target.value)}
                className="w-full bg-[#111d47] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#2563eb]"
              >
                {NQF_LEVELS.map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Drip Days & Completion Checkbox */}
          <div className="grid grid-cols-2 gap-4 items-center bg-white/5 p-3 rounded-lg border border-[rgba(255,255,255,0.07)]">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Drip Days</label>
              <input
                type="number"
                value={dripDays}
                onChange={(e) => setDripDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-[#111d47] border border-[rgba(255,255,255,0.07)] rounded-lg px-2.5 py-1 text-xs outline-none"
                min={0}
              />
              <span className="text-[9px] text-white/40 block leading-tight">0 = available immediately</span>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required_for_completion"
                checked={requiredForCompletion}
                onChange={(e) => setRequiredForCompletion(e.target.checked)}
                className="rounded border-[rgba(255,255,255,0.07)] text-[#2563eb] accent-[#2563eb]"
              />
              <label htmlFor="required_for_completion" className="text-xs font-semibold text-white/80 cursor-pointer">
                Required for Completion
              </label>
            </div>
          </div>

          {/* LENA AI Description Generator Block */}
          <div className="bg-[rgba(99,102,241,0.06)] border border-[rgba(99,102,241,0.15)] rounded-xl p-4 mt-4 space-y-1">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-xs font-bold text-white">✨ Generate description with LENA</h4>
                <p className="text-[10px] text-white/60">Generate a student-facing description based on the module name</p>
              </div>
              <button
                type="button"
                onClick={handleLenaGenerate}
                disabled={isGenerating}
                className="text-[10px] font-bold text-[#3b82f6] hover:text-white transition-colors bg-[#2563eb]/10 border border-[#2563eb]/20 rounded-md px-2 py-1 flex items-center gap-1 disabled:opacity-50"
              >
                {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                Generate with AI
              </button>
            </div>
          </div>

          {/* Description Textarea */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-white/50">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed module curriculum overview..."
              rows={3}
              className="w-full bg-[#111d47] border border-[rgba(255,255,255,0.07)] rounded-lg px-3 py-2 text-xs outline-none focus:border-[#2563eb] font-mono leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[rgba(255,255,255,0.07)]">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-lg text-white/60 hover:bg-white/5 uppercase tracking-wider text-[10px] font-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded-lg uppercase tracking-wider text-[10px] font-black px-5 shadow-lg shadow-primary/20"
            >
              {isSaving ? <Loader2 size={14} className="animate-spin mr-2" /> : "Save Module"}
            </Button>
          </div>

        </form>
      </div>
    </div>
  );
}
