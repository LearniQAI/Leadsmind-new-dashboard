import ApexChartTimelineMainArea from '@/components/elements/charts/apex-charts-timeline/ApexChartTimelineMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartTimelineMain = () => {
    return (
        <>
             <MetaData pageTitle="Timeline">
                <Wrapper>
                    <ApexChartTimelineMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartTimelineMain;