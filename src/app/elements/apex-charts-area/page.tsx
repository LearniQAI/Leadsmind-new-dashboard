import ApexChartArea from '@/components/elements/charts/apex-charts-area/ApexChartArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartAreaMain = () => {
    return (
        <>
            <MetaData pageTitle="Area">
                <Wrapper>
                    <ApexChartArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartAreaMain;