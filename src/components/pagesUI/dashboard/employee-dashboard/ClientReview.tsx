"use client"
import React from 'react';
import CustomDropdown from '@/components/dropdown/CustomDropdown';
import { dropdownItems } from '@/data/dropdown-data';
import Image, { StaticImageData } from 'next/image';
import user1 from "../../../../../public/assets/images/user/user1.png";
import user2 from "../../../../../public/assets/images/user/user2.png";
import user3 from "../../../../../public/assets/images/user/user3.png";
interface TClinetReview {
    id: number;
    name: string;
    date: string;
    image: StaticImageData;
    review: string;
    rating: number;
}
// Sample client reviews data
const clientReviews: TClinetReview[] = [
    {
        id: 1,
        name: "Kermit M. Ellis",
        date: "Jul 13, 2024",
        image: user1,
        review: "The HRM system has greatly improved our team's productivity and engagement. Highly recommend it!",
        rating: 5,
    },
    {
        id: 2,
        name: "Olivia Bennett",
        date: "Jul 13, 2024",
        image: user2,
        review: "The new CRM features have streamlined our customer interactions, making our processes much more efficient.",
        rating: 5,
    },
    {
        id: 3,
        name: "Ethan Wilson",
        date: "Jul 13, 2024",
        image: user3,
        review: "The HRM tools have made our workflow smoother and more organized. The team loves the new updates!",
        rating: 5,
    },
    {
        id: 4,
        name: "Sophia Adams",
        date: "Jul 13, 2024",
        image: user1,
        review: "The CRM analytics have provided valuable insights into our customer behaviors, enhancing our service quality.",
        rating: 5,
    },
    {
        id: 5,
        name: "Ava Thompson",
        date: "Jul 13, 2024",
        image: user2,
        review: "The updated HRM platform is intuitive and user-friendly, making it easier for our HR team to manage daily tasks.",
        rating: 5,
    },
];

const ClientReview = () => {
    return (
        <div className="card__wrapper">
            <div className="card__title-wrap flex items-center justify-between mb-[20px]">
                <h5 className="card__heading-title">Client Review</h5>
                <CustomDropdown items={dropdownItems} />
            </div>
            <div className="common-scrollbar h-[400px] overflow-y-auto">
                <div className="card__inner">
                    <div className="card__review-wrapper style_two">
                        <div className="card__review">
                            {clientReviews.map((review) => (
                                <div key={review.id} className="card__review-box flex flex-wrap justify-between gap-[10px] sm:gap-[20px] mb-[20px]">
                                    <div className="card__review-thumb">
                                        <Image className="w-[48px] rounded-[50%]" src={review.image} alt={review.name} />
                                    </div>
                                    <div className="card__review-content">
                                        <h5 className="seller__name small font-semibold mb-[5px]">Kermit M. Ellis</h5>
                                        <span>{review.date}</span>
                                        <p>{review.review}</p>
                                        <span className="flex !text-warning">
                                            {Array.from({ length: review.rating }).map((_, index) => (
                                                <i
                                                    key={index}
                                                    className="fa-sharp fa-solid fa-star"
                                                ></i>
                                            ))}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ClientReview;
