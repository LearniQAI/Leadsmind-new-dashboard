
import React from 'react';
import AvatarRounded from './AvatarRounded';
import AvatarRadius from './AvatarRadius';
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import AvatarGroup from './AvatarGroup';
import AvatarStatusIndicator from './AvatarStatusIndicator';
import AvatarTextSizing from './AvatarTextSizing';

const AvatarMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Avatar' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12  xl:col-span-6">
                        <AvatarRounded />
                    </div>
                    <div className="col-span-12  xl:col-span-6">
                        <AvatarRadius />
                    </div>
                    <div className="col-span-12  xl:col-span-6">
                        <AvatarGroup />
                    </div>
                    <div className="col-span-12  xl:col-span-6">
                        <AvatarTextSizing />
                    </div>
                    <div className="col-span-12  xl:col-span-6">
                        <AvatarStatusIndicator />
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default AvatarMainArea;