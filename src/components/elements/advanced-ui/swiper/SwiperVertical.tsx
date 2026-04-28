
"use client";
import swiperData from '@/data/swiper-data';
import Image from 'next/image';
import React from 'react';

// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { Pagination } from 'swiper';

const SwiperVertical = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Vertical</h5>
                </div>
                <div className="swiper swiperVertical relative common-vertical-pagination-styles" style={{ height: '400px' }}>
                    <Swiper
                        modules={[Pagination]}
                        direction={'vertical'}
                        pagination={{ clickable: true }}
                        className="bd-pagination-vertical"
                        breakpoints={{
                            320: {
                                slidesPerView: 1,
                            },
                            550: {
                                slidesPerView: 1,
                            },
                            767: {
                                slidesPerView: 1,
                            },
                            992: {
                                slidesPerView: 1,
                            },
                            1200: {
                                slidesPerView: 1,
                            },
                            1400: {
                                slidesPerView: 1,
                            },
                        }}
                    >
                        {swiperData && swiperData.slice(80, 90).map((item) => (
                            <SwiperSlide key={item.id}>
                                <div className='h-full'>
                                    <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
                                </div>
                            </SwiperSlide>
                        ))}
                    </Swiper>
                </div>
            </div>
        </>
    );
};

export default SwiperVertical;
