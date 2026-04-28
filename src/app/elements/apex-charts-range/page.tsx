
import ApexChartRangeMainArea from '@/components/elements/charts/apex-charts-range/ApexChartRangeMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartRangeMain = () => {
    return (
        <>
             <MetaData pageTitle="Range">
                <Wrapper>
                    <ApexChartRangeMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartRangeMain;