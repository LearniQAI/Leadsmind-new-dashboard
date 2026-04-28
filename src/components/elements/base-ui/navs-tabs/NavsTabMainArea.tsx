import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import Link from 'next/link';
import React from 'react';
import BasicTabs from './BasicTabs';
import BasicTabsBottom from './BasicTabsBottom';
import BasicTabswithIcon from './BasicTabswithIcon';
import BasicTabsWithIconRight from './BasicTabsWithIconRight';
import VerticalTabs from './VerticalTabs';
import PillTabs from './PillTabs';
import PrimaryColorTabs from './PrimaryColorTabs';
import SecondaryColorTabs from './SecondaryColorTabs';
import SuccessColorTabs from './SuccessColorTabs';
import InfoColorTabs from './InfoColorTabs';
import WarningColorTabs from './WarningColorTabs';
import DangerColorTabs from './DangerColorTabs';
import LightColorTabs from './LightColorTabs';
import DarkColorTabs from './DarkColorTabs';

const NavsTabMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Navs Tabs' subTitle='Ui Elements' />

                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6">
                        <BasicTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <BasicTabsBottom />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <BasicTabswithIcon />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <BasicTabsWithIconRight />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <VerticalTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <PillTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <PrimaryColorTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SecondaryColorTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SuccessColorTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <InfoColorTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <WarningColorTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <DangerColorTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <LightColorTabs />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                       <DarkColorTabs/>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default NavsTabMainArea;