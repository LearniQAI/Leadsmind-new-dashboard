
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';
import SwiperDefault from './SwiperDefault';
import SwiperNavigation from './SwiperNavigation';
import SwiperPagination from './SwiperPagination';
import SwiperPaginationDynamic from './SwiperPaginationDynamic';
import PaginationProgress from './PaginationProgress';
import PaginationFraction from './PaginationFraction';
import PaginationCustom from './PaginationCustom';
import PaginationScrollbar from './PaginationScrollbar';
import SwiperVertical from './SwiperVertical';
import SwiperNavigationPagination from './SwiperNavigationPagination';
import SwiperSlidesPerView from './SwiperSlidesPerView';
import SwiperSlidesEffect from './SwiperSlidesEffect';
import SwiperEffectCards from './SwiperEffectCards';
import SwiperSlidesRTL from './SwiperSlidesRTL';
import SwiperThumbsGallery from './SwiperThumbsGallery';
import SwiperAutoplayProgress from './SwiperAutoplayProgress';

const SwiperMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Swiper' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperDefault />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperNavigation />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperPagination />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperPaginationDynamic />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <PaginationProgress />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <PaginationFraction />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <PaginationCustom />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <PaginationScrollbar />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperVertical />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperNavigationPagination />
                    </div>
                    <div className="col-span-12">
                        <SwiperSlidesPerView />
                    </div>
                    <div className="col-span-12">
                        <SwiperSlidesEffect />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperEffectCards />
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <SwiperSlidesRTL />
                    </div>
                    <div className="col-span-12">
                        <SwiperThumbsGallery />
                    </div>
                    <div className="col-span-12">
                        <SwiperAutoplayProgress />
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default SwiperMainArea;