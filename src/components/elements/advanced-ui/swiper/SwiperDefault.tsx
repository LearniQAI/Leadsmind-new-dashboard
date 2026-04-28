"use client"
import React from 'react';
import Image from 'next/image';
import swiperData from '@/data/swiper-data';
// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';

const SwiperDefault = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Default</h5>
                </div>
                <div className="swiper swiperDefault">
                    <Swiper>
                        {
                            swiperData && (
                                swiperData.slice(0, 10).map((item) => (
                                    <SwiperSlide key={item.id}>
                                        <Image src={item.image} style={{ width: "100%", height: "auto" }} priority alt="image" />
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

export default SwiperDefault;