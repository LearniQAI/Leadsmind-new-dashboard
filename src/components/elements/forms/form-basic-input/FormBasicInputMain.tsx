import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import BasicInputFieldWithRightSideLabel from './VariationOne';
import BasicInputFieldWithLabelTop from './VariationFive';
import DefaultFloatlabelTwo from './DefaultFloatlabelTwo';
import DefaultFloatlabel from './DefaultFloatlabel';
import RoundedInputField from './RoundedInputField';
import Switches from './Switches';
import CheckboxesRadio from './CheckboxesRadio';
import FileInput from './FileInput';
import ChecksRadios from './ChecksRadios';
import InputFieldSizing from './InputFieldSizing';
import RangeSlider from './RangeSlider';
import DefaultSelectField from './DefaultSelectField';
import SelectFieldSizing from './SelectFieldSizing';

const FormBasicInputMain = () => {
    return (
        <>
          <div className="app__slide-wrapper">
            <Breadcrumb  breadTitle='Form Basic Input' subTitle='Home' />

            <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
                <div className="col-span-12 xxl:col-span-6">
                    <BasicInputFieldWithRightSideLabel />
                    <DefaultFloatlabel />
                    <DefaultFloatlabelTwo />
                    <RoundedInputField />
                    <FileInput />
                    <InputFieldSizing />
                    <SelectFieldSizing />
                    <DefaultSelectField />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <BasicInputFieldWithLabelTop />
                    <CheckboxesRadio />
                    <Switches />
                    <ChecksRadios />
                    <RangeSlider />
                </div>
            </div>
            </div>
        </>
    );
};

export default FormBasicInputMain;