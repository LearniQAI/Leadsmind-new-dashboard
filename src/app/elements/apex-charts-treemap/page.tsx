import ApexChartsTreemapMainArea from '@/components/elements/charts/apex-charts-treemap/ApexChartsTreemapMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartsTreemapMain = () => {
    return (
        <>
             <MetaData pageTitle="Treemap">
                <Wrapper>
                    <ApexChartsTreemapMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartsTreemapMain;