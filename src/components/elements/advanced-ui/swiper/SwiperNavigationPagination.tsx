"use client"
import React from 'react';
import Image from 'next/image';
import swiperData from '@/data/swiper-data';
// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { Navigation, Pagination } from 'swiper';

const SwiperNavigationPagination = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Navigation Pagination</h5>
                </div>
                <div className="swiper swiperPaginationNavigation common-pagination-styles relative">
                <Swiper
                        modules={[Pagination, Navigation]}
                        navigation= {{
                            nextEl: ".swiper-button_next-3",
                            prevEl: ".swiper-button_prev-3",
                        }}
                        pagination={true}
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
                        {swiperData && swiperData.slice(90, 100).map((item) => (
                            <SwiperSlide key={item.id}>
                                    <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
                            </SwiperSlide>
                        ))}
                    </Swiper>
                    <div className="">
                        <div className="swiper-navigation-btn">
                            <button className="swiper-button_prev-3"><i
                                className="fa-regular fa-angle-left"></i></button>
                            <button className="swiper-button_next-3"><i
                                className="fa-regular fa-angle-right"></i></button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SwiperNavigationPagination;