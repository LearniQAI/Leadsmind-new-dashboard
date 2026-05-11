"use client"
import React, { useState } from 'react';
import swiperData from '@/data/swiper-data';
import Image from 'next/image';

// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { FreeMode, Navigation, Thumbs } from 'swiper';

// Import Swiper type from 'swiper' to use it for the state type
import type { Swiper as SwiperType } from 'swiper';

const SwiperThumbsGallery = () => {
    // Set the type to 'SwiperType | null'
    const [thumbsSwiper, setThumbsSwiper] = useState<SwiperType | null>(null);

    return (
        <>
            <div className="card__wrapper overflow-hidden">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Thumbs Gallery</h5>
                </div>
                <div className="swiper swiperThumbsGallery relative">
                    <Swiper
                        modules={[FreeMode, Navigation, Thumbs]}
                        thumbs={{ swiper: thumbsSwiper }}
                        loop={false}
                        spaceBetween={10}
                        navigation= {{
                            nextEl: ".swiper-button_next-6",
                            prevEl: ".swiper-button_prev-6",
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
                                swiperData.slice(140, 150).map((item) => (
                                    <SwiperSlide key={item.id}>
                                        <Image src={item.image} style={{ width: "100%", height: "auto" }} alt="image" />
                                    </SwiperSlide>
                                ))
                            )
                        }
                    </Swiper>
                    <div className="swiper-navigation-btn">
                        <button className="swiper-button_prev-6"><i
                            className="fa-regular fa-angle-left"></i></button>
                        <button className="swiper-button_next-6"><i
                            className="fa-regular fa-angle-right"></i></button>
                    </div>
                </div>
                <div className="swiper swiperThumbs">
                    <Swiper
                      onSwiper={setThumbsSwiper}
                      spaceBetween={10}
                      freeMode={true}
                      watchSlidesProgress={true}
                      modules={[FreeMode, Navigation, Thumbs]}
                    >
                        {
                            swiperData && (
                                swiperData.slice(140, 150).map((item) => (
                                    <SwiperSlide key={item.id}>
                                        <Image src={item.image}  alt="image" />
                                    </SwiperSlide>
                                ))
                            )
                        }
                    </Swiper>
                </div>
            </div>
        </>
    );
};

export default SwiperThumbsGallery;
