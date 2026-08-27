import React from "react";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import CertificatesClient from "./CertificatesClient";
import { getAdminCertificates } from "@/app/actions/lms/certificates";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const res = await getAdminCertificates();
  const certificates = res.success && Array.isArray(res.data) ? res.data : [];

  return (
    <MetaData pageTitle="Course Certificates">
      <Wrapper>
        <div className="mx-auto min-h-[calc(100vh-80px)] max-w-6xl p-6 font-body">
          <CertificatesClient certificates={certificates} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
