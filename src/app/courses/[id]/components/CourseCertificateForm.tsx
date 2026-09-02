"use client";

import React, { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Loader2, RotateCcw, Check } from "lucide-react";
import {
  renderCertificateHtml,
  CERT_TEMPLATE_META,
  CERT_SAMPLE_DATA,
  type CertificateConfig,
  type CertificateTemplateId,
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

interface Props {
  course: any;
  onSaved: (course: any) => void;
}

export default function CourseCertificateForm({ course, onSaved }: Props) {
  const router = useRouter();
  const initial: CertificateConfig = (course?.certificate_config as CertificateConfig) || {};
  const usingWorkspaceDefault = !course?.certificate_config;

  const [template, setTemplate] = useState<CertificateTemplateId>(initial.template || "classic");
  const [accentColor, setAccentColor] = useState<string>(
    initial.accentColor ||
      CERT_TEMPLATE_META.find((t) => t.id === (initial.template || "classic"))!.defaultAccent
  );
  const [logoUrl, setLogoUrl] = useState<string | null>(initial.logoUrl || null);
  const [signatureName, setSignatureName] = useState(initial.signatureName || "");
  const [signatureTitle, setSignatureTitle] = useState(initial.signatureTitle || "");
  const [signatureImageUrl, setSignatureImageUrl] = useState<string | null>(
    initial.signatureImageUrl || null
  );
  const [uploading, setUploading] = useState<"logo" | "sig" | null>(null);
  const [saving, setSaving] = useState(false);

  const config: CertificateConfig = useMemo(
    () => ({
      template,
      accentColor,
      logoUrl,
      signatureName: signatureName.trim() || null,
      signatureTitle: signatureTitle.trim() || null,
      signatureImageUrl,
    }),
    [template, accentColor, logoUrl, signatureName, signatureTitle, signatureImageUrl]
  );

  const upload = async (file: File, kind: "logo" | "sig") => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("pathPrefix", `certificates/${kind === "logo" ? "logo" : "signature"}`);
      const res = await fetch("/api/lms/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (data.error || !data.url) throw new Error(data.error || "Upload failed");
      if (kind === "logo") setLogoUrl(data.url);
      else setSignatureImageUrl(data.url);
      toast.success(`${kind === "logo" ? "Logo" : "Signature"} uploaded`);
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const save = async (payload: CertificateConfig | null) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/lms/course?id=${course.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificate_config: payload }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(payload ? "Certificate design saved" : "Reverted to workspace default");
      onSaved(data.data);
      router.refresh();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsPanel>
      <SettingsHeader
        eyebrow="Certificate"
        title="Certificate design"
        description={
          usingWorkspaceDefault
            ? "This course inherits the workspace default. Save below to give it its own design."
            : "This course has its own certificate design."
        }
      />
      <SettingsBody>
        <div className="space-y-6">
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
                      // Move the accent to this template's default unless the admin already
                      // picked a custom one that differs from every template default.
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

          {/* Live preview */}
          <div>
            <SectionLabel>Live preview</SectionLabel>
            <p className="mt-0.5 text-[11px] !text-dash-textMuted">
              Sample data shown. A real certificate uses the student's frozen name, the course
              title and the issued date.
            </p>
            <div className="mt-3 rounded-2xl border border-dash-border bg-dash-surface/40 p-4">
              <CertPreview config={config} className="mx-auto max-w-3xl shadow-sm" />
            </div>
          </div>
        </div>
      </SettingsBody>
      <SettingsFooter>
        {!usingWorkspaceDefault && (
          <GhostButton onClick={() => save(null)} disabled={saving}>
            <RotateCcw className="size-3.5" /> Use workspace default
          </GhostButton>
        )}
        <PrimaryButton onClick={() => save(config)} loading={saving} disabled={!!uploading}>
          Save certificate design
        </PrimaryButton>
      </SettingsFooter>
    </SettingsPanel>
  );
}
