import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import FormVariationOne from './FormVariationOne';
import FormVariationTwo from './FormVariationTwo';
import FormVariationThree from './FormVariationThree';
import FormVariationFour from './FormVariationFour';
import FormVariationFive from './FormVariationFive';
import FormVariationSix from './FormVariationSix';

const FormStyleMain = () => {
    return (
        <>
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Form Style' subTitle='Home' />
                <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
                    <div className="col-span-12 lg:col-span-6">
                        <FormVariationOne />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <FormVariationTwo />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <FormVariationThree />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <FormVariationFour />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <FormVariationFive />
                    </div>
                    <div className="col-span-12 lg:col-span-6">
                        <FormVariationSix />
                    </div>
                </div>
            </div>
        </>
    );
};

export default FormStyleMain;