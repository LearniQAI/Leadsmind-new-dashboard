import ApexChartLineMainArea from '@/components/elements/charts/apex-charts-line/ApexChartLineMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartLineMain = () => {
    return (
        <>
             <MetaData pageTitle="Line">
                <Wrapper>
                    <ApexChartLineMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartLineMain;