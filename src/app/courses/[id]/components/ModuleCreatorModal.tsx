"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Sparkles, X } from "lucide-react";

interface ModuleCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (moduleData: any) => Promise<void>;
  editingModule?: any;
}

const ICON_MATRIX = [
  "fa-solid fa-book",
  "fa-solid fa-graduation-cap",
  "fa-solid fa-microscope",
  "fa-solid fa-laptop-code",
  "fa-solid fa-lightbulb",
  "fa-solid fa-palette",
  "fa-solid fa-rocket",
  "fa-solid fa-key",
  "fa-solid fa-chart-simple",
  "fa-solid fa-screwdriver-wrench",
  "fa-solid fa-dna",
  "fa-solid fa-brain",
  "fa-solid fa-earth-africa",
  "fa-solid fa-scale-balanced",
  "fa-solid fa-pen-clip",
  "fa-solid fa-bullhorn"
];

const NQF_LEVELS = [
  "Not Specified",
  "NQF Level 1 (General Certificate)",
  "NQF Level 2 (Elementary Certificate)",
  "NQF Level 3 (Intermediate Certificate)",
  "NQF Level 4 (National Senior Certificate)",
  "NQF Level 5 (Higher Certificate)",
  "NQF Level 6 (Diploma/Advanced Certificate)",
  "NQF Level 7 (Bachelor's Degree/Advanced Diploma)",
  "NQF Level 8 (Honours Degree/Postgraduate Diploma)",
  "NQF Level 9 (Master's Degree)",
  "NQF Level 10 (Doctoral Degree)"
];

export default function ModuleCreatorModal({
  isOpen,
  onClose,
  onSave,
  editingModule
}: ModuleCreatorModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [iconEmoji, setIconEmoji] = useState<string | null>("fa-solid fa-book");
  const [publishStatus, setPublishStatus] = useState<"Draft" | "Published" | "Coming Soon">("Draft");
  const [nqfLevel, setNqfLevel] = useState("Not Specified");
  const [isRequired, setIsRequired] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (editingModule) {
      setName(editingModule.name || "");
      setDescription(editingModule.description || "");
      setIconEmoji(editingModule.icon_emoji || "fa-solid fa-book");
      setPublishStatus(editingModule.publish_status || "Draft");
      setNqfLevel(editingModule.nqf_level || "Not Specified");
      setIsRequired(editingModule.is_required_for_completion || false);
    } else {
      setName("");
      setDescription("");
      setIconEmoji("fa-solid fa-book");
      setPublishStatus("Draft");
      setNqfLevel("Not Specified");
      setIsRequired(false);
    }
  }, [editingModule, isOpen]);

  if (!isOpen) return null;

  const handleLenaGenerate = async () => {
    if (!name || name.trim() === "") {
      toast.error("Please enter a module name first so LENA has context!");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-module-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moduleName: name,
          nqfLevel,
          lessons: editingModule?.lessons || []
        })
      });
      
      const result = await res.json();
      if (result.error) {
        toast.error(result.error);
      } else if (result.text) {
        // Simple typing effect simulation
        const text = result.text;
        setDescription("");
        let currentText = "";
        let i = 0;
        const interval = setInterval(() => {
          if (i < text.length) {
            currentText += text[i];
            setDescription(currentText);
            i += 5; // Speed up appending
          } else {
            setDescription(text);
            clearInterval(interval);
            toast.success("LENA AI description generated!");
          }
        }, 15);
      }
    } catch (error) {
      toast.error("Failed to generate description");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || name.trim() === "") {
      toast.error("Module name is required");
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingModule?.id,
        name,
        description,
        icon_emoji: iconEmoji,
        publish_status: publishStatus,
        nqf_level: nqfLevel,
        is_required_for_completion: isRequired
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save module");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#04091a]/85 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
      <div className="bg-[#080f28] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl relative flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-bottom border-white/5">
          <div className="flex items-center gap-2">
            <span className="text-xl w-6 h-6 flex items-center justify-center text-accent2 shrink-0">
              {iconEmoji && iconEmoji.startsWith("fa-") ? (
                <i className={iconEmoji}></i>
              ) : (
                iconEmoji || "📚"
              )}
            </span>
            <h2 className="text-lg font-space-grotesk font-bold text-white uppercase tracking-tight">
              {editingModule ? "Edit Module Node" : "Create Module Node"}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="text-white/40 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1">
          {/* Module Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
              Module Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Advanced Invoicing Integrations"
              className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-body"
              required
            />
          </div>

          {/* Icon Picker Matrix */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
              Select Module Icon
            </label>
            <div className="grid grid-cols-8 gap-2 bg-[#111d47]/50 border border-white/5 rounded-xl p-3">
              {ICON_MATRIX.map((iconClass) => (
                <button
                  key={iconClass}
                  type="button"
                  onClick={() => setIconEmoji(iconClass)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-base text-t2 hover:bg-white/5 transition-all active:scale-95 ${
                    iconEmoji === iconClass ? "bg-primary border border-primary-light text-white" : "border border-transparent"
                  }`}
                >
                  <i className={iconClass}></i>
                </button>
              ))}
            </div>
          </div>

          {/* NQF Level Dropdown & Status Picker */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                NQF Level
              </label>
              <select
                value={nqfLevel}
                onChange={(e) => setNqfLevel(e.target.value)}
                className="w-full bg-[#111d47] border border-white/10 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-primary transition-all font-body appearance-none"
              >
                {NQF_LEVELS.map((lvl) => (
                  <option key={lvl} value={lvl} className="bg-[#080f28]">
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                Publish Status
              </label>
              <select
                value={publishStatus}
                onChange={(e) => setPublishStatus(e.target.value as any)}
                className="w-full bg-[#111d47] border border-white/10 rounded-xl px-3 py-3 text-xs text-white outline-none focus:border-primary transition-all font-body appearance-none"
              >
                <option value="Draft" className="bg-[#080f28]">Draft</option>
                <option value="Published" className="bg-[#080f28]">Published</option>
                <option value="Coming Soon" className="bg-[#080f28]">Coming Soon</option>
              </select>
            </div>
          </div>

          {/* Required for Completion Switch */}
          <div className="flex items-center justify-between bg-[#111d47]/30 border border-white/5 rounded-xl p-4">
            <div>
              <span className="text-xs font-bold text-white block">Required for Course Completion</span>
              <span className="text-[10px] text-white/40 block mt-0.5">Students must finish this module to unlock certificates</span>
            </div>
            <Switch
              checked={isRequired}
              onCheckedChange={setIsRequired}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Description Block & LENA Widget */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 block">
                Description
              </label>
              <button
                type="button"
                onClick={handleLenaGenerate}
                disabled={isGenerating}
                className="text-[10px] font-bold text-primary flex items-center gap-1 hover:text-primary-light transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={12} className="animate-spin" /> Customising Context...
                  </>
                ) : (
                  <>
                    <Sparkles size={12} /> Generate description with LENA
                  </>
                )}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed module curriculum overview..."
              rows={4}
              className="w-full bg-[#111d47] border border-white/10 rounded-xl px-4 py-3 text-xs text-white placeholder:text-white/20 outline-none focus:border-primary transition-all font-mono leading-relaxed"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-top border-white/5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSaving}
              className="h-11 rounded-xl text-white/60 hover:bg-white/5 uppercase tracking-wider text-[10px] font-black"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="h-11 bg-primary hover:bg-primary/90 text-white rounded-xl uppercase tracking-wider text-[10px] font-black px-6 shadow-lg shadow-primary/20"
            >
              {isSaving ? (
                <>
                  <Loader2 size={14} className="animate-spin mr-2" /> Saving...
                </>
              ) : (
                "Save Module Node"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
