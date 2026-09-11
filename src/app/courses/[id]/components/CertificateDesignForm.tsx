"use client";

import React, { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Upload, Loader2, RotateCcw, Check, X, Plus, GripVertical } from "lucide-react";
import {
  renderCertificateHtml,
  CERT_TEMPLATE_META,
  CERT_SAMPLE_DATA,
  type CertificateConfig,
  type CertificateTemplateId,
  type CertificatePlacement,
} from "../../../../../libs/services/src/pdf/cert-templates";
import {
  SettingsPanel,
  SettingsHeader,
  SettingsBody,
  SettingsFooter,
  Field,
  TextInput,
  PrimaryButton,
  GhostButton,
  SectionLabel,
} from "./settings/primitives";

/* Scaled, non-interactive render of the REAL template HTML (same module the PDF route uses). */
function CertPreview({ config, className }: { config: CertificateConfig; className?: string }) {
  const html = useMemo(() => renderCertificateHtml(CERT_SAMPLE_DATA, config), [config]);
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.25);

  React.useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const apply = () => setScale(host.clientWidth / 1122 || 0.25);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={hostRef}
      className={`relative w-full overflow-hidden rounded-xl border border-dash-border bg-white ${className || ""}`}
      style={{ aspectRatio: "297 / 210" }}
    >
      <iframe
        title="Certificate preview"
        srcDoc={html}
        scrolling="no"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: 1122, height: 794, transform: `scale(${scale})` }}
      />
    </div>
  );
}

type CustomFieldKey = "studentName" | "courseTitle" | "completionDate" | "validationId";
type CustomPlacements = Partial<Record<CustomFieldKey, CertificatePlacement>>;

const CUSTOM_FIELD_META: { key: CustomFieldKey; label: string; sample: string; default: CertificatePlacement }[] = [
  { key: "studentName", label: "Student name", sample: CERT_SAMPLE_DATA.studentName, default: { xPct: 50, yPct: 45, fontSize: 36, color: "#1a1a1a", align: "center", bold: true } },
  { key: "courseTitle", label: "Course title", sample: CERT_SAMPLE_DATA.courseTitle, default: { xPct: 50, yPct: 58, fontSize: 20, color: "#333333", align: "center" } },
  { key: "completionDate", label: "Completion date", sample: CERT_SAMPLE_DATA.completionDate, default: { xPct: 15, yPct: 85, fontSize: 12, color: "#555555", align: "left" } },
  { key: "validationId", label: "Validation ID", sample: CERT_SAMPLE_DATA.validationId, default: { xPct: 85, yPct: 85, fontSize: 10, color: "#888888", align: "right" } },
];

/**
 * Real drag-and-drop field-placement editor for "upload your own design" mode. Each placed
 * field is dragged directly on top of the admin's own uploaded background image (a real
 * <img>, not a mock canvas) and its xPct/yPct is derived from the pointer position relative
 * to the image's own bounding box, so it matches exactly how `customUpload()` in
 * cert-templates.ts positions the field at render time (position:absolute + left/top %).
 */
function CustomUploadEditor({
  imageUrl,
  placements,
  onChange,
}: {
  imageUrl: string;
  placements: CustomPlacements;
  onChange: (next: CustomPlacements) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const draggingKey = useRef<CustomFieldKey | null>(null);

  const setPlacement = (key: CustomFieldKey, patch: Partial<CertificatePlacement>) => {
    const current = placements[key];
    if (!current) return;
    onChange({ ...placements, [key]: { ...current, ...patch } });
  };

  const pointToPct = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const xPct = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const yPct = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    return { xPct: Math.round(xPct * 10) / 10, yPct: Math.round(yPct * 10) / 10 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const key = draggingKey.current;
    if (!key) return;
    const pt = pointToPct(e.clientX, e.clientY);
    if (!pt) return;
    setPlacement(key, pt);
  };

  const stopDragging = () => {
    draggingKey.current = null;
  };

  const addField = (key: CustomFieldKey) => {
    const meta = CUSTOM_FIELD_META.find((f) => f.key === key)!;
    onChange({ ...placements, [key]: { ...meta.default } });
  };

  const removeField = (key: CustomFieldKey) => {
    const next = { ...placements };
    delete next[key];
    onChange(next);
  };

  const placedKeys = CUSTOM_FIELD_META.filter((f) => placements[f.key]);
  const unplacedKeys = CUSTOM_FIELD_META.filter((f) => !placements[f.key]);

  return (
    <div className="space-y-3">
      <div
        ref={stageRef}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerLeave={stopDragging}
        className="relative w-full select-none overflow-hidden rounded-xl border border-dash-border bg-dash-surface"
        style={{ aspectRatio: "297 / 210" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-contain" />
        {placedKeys.map(({ key, label, sample }) => {
          const p = placements[key]!;
          return (
            <div
              key={key}
              onPointerDown={(e) => {
                e.preventDefault();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                draggingKey.current = key;
              }}
              className="absolute cursor-grab touch-none rounded border border-dashed border-sky-500/70 bg-sky-500/10 px-1.5 py-0.5 active:cursor-grabbing"
              style={{
                left: `${p.xPct}%`,
                top: `${p.yPct}%`,
                transform:
                  p.align === "center" ? "translate(-50%,-50%)" : p.align === "right" ? "translate(-100%,-50%)" : "translate(0,-50%)",
                fontSize: Math.max(9, p.fontSize * 0.35),
                color: p.color,
                fontWeight: p.bold ? 700 : 400,
                textAlign: p.align,
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                lineHeight: 1.2,
              }}
              title={`Drag to reposition — ${label}`}
            >
              <GripVertical className="pointer-events-none absolute -left-4 top-1/2 size-3 -translate-y-1/2 text-sky-500" />
              {sample}
            </div>
          );
        })}
      </div>
      <p className="text-[11px] !text-dash-textMuted">
        Drag a field directly on the image to reposition it. Long real values are kept from
        overlapping the field below them automatically when the certificate is generated.
      </p>

      {unplacedKeys.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {unplacedKeys.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => addField(f.key)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-dash-border bg-white px-2.5 py-1.5 text-[11px] font-semibold !text-dash-text hover:bg-dash-surface"
            >
              <Plus className="size-3.5" /> Add {f.label}
            </button>
          ))}
        </div>
      )}

      {placedKeys.length > 0 && (
        <div className="space-y-2">
          {placedKeys.map(({ key, label }) => {
            const p = placements[key]!;
            return (
              <div key={key} className="flex flex-wrap items-center gap-2 rounded-lg border border-dash-border bg-white p-2.5">
                <span className="w-32 shrink-0 text-[11px] font-semibold !text-dash-text">{label}</span>
                <input
                  type="number"
                  min={8}
                  max={80}
                  value={p.fontSize}
                  onChange={(e) => setPlacement(key, { fontSize: Number(e.target.value) || p.fontSize })}
                  className="h-8 w-16 rounded-md border border-dash-border px-2 text-[12px]"
                  title="Font size (px)"
                />
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(p.color) ? p.color : "#000000"}
                  onChange={(e) => setPlacement(key, { color: e.target.value })}
                  className="h-8 w-8 cursor-pointer rounded-md border border-dash-border p-0.5"
                  title="Text colour"
                />
                <div className="flex overflow-hidden rounded-md border border-dash-border">
                  {(["left", "center", "right"] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setPlacement(key, { align: a })}
                      className={`px-2 py-1.5 text-[10px] font-semibold uppercase ${
                        p.align === a ? "bg-sky-500 text-white" : "bg-white !text-dash-textMuted hover:bg-dash-surface"
                      }`}
                    >
                      {a[0]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPlacement(key, { bold: !p.bold })}
                  className={`rounded-md border border-dash-border px-2 py-1.5 text-[10px] font-black ${
                    p.bold ? "bg-sky-500 text-white" : "bg-white !text-dash-textMuted hover:bg-dash-surface"
                  }`}
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => removeField(key)}
                  className="ml-auto inline-flex items-center gap-1 text-[11px] font-medium !text-dash-textMuted hover:!text-red"
                >
                  <X className="size-3.5" /> Remove
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export interface CertificateDesignFormProps {
  initialConfig: CertificateConfig;
  /** Persist. `null` = clear this scope's own record (revert to the fallback). Should throw
   *  on failure; the form shows a toast + keeps the user's edits. */
  onSave: (config: CertificateConfig | null) => Promise<void>;
  header: { eyebrow: string; title: string; description: string };
  /** When present + `show`, renders a revert button that calls onSave(null). */
  revert?: { label: string; show: boolean };
  saveLabel?: string;
}

/**
 * Shared certificate template picker + branding editor. Used BOTH by the per-course settings
 * page (writes courses.certificate_config) and the global Certificates → Design tab (writes
 * workspaces.certificate_config). Rendering here is a real <iframe srcDoc> of the exact
 * template module the PDF route uses — never a mock.
 */
export default function CertificateDesignForm({
  initialConfig,
  onSave,
  header,
  revert,
  saveLabel = "Save certificate design",
}: CertificateDesignFormProps) {
  const [template, setTemplate] = useState<CertificateTemplateId>(initialConfig.template || "classic");
  const [accentColor, setAccentColor] = useState<string>(
    initialConfig.accentColor ||
      CERT_TEMPLATE_META.find((t) => t.id === (initialConfig.template || "classic"))!.defaultAccent
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(initialConfig.logoUrl || null);
  const [signatureName, setSignatureName] = useState(initialConfig.signatureName || "");
  const [signatureTitle, setSignatureTitle] = useState(initialConfig.signatureTitle || "");
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(
    initialConfig.signatureImageUrl || null
  );
  const [uploading, setUploading] = useState<"logo" | "sig" | "bg" | null>(null);
  const [saving, setSaving] = useState(false);

  // Part 3 — "upload your own design" mode. Independent of `template`: when it's on,
  // customUpload.imageUrl supersedes the built-in template at render time (see
  // renderCertificateHtml in cert-templates.ts), matching how it was already implemented
  // in the rendering engine — this form previously had no UI to ever set it.
  const [customMode, setCustomMode] = useState<boolean>(!!initialConfig.customUpload?.imageUrl);
  const [customImageUrl, setCustomImageUrl] = useState<string | null>(initialConfig.customUpload?.imageUrl || null);
  const [customPlacements, setCustomPlacements] = useState<CustomPlacements>(
    initialConfig.customUpload?.placements || {}
  );

  const config: CertificateConfig = useMemo(
    () => ({
      template,
      accentColor,
      logoUrl,
      signatureName: signatureName.trim() || null,
      signatureTitle: signatureTitle.trim() || null,
      signatureImageUrl,
      customUpload: customMode && customImageUrl ? { imageUrl: customImageUrl, placements: customPlacements } : null,
    }),
    [template, accentColor, logoUrl, signatureName, signatureTitle, signatureImageUrl, customMode, customImageUrl, customPlacements]
  );

  const upload = async (file: File, kind: "logo" | "sig" | "bg") => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("pathPrefix", `certificates/${kind === "logo" ? "logo" : kind === "sig" ? "signature" : "background"}`);
      const res = await fetch("/api/lms/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error || !data.url) throw new Error(data.error || "Upload failed");
      if (kind === "logo") setLogoUrl(data.url);
      else if (kind === "sig") setSignatureImageUrl(data.url);
      else setCustomImageUrl(data.url);
      toast.success(`${kind === "logo" ? "Logo" : kind === "sig" ? "Signature" : "Background"} uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const persist = async (payload: CertificateConfig | null) => {
    setSaving(true);
    try {
      await onSave(payload);
    } catch (e: any) {
      toast.error(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPanel>
      <SettingsHeader eyebrow={header.eyebrow} title={header.title} description={header.description} />
      <SettingsBody>
        <div className="space-y-6">
          {/* Mode: built-in template vs. upload your own design */}
          <div>
            <SectionLabel>Design source</SectionLabel>
            <div className="mt-3 flex overflow-hidden rounded-xl border border-dash-border w-fit">
              <button
                type="button"
                onClick={() => setCustomMode(false)}
                className={`px-4 py-2 text-[12px] font-semibold transition-colors ${
                  !customMode ? "bg-sky-500 text-white" : "bg-white !text-dash-textMuted hover:bg-dash-surface"
                }`}
              >
                Choose a template
              </button>
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                className={`px-4 py-2 text-[12px] font-semibold transition-colors ${
                  customMode ? "bg-sky-500 text-white" : "bg-white !text-dash-textMuted hover:bg-dash-surface"
                }`}
              >
                Upload your own design
              </button>
            </div>
          </div>

          {customMode ? (
            <div>
              <SectionLabel>Your certificate background</SectionLabel>
              <p className="mt-0.5 text-[11px] !text-dash-textMuted">
                Upload an image of your certificate design, then place the student name, course
                title, completion date, and validation ID directly on it.
              </p>
              {customImageUrl ? (
                <div className="mt-3 space-y-3">
                  <CustomUploadEditor imageUrl={customImageUrl} placements={customPlacements} onChange={setCustomPlacements} />
                  <div className="flex items-center gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3 py-1.5 text-[12px] font-semibold !text-dash-text hover:bg-dash-surface">
                      {uploading === "bg" ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                      Replace background
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "bg")}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCustomImageUrl(null);
                        setCustomPlacements({});
                      }}
                      className="text-[12px] font-medium !text-dash-textMuted hover:!text-red"
                    >
                      Remove background
                    </button>
                  </div>
                </div>
              ) : (
                <label className="mt-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-dash-border bg-dash-surface/40 p-10 text-center hover:border-sky-400">
                  {uploading === "bg" ? (
                    <Loader2 className="size-6 animate-spin !text-dash-textMuted" />
                  ) : (
                    <Upload className="size-6 !text-dash-textMuted" />
                  )}
                  <span className="text-[13px] font-semibold !text-dash-text">Upload a background image</span>
                  <span className="text-[11px] !text-dash-textMuted">PNG or JPG, landscape orientation works best</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "bg")}
                  />
                </label>
              )}
            </div>
          ) : (
            <>
              {/* Template picker */}
              <div>
                <SectionLabel>Template</SectionLabel>
                <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {CERT_TEMPLATE_META.map((t) => {
                    const selected = template === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setTemplate(t.id);
                          const isDefaultAccent = CERT_TEMPLATE_META.some(
                            (m) => m.defaultAccent.toLowerCase() === accentColor.toLowerCase()
                          );
                          if (isDefaultAccent) setAccentColor(t.defaultAccent);
                        }}
                        className={`group rounded-2xl border p-2 text-left transition-all ${
                          selected
                            ? "border-sky-500 ring-2 ring-sky-500/20"
                            : "border-dash-border hover:border-sky-300"
                        }`}
                      >
                        <CertPreview config={{ ...config, template: t.id }} />
                        <div className="flex items-center justify-between px-1 pt-2">
                          <span className="text-[12px] font-semibold !text-dash-text">{t.name}</span>
                          {selected && (
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-white">
                              <Check className="size-3" />
                            </span>
                          )}
                        </div>
                        <p className="px-1 pt-0.5 text-[11px] leading-snug !text-dash-textMuted">
                          {t.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Branding */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Field label="Accent colour" hint="Used for borders, rules and the accent panel.">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={/^#[0-9a-f]{6}$/i.test(accentColor) ? accentColor : "#1359ff"}
                  onChange={(e) => setAccentColor(e.target.value)}
                  className="h-9 w-12 shrink-0 cursor-pointer rounded-md border border-dash-border bg-white p-1"
                />
                <TextInput
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value)}
                  placeholder="#1359FF"
                />
              </div>
            </Field>

            <Field label="Workspace logo" hint="Appears in the template's logo slot. PNG with transparency works best.">
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoUrl} alt="" className="h-9 max-w-[120px] object-contain" />
                ) : (
                  <span className="text-[12px] !text-dash-textMuted">No logo</span>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3 py-1.5 text-[12px] font-semibold !text-dash-text hover:bg-dash-surface">
                  {uploading === "logo" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  {logoUrl ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "logo")}
                  />
                </label>
                {logoUrl && (
                  <button
                    type="button"
                    onClick={() => setLogoUrl(null)}
                    className="text-[12px] font-medium !text-dash-textMuted hover:!text-red"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>

            <Field label="Signature name" hint="Left blank hides the signature block.">
              <TextInput
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="e.g. Dr. Jane Smith"
              />
            </Field>
            <Field label="Signature title">
              <TextInput
                value={signatureTitle}
                onChange={(e) => setSignatureTitle(e.target.value)}
                placeholder="e.g. Head of School"
              />
            </Field>

            <Field label="Signature image" hint="Optional — a scan/PNG of a handwritten signature.">
              <div className="flex items-center gap-3">
                {signatureImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signatureImageUrl} alt="" className="h-9 max-w-[120px] object-contain" />
                ) : (
                  <span className="text-[12px] !text-dash-textMuted">None</span>
                )}
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-dash-border bg-white px-3 py-1.5 text-[12px] font-semibold !text-dash-text hover:bg-dash-surface">
                  {uploading === "sig" ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  {signatureImageUrl ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && upload(e.target.files[0], "sig")}
                  />
                </label>
                {signatureImageUrl && (
                  <button
                    type="button"
                    onClick={() => setSignatureImageUrl(null)}
                    className="text-[12px] font-medium !text-dash-textMuted hover:!text-red"
                  >
                    Remove
                  </button>
                )}
              </div>
            </Field>
              </div>
            </>
          )}

          {/* Live preview */}
          <div>
            <SectionLabel>Live preview</SectionLabel>
            <p className="mt-0.5 text-[11px] !text-dash-textMuted">
              Sample data shown. A real certificate uses the student&apos;s frozen name, the course
              title and the issued date.
            </p>
            <div className="mt-3 rounded-2xl border border-dash-border bg-dash-surface/40 p-4">
              <CertPreview config={config} className="mx-auto max-w-3xl shadow-sm" />
            </div>
          </div>
        </div>
      </SettingsBody>
      <SettingsFooter>
        {revert?.show && (
          <GhostButton onClick={() => persist(null)} disabled={saving}>
            <RotateCcw className="size-3.5" /> {revert.label}
          </GhostButton>
        )}
        <PrimaryButton onClick={() => persist(config)} loading={saving} disabled={!!uploading}>
          {saveLabel}
        </PrimaryButton>
      </SettingsFooter>
    </SettingsPanel>
  );
}
