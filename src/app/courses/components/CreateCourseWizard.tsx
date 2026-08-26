"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookOpen, Loader2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DashModal,
  DashModalContent,
  DashModalHeader,
  DashModalTitle,
  DashModalFooter,
} from "@/components/dashboard-ui/Modal";
import { DashFormField, DashInput } from "@/components/dashboard-ui/FormField";
import { createCourseWithDomain } from "@/app/actions/lms";
import { getDomainsForCurrentWorkspace } from "@/app/actions/domains";
import { updateCourseLandingSettings } from "@/app/actions/courseLanding";
import { COURSE_THEME_LIST } from "@/lib/courses/courseThemeTokens";
import CourseThemeMiniPreview from "./CourseThemeMiniPreview";

// Reuses the exact templates already built for the course landing page (CourseLandingForm.tsx
// / LandingPageRenderer.tsx) — not a second, parallel gallery system. Confirmed these degrade
// gracefully with zero modules/lessons (TemplateCleanMinimal etc. guard curriculum sections on
// `modules.length > 0`), so picking a theme before any module exists is structurally sound.
// One card per REAL existing template (3 today), sourced from the single canonical theme
// token file (Phase F) — not a second, independently-invented color list.
const TEMPLATES = COURSE_THEME_LIST;

interface CreateCourseWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateCourseWizard({ open, onOpenChange, onCreated }: CreateCourseWizardProps) {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [domains, setDomains] = useState<any[]>([]);
  const [domainId, setDomainId] = useState("");
  const [urlPath, setUrlPath] = useState("");
  const [isLoadingDomains, setIsLoadingDomains] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [createdCourseId, setCreatedCourseId] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("clean_minimal");

  const reset = () => {
    setStep(1);
    setTitle("");
    setDomainId("");
    setUrlPath("");
    setCreatedCourseId(null);
    setSelectedTemplate("clean_minimal");
  };

  useEffect(() => {
    if (!open) return;
    setIsLoadingDomains(true);
    getDomainsForCurrentWorkspace()
      .then((res) => {
        if ("data" in res && res.data) {
          // Only domains that have actually finished verification — a course shouldn't point
          // at a domain that isn't live yet.
          setDomains(res.data.filter((d: any) => d.status === "active"));
        } else if ("error" in res && res.error) {
          toast.error(res.error);
        }
      })
      .finally(() => setIsLoadingDomains(false));
  }, [open]);

  const selectedDomain = domains.find((d) => d.id === domainId);
  const previewUrl = selectedDomain ? `${selectedDomain.hostname}/${urlPath || "your-course-slug"}` : null;

  const handleClose = () => {
    onOpenChange(false);
    // If a course was already created (step 2), it exists as a real draft with domain/url
    // set — closing here just leaves theme at its clean_minimal default, it isn't corrupted.
    reset();
  };

  const handleCreateStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    // Phase E, Step 2a: name is the only hard requirement now. Domain/URL are optional —
    // domain_configurations has zero rows workspace-wide today, so requiring them would
    // block every real admin from creating a course at all. If a domain IS selected, its
    // URL path is still required (an address needs both halves) — the action enforces this
    // same rule server-side regardless of what this client-side check does.
    if (!title.trim()) return toast.error("Course name is required");
    if (domainId && !urlPath.trim()) return toast.error("URL path is required when a domain is selected");

    setIsSaving(true);
    try {
      const res = await createCourseWithDomain(title, domainId || null, urlPath || null);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      setCreatedCourseId(res.data.id);
      setStep(2);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinishStep2 = async () => {
    if (!createdCourseId) return;
    setIsSaving(true);
    try {
      const res = await updateCourseLandingSettings(createdCourseId, { template: selectedTemplate });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Course created — add your first module.");
      onCreated();
      handleClose();
      router.push(`/courses/${createdCourseId}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashModal open={open} onOpenChange={(o) => (o ? onOpenChange(true) : handleClose())}>
      <DashModalContent className="max-w-lg">
        <DashModalHeader>
          <DashModalTitle className="flex items-center gap-2">
            <BookOpen size={18} className="text-dash-accent" />
            {step === 1 ? "Create course — Name & URL" : "Create course — Theme"}
          </DashModalTitle>
        </DashModalHeader>

        <div className="flex items-center gap-2 px-1 pb-2">
          <span className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-dash-accent" : "bg-dash-border"}`} />
          <span className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-dash-accent" : "bg-dash-border"}`} />
        </div>

        {step === 1 && (
          <form onSubmit={handleCreateStep1} className="space-y-4">
            <DashFormField label="Course name" htmlFor="cc-title" required>
              <DashInput
                id="cc-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Masterclass in JavaScript"
                required
                autoFocus
              />
            </DashFormField>

            <DashFormField label="Domain (optional)" htmlFor="cc-domain">
              {isLoadingDomains ? (
                <div className="text-[11px] !text-dash-textMuted flex items-center gap-2 py-2">
                  <Loader2 size={12} className="animate-spin" /> Loading connected domains...
                </div>
              ) : domains.length === 0 ? (
                <div className="text-[11px] !text-dash-textMuted py-2 bg-dash-surface border border-dash-border rounded-xl px-3">
                  No verified domains connected yet — skip for now, add one later in Settings once you've connected a domain.
                </div>
              ) : (
                <>
                  <select
                    id="cc-domain"
                    value={domainId}
                    onChange={(e) => setDomainId(e.target.value)}
                    className="w-full bg-white border border-dash-border rounded-xl px-4 py-3 text-xs !text-dash-text outline-none focus:border-primary"
                  >
                    <option value="">Skip for now — add a domain later</option>
                    {domains.map((d) => (
                      <option key={d.id} value={d.id}>{d.hostname}</option>
                    ))}
                  </select>
                </>
              )}
            </DashFormField>

            {domainId && selectedDomain && (
              <DashFormField label="URL path" htmlFor="cc-slug" required>
                <div className="flex items-stretch border border-dash-border rounded-xl overflow-hidden focus-within:border-primary">
                  <span className="bg-dash-surface !text-dash-textMuted text-[10px] font-mono px-3 flex items-center shrink-0 truncate max-w-[45%]">
                    https://{selectedDomain.hostname}/
                  </span>
                  <input
                    id="cc-slug"
                    value={urlPath}
                    onChange={(e) => setUrlPath(e.target.value)}
                    placeholder="tefl-beginner"
                    required
                    className="flex-1 min-w-0 px-3 py-3 text-xs !text-dash-text outline-none"
                  />
                  <span className="flex items-center px-3 !text-dash-textMuted shrink-0">
                    <LinkIcon size={13} />
                  </span>
                </div>
              </DashFormField>
            )}

            {previewUrl && (
              <div className="text-[10px] !text-dash-textMuted font-mono bg-dash-surface border border-dash-border rounded-lg px-3 py-2 truncate">
                Preview: https://{previewUrl}
              </div>
            )}

            <DashModalFooter>
              <Button type="button" variant="ghost" onClick={handleClose} disabled={isSaving} className="h-10 rounded-xl !text-dash-textMuted hover:bg-dash-surface text-[10px] font-bold">
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving || !title.trim()} className="h-10 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-[10px] font-bold px-5 flex items-center gap-1.5">
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : null} Continue to theme
              </Button>
            </DashModalFooter>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[10px] !text-dash-textMuted px-1">
              Choose a theme for this course — each preview below is a real miniature render of
              the student player using that theme's actual colors, not a static image.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                return (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => setSelectedTemplate(tmpl.id)}
                    className={`text-left rounded-xl border-2 overflow-hidden transition-all ${
                      isSelected ? "border-dash-accent shadow-md" : "border-transparent hover:border-dash-border"
                    }`}
                  >
                    <CourseThemeMiniPreview theme={tmpl} selected={isSelected} />
                    <div className="p-2.5 bg-white border-t border-dash-border">
                      <div className="text-[11px] font-bold !text-dash-text">{tmpl.label}</div>
                      <div className="text-[9px] !text-dash-textMuted mt-0.5 leading-relaxed">{tmpl.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <DashModalFooter>
              <Button type="button" variant="ghost" onClick={() => setStep(1)} disabled={isSaving} className="h-10 rounded-xl !text-dash-textMuted hover:bg-dash-surface text-[10px] font-bold">
                Back
              </Button>
              <Button type="button" onClick={handleFinishStep2} disabled={isSaving} className="h-10 bg-dash-accent hover:bg-dash-accent/90 text-white rounded-xl text-[10px] font-bold px-5 flex items-center gap-1.5">
                {isSaving ? <Loader2 size={12} className="animate-spin" /> : null} Create course & add modules
              </Button>
            </DashModalFooter>
          </div>
        )}
      </DashModalContent>
    </DashModal>
  );
}
