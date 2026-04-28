"use client"
import React from 'react';
import swiperData from '@/data/swiper-data';
import Image from 'next/image';

// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { Navigation, Pagination } from 'swiper';


const SwiperSlidesPerView = () => {

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Slides Per View</h5>
                </div>
                <div className="swiper swiperSlidesPerView common-pagination-styles relative">
                    <Swiper
                        modules={[Pagination, Navigation]}
                        spaceBetween= {30}
                        pagination= {true}
                        navigation= {{
                            nextEl: ".swiper-button_next-4",
                            prevEl: ".swiper-button_prev-4",
                        }}
                        breakpoints={{
                            320: {
                                slidesPerView: 1,
                            },
                            550: {
                                slidesPerView: 1,
                            },
                            767: {
                                slidesPerView: 2,
                            },
                            992: {
                                slidesPerView: 2,
                            },
                            1200: {
                                slidesPerView: 2,
                            },
                            1400: {
                                slidesPerView: 2,
                            },
                        }}
                    >
                        {swiperData && swiperData.slice(100, 110).map((item) => (
                            <SwiperSlide key={item.id}>
                                    <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    <div className="">
                        <div className="swiper-navigation-btn">
                            <button className="swiper-button_prev-4"><i
                                className="fa-regular fa-angle-left"></i></button>
                            <button className="swiper-button_next-4"><i
                                className="fa-regular fa-angle-right"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SwiperSlidesPerView;