"use client"
import swiperData from '@/data/swiper-data';
import Image from 'next/image';
import React from 'react';

//navigation swiper
import { SwiperSlide, Swiper } from 'swiper/react';
import { Navigation } from 'swiper';

const SwiperNavigation = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Navigation</h5>
                </div>
                <div className="swiper swiperNavigation relative">
                    <Swiper
                        modules={[Navigation]}
                        navigation={{
                            nextEl: '.swiper-button_next',
                            prevEl: '.swiper-button_prev',
                        }}
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
                                swiperData.slice(10, 20).map((item) => (
                                    <SwiperSlide key={item.id}>
                                        <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
                                    </SwiperSlide>
                                ))
                            )
                        }
                    </Swiper>
                    <div className="swiper-navigation-btn">
                        <button className="swiper-button_prev"><i className="fa-regular fa-angle-left"></i></button>
                        <button className="swiper-button_next"><i
                            className="fa-regular fa-angle-right"></i></button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SwiperNavigation;