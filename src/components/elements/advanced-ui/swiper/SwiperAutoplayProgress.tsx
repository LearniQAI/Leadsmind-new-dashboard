"use client"
import swiperData from '@/data/swiper-data';
import Image from 'next/image';
import React, { useRef } from 'react';

// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from 'swiper';

const SwiperAutoplayProgress = () => {
    // Updated the type to SVGSVGElement
    const progressCircle = useRef<SVGSVGElement | null>(null);
    const progressContent = useRef<HTMLSpanElement | null>(null);
    
    const onAutoplayTimeLeft = (s: any, time: number, progress: number) => {
        if (progressCircle.current) {
            progressCircle.current.style.setProperty('--progress', `${1 - progress}`);
        }
        if (progressContent.current) {
            progressContent.current.textContent = `${Math.ceil(time / 1000)}s`;
        }
    };

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Autoplay Progress</h5>
                </div>
                <div className="swiper swiperAutoplayProgress common-pagination-styles relative">
                    <Swiper
                        modules={[Pagination, Navigation, Autoplay]}
                        onAutoplayTimeLeft={onAutoplayTimeLeft}
                        spaceBetween={30}
                        centeredSlides={true}
                        autoplay={{
                            delay: 6000,
                            disableOnInteraction: false
                        }}
                        pagination={{
                            clickable: true,
                        }}
                        navigation={{
                            nextEl: ".swiper-button_next",
                            prevEl: ".swiper-button_prev",
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
                        {swiperData && (
                            swiperData.slice(150, 160).map((item) => (
                                <SwiperSlide key={item.id}>
                                    <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
                                </SwiperSlide>
                            ))
                        )}
                    </Swiper>
                    <div className="">
                        <div className="swiper-navigation-btn">
                            <button className="swiper-button_prev">
                                <i className="fa-regular fa-angle-left"></i>
                            </button>
                            <button className="swiper-button_next">
                                <i className="fa-regular fa-angle-right"></i>
                            </button>
                        </div>
                        <div className="bd-pagination">
                            <div className="swiper-pagination"></div>
                        </div>
                        <div className="autoplay-progress" slot="container-end">
                            <svg viewBox="0 0 48 48" ref={progressCircle}>
                                <circle cx="24" cy="24" r="20"></circle>
                            </svg>
                            <span ref={progressContent}></span>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SwiperAutoplayProgress;
