import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import BasicRating from './BasicRating';
import HalfRating from './HalfRating';
import RatingSize from './RatingSize';

const RatingMainArea = () => {
    return (
        <>
         {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Rating' subTitle='Ui Elements'/>
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6">
                        <BasicRating/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                       <HalfRating/>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                       <RatingSize/>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default RatingMainArea;