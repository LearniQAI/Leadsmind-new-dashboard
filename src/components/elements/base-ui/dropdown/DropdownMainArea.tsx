import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import BasicColorDropdown from './BasicColorDropdown';
import DropdownSplitButton from './DropdownSplitButton';
import RoundedDropdown from './RoundedDropdown';
import DropdownWithDivider from './DropdownWithDivider';
import DropdownWithHeader from './DropdownWithHeader';
import DropdownWithDisable from './DropdownWithDisable';
import DropdownWithDropUp from './DropdownWithDropUp';
import BasicDropdown from './BasicDropdown';

const DropdownMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Navs Tabs' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12">
                       <BasicDropdown/>
                    </div>
                    <div className="col-span-12">
                       <BasicColorDropdown/>
                    </div>
                    <div className="col-span-12">
                       <DropdownSplitButton/>
                    </div>
                    <div className="col-span-12">
                       <RoundedDropdown/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                      <DropdownWithDivider/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                     <DropdownWithHeader/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                       <DropdownWithDisable/>
                    </div>
                    <div className="col-span-12 xl:col-span-6   ">
                      <DropdownWithDropUp/>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default DropdownMainArea;