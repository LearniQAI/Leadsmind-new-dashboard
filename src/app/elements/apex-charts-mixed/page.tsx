import ApexChartMixedMainArea from '@/components/elements/charts/apex-chart-mixed/ApexChartMixedMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartMixedMain = () => {
    return (
        <>
             <MetaData pageTitle="Mixed">
                <Wrapper>
                    <ApexChartMixedMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartMixedMain;