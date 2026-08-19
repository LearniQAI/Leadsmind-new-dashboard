import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import RevenueForecastClient from './RevenueForecastClient';

export default function RevenueForecastPage() {
  return (
    <MetaData pageTitle="Revenue Forecast">
      <Wrapper>
        <div className="p-6 max-w-6xl mx-auto min-h-[calc(100vh-80px)]">
          <RevenueForecastClient />
        </div>
      </Wrapper>
    </MetaData>
  );
}
