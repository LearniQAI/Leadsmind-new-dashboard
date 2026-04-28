import Link from "next/link";
import React from "react";

interface rattingType {
  averageRating: number;
}

const GetRatting = ({ averageRating }: rattingType) => {
  const getRating = (ratingsNum: number) => {
    const roundedRatings = Math.floor(ratingsNum); // Round down to the nearest integer
    const isHalfStar = ratingsNum % 1 !== 0; // Check if there's a decimal part
    const emptyRatingCount = 5 - roundedRatings - (isHalfStar ? 1 : 0);

    const ratings = [];

    for (let i = 0; i < roundedRatings; i++) {
      ratings.push(
        <Link href="#" key={`full-star-${i}`}>
          <i className="fas fa-star"></i>
        </Link>
      );
    }

    if (isHalfStar) {
      ratings.push(
        <Link href="#" key="half-star">
          <i className="fas fa-star-half-alt"></i>
        </Link>
      );
    }

    for (let i = 0; i < emptyRatingCount; i++) {
      ratings.push(
        <Link href="#" key={`empty-star-${i}`}>
          <i className="far fa-star"></i>
        </Link>
      );
    }

    return ratings;
  };

  return <>{getRating(averageRating)}</>;
};

export default GetRatting;
