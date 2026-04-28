import ApexChartBoxWhiskerMainArea from '@/components/elements/charts/apex-charts-box-whisker/ApexChartBoxWhiskerMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartBoxWhiskerMain = () => {
    return (
        <>
            <MetaData pageTitle="Box Whisker">
                <Wrapper>
                    <ApexChartBoxWhiskerMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartBoxWhiskerMain;