import ApexChartPolarAreaMain from '@/components/elements/charts/apex-charts-polar-area/ApexChartPolarAreaMain';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartPolarArea = () => {
    return (
        <>
             <MetaData pageTitle="Polar Area">
                <Wrapper>
                    <ApexChartPolarAreaMain />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartPolarArea;