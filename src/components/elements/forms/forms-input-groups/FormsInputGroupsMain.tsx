import React from 'react';
import Default from './Default';
import CheckboxRadioSwitch from './CheckboxRadioSwitch';
import InputSize from './InputSize';
import ActionButtonWithDropdown from './ActionButtonWithDropdown';
import MultipleTextInput from './MultipleTextInput';
import ButtonWithInputField from './ButtonWithInputField';
import DropDownButton from './DropDownButton';
import SelectFieldWithButton from './SelectFieldWithButton';
import UploadFieldWithButton from './UploadFieldWithButton';
import SimpleIconField from './SimpleIconField';

const FormsInputGroupsMain = () => {
    return (
        <>
            <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0">
                <div className="col-span-12 xxl:col-span-6">
                    <Default />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <CheckboxRadioSwitch />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <InputSize />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <ActionButtonWithDropdown />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <MultipleTextInput />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <ButtonWithInputField />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <DropDownButton />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <SelectFieldWithButton />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <UploadFieldWithButton />
                </div>
                <div className="col-span-12 xxl:col-span-6">
                    <SimpleIconField />
                </div>
            </div>
        </>
    );
};

export default FormsInputGroupsMain;