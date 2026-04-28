
import ApexChartColumnArea from '@/components/elements/charts/apex-charts-column/ApexChartColumnArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartColumnMain = () => {
    return (
        <>
            <MetaData pageTitle="Column">
                <Wrapper>
                    <ApexChartColumnArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartColumnMain;