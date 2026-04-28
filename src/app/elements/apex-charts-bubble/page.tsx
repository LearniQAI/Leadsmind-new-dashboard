
import ApexChartBubbleMainArea from '@/components/elements/charts/apex-charts-bubble/ApexChartBubbleMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartBubbleMain = () => {
    return (
        <>
            <MetaData pageTitle="Bubble">
                <Wrapper>
                    <ApexChartBubbleMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartBubbleMain;