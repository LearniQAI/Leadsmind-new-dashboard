import React from 'react';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import CertificatesClient from './CertificatesClient';

export default function CertificatesPage() {
  // Static for now as certificates aren't in the actions yet, but ready for data
  const certificates = []; 

  return (
    <MetaData pageTitle="Academy Certificates">
      <Wrapper>
        <div className="app__slide-wrapper">
          <CertificatesClient certificates={certificates} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
