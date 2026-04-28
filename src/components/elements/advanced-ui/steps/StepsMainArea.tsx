import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import CircleStepWithIcon from './CircleStepWithIcon';
import CircleStepWithNumber from './CircleStepWithNumber';
import BoxStepWithNumber from './BoxStepWithNumber';
import BoxStepWithIcon from './BoxStepWithIcon';
import FourBoxStep from './FourBoxStep';
import BoxStepWithVariation from './BoxStepWithVariation';
import TextSteps from './TextSteps';
import VerticalTextSteps from './VerticalTextSteps';

const StepsMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Steps' subTitle='Ui Elements' />
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                       <CircleStepWithIcon/>
                    </div>
                    <div className="col-span-12">
                       <CircleStepWithNumber/>
                    </div>
                    <div className="col-span-12">
                        <BoxStepWithNumber/>
                    </div>
                    <div className="col-span-12">
                        <BoxStepWithIcon/>
                    </div>
                    <div className="col-span-12">
                       <FourBoxStep/>
                    </div>
                    <div className="col-span-12">
                        <BoxStepWithVariation/>
                    </div>
                    <div className="col-span-12">
                        <TextSteps/>
                    </div>
                    <div className="col-span-12">
                       <VerticalTextSteps/>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default StepsMainArea;