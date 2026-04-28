"use client"
import React from 'react';
import swiperData from '@/data/swiper-data';
import Image from 'next/image';

// Import Swiper and its necessary modules
import { SwiperSlide, Swiper } from 'swiper/react';
import { EffectCards } from 'swiper';

const SwiperEffectCards = () => {
    return (
        <>
            <div className="card__wrapper height-equal overflow-x-hidden">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Swiper Effect Cards</h5>
                </div>
                <div className="swiper swiperSlidesEffectCards relative">
                    <Swiper
                        modules={[EffectCards]}
                        effect={'cards'}
                        grabCursor={true}
                        className="mySwiper"
                    >
                        {
                            swiperData && (
                                swiperData.slice(120, 130).map((item) => (
                                    <SwiperSlide key={item.id}>
                                        <Image src={item.image} priority alt="image" />
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

export default SwiperEffectCards;