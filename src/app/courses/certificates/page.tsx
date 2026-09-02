import React from "react";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import CertificatesClient from "./CertificatesClient";
import { getAdminCertificates, getWorkspaceCertificateConfig } from "@/app/actions/lms/certificates";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const [res, wsRes] = await Promise.all([getAdminCertificates(), getWorkspaceCertificateConfig()]);
  const certificates = res.success && Array.isArray(res.data) ? res.data : [];
  const workspaceConfig = wsRes.success ? (wsRes.data as any) : null;

  return (
    <MetaData pageTitle="Course Certificates">
      <Wrapper>
        <div className="mx-auto min-h-[calc(100vh-80px)] max-w-6xl p-6 font-body">
          <CertificatesClient certificates={certificates} workspaceConfig={workspaceConfig} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
