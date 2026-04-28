import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import ThemePrimaryButtons from './ThemePrimaryButtons';
import ThemePrimaryButtonRounded from './ThemePrimaryButtonRounded';
import ThemePrimaryButtonRoundedRedius from './ThemePrimaryButtonRoundedRedius';
import ThemePrimaryButtonOutline from './ThemePrimaryButtonOutline';
import ThemePrimaryButtonRoundedVeriationTwo from './ThemePrimaryButtonRoundedVeriationTwo';
import ThemePrimaryButtonWithoutRadius from './ThemePrimaryButtonWithoutRadius';
import LoadingButtons from './LoadingButtons';
import IconButtonwithSize from './IconButtonwithSize';
import ThemePrimaryButtonsVariationTwo from './ThemePrimaryButtonsVariationTwo';
import ButtonWithLabel from './ButtonWithLabel';

const ButtonsMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Buttons' subTitle='Ui Elements' />
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <ThemePrimaryButtons />
                    </div>
                    <div className="col-span-12">
                        <ThemePrimaryButtonRounded />
                    </div>
                    <div className="col-span-12">
                        <ThemePrimaryButtonRoundedRedius />
                    </div>
                    <div className="col-span-12">
                        <ThemePrimaryButtonOutline />
                    </div>
                    <div className="col-span-12">
                        <ThemePrimaryButtonRoundedVeriationTwo />
                    </div>
                    <div className="col-span-12">
                        <ThemePrimaryButtonWithoutRadius />
                    </div>
                    <div className="col-span-12">
                        <LoadingButtons />
                    </div>
                    <div className="col-span-12">
                        <IconButtonwithSize />
                    </div>
                    <div className="col-span-12">
                        <ThemePrimaryButtonsVariationTwo />
                    </div>
                    <div className="col-span-12">
                        <ButtonWithLabel />
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default ButtonsMainArea;