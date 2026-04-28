import ApexChartRadarMainArea from '@/components/elements/charts/apex-charts-radar/ApexChartRadarMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartRadarMain = () => {
    return (
        <>
             <MetaData pageTitle="Radar">
                <Wrapper>
                    <ApexChartRadarMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartRadarMain;