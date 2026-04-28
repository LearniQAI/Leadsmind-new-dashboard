import ApexChartCandlestickArea from '@/components/elements/charts/apex-charts-candlestick/ApexChartCandlestickArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const ApexChartCandlestick = () => {
    return (
        <>
            <MetaData pageTitle="Candlestick">
                <Wrapper>
                    <ApexChartCandlestickArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default ApexChartCandlestick;