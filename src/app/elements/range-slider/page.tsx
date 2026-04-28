import RangeSliderMainArea from '@/components/elements/advanced-ui/range-slider/RangeSliderMainArea';
import Wrapper from '@/components/layouts/DefaultWrapper';
import MetaData from '@/hooks/useMetaData';
import React from 'react';

const RangeSlideMain = () => {
    return (
        <>
              <MetaData pageTitle="Range Slider">
                <Wrapper>
                    <RangeSliderMainArea />
                </Wrapper>
            </MetaData>
        </>
    );
};

export default RangeSlideMain;