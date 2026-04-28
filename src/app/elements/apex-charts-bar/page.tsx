
import ApexChartBarMainArea from '@/components/elements/charts/apex-charts-bar/ApexChartBarMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartBarMain = () => {
    return (
        <>
            <MetaData pageTitle="Bar">
                <Wrapper>
                    <ApexChartBarMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartBarMain;