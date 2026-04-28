import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import TeamStyleVeriationTwo from './TeamStyleVeriationTwo';
import TeamStyleVariationThree from './TeamStyleVeriationThree';
import TeamStyleVeriationFour from './TeamStyleVeriationFour';
import TeamStyleVeriationOne from './TeamStyleVeriationOne';

const TeamMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Team' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12">
                        <TeamStyleVeriationOne />
                    </div>
                    <div className="col-span-12">
                        <TeamStyleVeriationTwo />
                    </div>
                    <div className="col-span-12">
                        <TeamStyleVariationThree />
                    </div>
                    <div className="col-span-12">
                        <TeamStyleVeriationFour />
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default TeamMainArea;