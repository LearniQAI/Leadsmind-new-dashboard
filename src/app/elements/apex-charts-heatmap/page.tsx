import ApexChartsHeatmapArea from '@/components/elements/charts/apex-charts-heatmap/ApexChartsHeatmapArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartsHeatmap = () => {
    return (
        <>
            <MetaData pageTitle="Heatmap">
                <Wrapper>
                    <ApexChartsHeatmapArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartsHeatmap;     