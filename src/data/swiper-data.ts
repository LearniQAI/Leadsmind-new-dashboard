

import img1 from "../../public/assets/images/swiper/swiper-img-1.png";
import img2 from "../../public/assets/images/swiper/swiper-img-2.png";
import img3 from "../../public/assets/images/swiper/swiper-img-3.png";
import img4 from "../../public/assets/images/swiper/swiper-img-4.png";
import img5 from "../../public/assets/images/swiper/swiper-img-5.png";
import img6 from "../../public/assets/images/swiper/swiper-img-6.png";
import img7 from "../../public/assets/images/swiper/swiper-img-7.png";
import img8 from "../../public/assets/images/swiper/swiper-img-8.png";
import img9 from "../../public/assets/images/swiper/swiper-img-9.png";
import img10 from "../../public/assets/images/swiper/swiper-img-10.png";
import { StaticImageData } from "next/image";

interface TData {
    image: StaticImageData;
    id: number
}

const swiperData: TData[] = [
    //swiper default data
    {
        id: 1,
        image: img1,
    },
    {
        id: 2,
        image: img2,
    },
    {
        id: 3,
        image: img3,
    },
    {
        id: 4,
        image: img4,
    },
    {
        id: 5,
        image: img5,
    },
    {
        id: 6,
        image: img6,
    },
    {
        id: 7,
        image: img7,
    },
    {
        id: 8,
        image: img8,
    },
    {
        id: 9,
        image: img9,
    },
    {
        id: 10,
        image: img10,
    },
    //swiper navigation data
    {
        id: 11,
        image: img2,
    },
    {
        id: 12,
        image: img1,
    },
    {
        id: 13,
        image: img3,
    },
    {
        id: 14,
        image: img4,
    },
    {
        id: 15,
        image: img5,
    },
    {
        id: 16,
        image: img6,
    },
    {
        id: 17,
        image: img7,
    },
    {
        id: 18,
        image: img8,
    },
    {
        id: 19,
        image: img9,
    },
    {
        id: 20,
        image: img10,
    },
    //Swiper pagination data
    {
        id: 21,
        image: img3,
    },
    {
        id: 22,
        image: img2,
    },
    {
        id: 23,
        image: img1,
    },
    {
        id: 24,
        image: img4,
    },
    {
        id: 25,
        image: img5,
    },
    {
        id: 26,
        image: img6,
    },
    {
        id: 27,
        image: img7,
    },
    {
        id: 28,
        image: img8,
    },
    {
        id: 29,
        image: img9,
    },
    {
        id: 30,
        image: img10,
    },
    //Swiper pagination dynamic data
    {
        id: 31,
        image: img4,
    },
    {
        id: 32,
        image: img2,
    },
    {
        id: 33,
        image: img3,
    },
    {
        id: 34,
        image: img1,
    },
    {
        id: 35,
        image: img5,
    },
    {
        id: 36,
        image: img6,
    },
    {
        id: 37,
        image: img7,
    },
    {
        id: 38,
        image: img8,
    },
    {
        id: 39,
        image: img9,
    },
    {
        id: 40,
        image: img10,
    },
    //swiper pagination progress
    {
        id: 41,
        image: img5,
    },
    {
        id: 42,
        image: img2,
    },
    {
        id: 43,
        image: img3,
    },
    {
        id: 44,
        image: img4,
    },
    {
        id: 45,
        image: img1,
    },
    {
        id: 46,
        image: img6,
    },
    {
        id: 47,
        image: img7,
    },
    {
        id: 48,
        image: img8,
    },
    {
        id: 49,
        image: img9,
    },
    {
        id: 50,
        image: img10,
    },
    //swiper Pagination Fraction
    {
        id: 51,
        image: img6,
    },
    {
        id: 52,
        image: img2,
    },
    {
        id: 53,
        image: img3,
    },
    {
        id: 54,
        image: img4,
    },
    {
        id: 55,
        image: img5,
    },
    {
        id: 56,
        image: img1,
    },
    {
        id: 57,
        image: img7,
    },
    {
        id: 58,
        image: img8,
    },
    {
        id: 59,
        image: img9,
    },
    {
        id: 60,
        image: img10,
    },
    //swiper pagination custom
    {
        id: 61,
        image: img7,
    },
    {
        id: 62,
        image: img2,
    },
    {
        id: 63,
        image: img3,
    },
    {
        id: 64,
        image: img4,
    },
    {
        id: 65,
        image: img5,
    },
    {
        id: 66,
        image: img6,
    },
    {
        id: 67,
        image: img1,
    },
    {
        id: 68,
        image: img8,
    },
    {
        id: 69,
        image: img9,
    },
    {
        id: 70,
        image: img10,
    },
    //swiper pagination scrollbar
    {
        id: 71,
        image: img8,
    },
    {
        id: 72,
        image: img2,
    },
    {
        id: 73,
        image: img3,
    },
    {
        id: 74,
        image: img4,
    },
    {
        id: 75,
        image: img5,
    },
    {
        id: 76,
        image: img6,
    },
    {
        id: 77,
        image: img7,
    },
    {
        id: 78,
        image: img1,
    },
    {
        id: 79,
        image: img9,
    },
    {
        id: 80,
        image: img10,
    },
    //Swiper Vertical
    {
        id: 81,
        image: img9,
    },
    {
        id: 82,
        image: img2,
    },
    {
        id: 83,
        image: img3,
    },
    {
        id: 84,
        image: img4,
    },
    {
        id: 85,
        image: img5,
    },
    {
        id: 86,
        image: img6,
    },
    {
        id: 87,
        image: img7,
    },
    {
        id: 88,
        image: img8,
    },
    {
        id: 89,
        image: img1,
    },
    {
        id: 90,
        image: img10,
    },
    //Swiper Navigation Pagination
    {
        id: 91,
        image: img10,
    },
    {
        id: 92,
        image: img2,
    },
    {
        id: 93,
        image: img3,
    },
    {
        id: 94,
        image: img4,
    },
    {
        id: 95,
        image: img5,
    },
    {
        id: 96,
        image: img6,
    },
    {
        id: 97,
        image: img7,
    },
    {
        id: 98,
        image: img8,
    },
    {
        id: 99,
        image: img9,
    },
    {
        id: 100,
        image: img1,
    },
    //Swiper Slides Per View
    {
        id: 101,
        image: img3,
    },
    {
        id: 102,
        image: img2,
    },
    {
        id: 103,
        image: img1,
    },
    {
        id: 104,
        image: img4,
    },
    {
        id: 105,
        image: img5,
    },
    {
        id: 106,
        image: img6,
    },
    {
        id: 107,
        image: img7,
    },
    {
        id: 108,
        image: img8,
    },
    {
        id: 109,
        image: img9,
    },
    {
        id: 110,
        image: img10,
    },
    //Swiper Slides Effect
    {
        id: 111,
        image: img4,
    },
    {
        id: 112,
        image: img2,
    },
    {
        id: 113,
        image: img3,
    },
    {
        id: 114,
        image: img1,
    },
    {
        id: 115,
        image: img5,
    },
    {
        id: 116,
        image: img6,
    },
    {
        id: 117,
        image: img7,
    },
    {
        id: 118,
        image: img8,
    },
    {
        id: 119,
        image: img9,
    },
    {
        id: 120,
        image: img10,
    },

    //Swiper Card Effect
    {
        id: 121,
        image: img4,
    },
    {
        id: 122,
        image: img2,
    },
    {
        id: 123,
        image: img3,
    },
    {
        id: 124,
        image: img1,
    },
    {
        id: 125,
        image: img5,
    },
    {
        id: 126,
        image: img6,
    },
    {
        id: 127,
        image: img7,
    },
    {
        id: 128,
        image: img8,
    },
    {
        id: 129,
        image: img9,
    },
    {
        id: 130,
        image: img10,
    },
    //Swiper Slides RTL
    {
        id: 131,
        image: img6,
    },
    {
        id: 132,
        image: img2,
    },
    {
        id: 133,
        image: img3,
    },
    {
        id: 134,
        image: img4,
    },
    {
        id: 135,
        image: img5,
    },
    {
        id: 136,
        image: img1,
    },
    {
        id: 137,
        image: img7,
    },
    {
        id: 138,
        image: img8,
    },
    {
        id: 139,
        image: img9,
    },
    {
        id: 140,
        image: img10,
    },
     //Swiper Thumbs Gallery
     {
        id: 141,
        image: img7,
    },
    {
        id: 142,
        image: img2,
    },
    {
        id: 143,
        image: img3,
    },
    {
        id: 144,
        image: img4,
    },
    {
        id: 145,
        image: img5,
    },
    {
        id: 146,
        image: img6,
    },
    {
        id: 147,
        image: img1,
    },
    {
        id: 148,
        image: img8,
    },
    {
        id: 149,
        image: img9,
    },
    {
        id: 150,
        image: img10,
    },
     //Swiper Autoplay Progress
     {
        id: 151,
        image: img9,
    },
    {
        id: 152,
        image: img2,
    },
    {
        id: 153,
        image: img3,
    },
    {
        id: 154,
        image: img4,
    },
    {
        id: 155,
        image: img5,
    },
    {
        id: 156,
        image: img6,
    },
    {
        id: 157,
        image: img1,
    },
    {
        id: 158,
        image: img8,
    },
    {
        id: 159,
        image: img1,
    },
    {
        id: 160,
        image: img10,
    },
];

export default swiperData;