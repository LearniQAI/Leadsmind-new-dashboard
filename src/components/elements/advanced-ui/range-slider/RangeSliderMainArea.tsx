import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import BasicRange from './DefaultRange';
import MinMaxValue from './MinMaxValue';
import PrefixRange from './PrefixRange';
import CustomValuesRange from './CustomValuesRange';
import PrettifyNumbersRange from './PrettifyNumbersRange';
import DisabledRange from './DisabledRange';

const RangeSliderMainArea = () => {

    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Range Slider' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12">
                        <div className="card__wrapper material-slider-wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Material Range Slider</h5>
                            </div>
                            <BasicRange />
                            <MinMaxValue />
                            <PrefixRange />
                            <CustomValuesRange/>
                            <PrettifyNumbersRange/>
                            <DisabledRange/>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default RangeSliderMainArea;
