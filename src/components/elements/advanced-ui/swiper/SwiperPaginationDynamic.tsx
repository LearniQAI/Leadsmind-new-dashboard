"use client"
import React from 'react';
import swiperData from '@/data/swiper-data';
import Image from 'next/image';

// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { Pagination } from 'swiper';


const SwiperPaginationDynamic = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Pagination Dynamic</h5>
                </div>
                <div className="swiper swiperPaginationDynamic common-pagination-styles relative">
                    <div className="swiper-wrapper">
                        <Swiper
                            pagination={{
                                dynamicBullets: true,
                            }}
                            modules={[Pagination]}
                            className="mySwiper"
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
                                    swiperData.slice(30, 40).map((item) => (
                                        <SwiperSlide key={item.id}>
                                            <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
                                        </SwiperSlide>
                                    ))
                                )
                            }
                        </Swiper>
                    </div>
                    <div className="bd-pagination">
                        <div className="swiper-pagination"></div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SwiperPaginationDynamic;