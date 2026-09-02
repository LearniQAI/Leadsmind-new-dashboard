"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import CertificateDesignForm from "./CertificateDesignForm";
import type { CertificateConfig } from "../../../../../libs/services/src/pdf/cert-templates";

interface Props {
  course: any;
  onSaved: (course: any) => void;
}

/**
 * Per-course certificate design. Thin wrapper around the shared CertificateDesignForm —
 * writes `courses.certificate_config` (the per-course override). Revert clears it so the
 * course falls back to the workspace default (set in the global Certificates → Design tab).
 */
export default function CourseCertificateForm({ course, onSaved }: Props) {
  const router = useRouter();
  const usingWorkspaceDefault = !course?.certificate_config;

  const save = async (payload: CertificateConfig | null) => {
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
  };

  return (
    <CertificateDesignForm
      initialConfig={(course?.certificate_config as CertificateConfig) || {}}
      onSave={save}
      header={{
        eyebrow: "Certificate",
        title: "Certificate design",
        description: usingWorkspaceDefault
          ? "This course inherits the workspace default. Save below to give it its own design."
          : "This course has its own certificate design.",
      }}
      revert={{ label: "Use workspace default", show: !usingWorkspaceDefault }}
    />
  );
}
