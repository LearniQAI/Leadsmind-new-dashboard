import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import CertificatesClient from './CertificatesClient';

export default function CertificatesPage() {
  // Static for now as certificates aren't in the actions yet, but ready for data
  const certificates: any[] = []; 

  return (
    <MetaData pageTitle="Course Certificates">
      <Wrapper>
        <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
          <CertificatesClient certificates={certificates} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
