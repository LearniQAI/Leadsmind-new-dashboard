import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import HorizontalTimeline from './HorizontalTimeline';
import VerticalTimeline from './VerticalTimeline';

const TimelineMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Timeline' subTitle='Ui Elements' />
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <HorizontalTimeline />
                    </div>
                    <div className="col-span-12">
                        <VerticalTimeline />
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default TimelineMainArea;