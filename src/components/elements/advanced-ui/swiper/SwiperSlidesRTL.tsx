"use client"
import React from 'react';
import swiperData from '@/data/swiper-data';
import Image from 'next/image';
// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { Navigation, Pagination } from 'swiper';


const SwiperSlidesRTL = () => {
    return (
        <>
            <div className="card__wrapper height-equal">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Slides RTL</h5>
                </div>
                <div dir="rtl" className="swiper swiperSlidesRtl common-pagination-styles relative">

                    <Swiper
                        modules={[Pagination, Navigation]}
                        pagination={true}
                        navigation={{
                            nextEl: ".swiper-button_next-5",
                            prevEl: ".swiper-button_prev-5",
                        }}
                        className='bd-pagination'
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
                        {
                            swiperData && (
                                swiperData.slice(130, 140).map((item) => (
                                    <SwiperSlide key={item.id}>
                                        <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
                                    </SwiperSlide>
                                ))
                            )
                        }
                    </Swiper>
                    <div className="">
                        <div className="swiper-navigation-btn">
                            <button className="swiper-button_prev-5"><i
                                className="fa-regular fa-angle-left"></i></button>
                            <button className="swiper-button_next-5"><i
                                className="fa-regular fa-angle-right"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SwiperSlidesRTL;