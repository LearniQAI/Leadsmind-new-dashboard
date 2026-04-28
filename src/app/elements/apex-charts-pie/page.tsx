import ApexChartPieMainArea from '@/components/elements/charts/apex-charts-pie/ApexChartPieMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartPieMain = () => {
    return (
        <>
             <MetaData pageTitle="Pie">
                <Wrapper>
                    <ApexChartPieMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartPieMain;