import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import ThemeColorAlart from './ThemeColorAlart';
import ThemeLightAlert from './ThemeLightAlert';
import AlertWithIcon from './AlertWithIcon';
import LinkColor from './LinkColor';
import Dismissing from './Dismissing';
import ThemeLinkColor from './ThemeLinkColor';
import DismissingWithAnimation from './DismissingWithAnimation';
import OutlineAlerts from './OutlineAlerts';
import DoubleBorderOutline from './DoubleBorderOutline';
import AlertOutlineWithIcon from './AlertOutlineWithIcon';
import AlertWithIconinversebg from './AlertWithIconinversebg';
import TextButtonAction from './TextButtonAction';
import AlertWithImage from './AlertWithImage';
import AlertOutlineWithImage from './AlertOutlineWithImage';

const AlertMainArea = () => {
    return (
        <>
             {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Alert' subTitle='Ui Elements'/>
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6">
                       <ThemeColorAlart/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                       <ThemeLightAlert/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                       <AlertWithIcon/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                      <LinkColor/>
                    </div>
                     <div className="col-span-12 xl:col-span-6">
                        <Dismissing/>
                    </div>
                   <div className="col-span-12 xl:col-span-6">
                        <ThemeLinkColor/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <DismissingWithAnimation/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                       <OutlineAlerts/>
                    </div>
                   <div className="col-span-12 xl:col-span-6">
                       <DoubleBorderOutline/>
                    </div>
                   <div className="col-span-12 xl:col-span-6">
                       <AlertOutlineWithIcon/>
                    </div>
                      <div className="col-span-12 xl:col-span-6">
                        <AlertWithIconinversebg/>
                    </div>
                  <div className="col-span-12 xl:col-span-6">
                       <TextButtonAction/>
                    </div>
                 <div className="col-span-12 xl:col-span-6">
                       <AlertWithImage/>
                    </div>
                   <div className="col-span-12 xl:col-span-6">
                        <AlertOutlineWithImage/>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default AlertMainArea;