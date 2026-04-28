
import ApexChartsScatterMainArea from '@/components/elements/charts/apex-charts-scatter/ApexChartsScatterMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartsScatterMain = () => {
    return (
        <>
             <MetaData pageTitle="Scatter">
                <Wrapper>
                    <ApexChartsScatterMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartsScatterMain;