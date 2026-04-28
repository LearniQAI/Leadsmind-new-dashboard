
import React from 'react';
import Link from "next/link";
import bgImage from "../../../../../public/assets/images/bg/personal.png";

const WelcomeThumb = () => {
    return (
        <>
            <div className="card__thumb employee-bg flex items-center mb-[20px]" style={{ backgroundImage: `url(${bgImage.src})` }}>
              <div className="card__thumb-content">
                <span className="card__thumb-subtitle">Welcome Back</span>
                <h1 className="card__thumb-title mb-[20px]">Thomas<span className="text-warning"> Edison</span></h1>
                <div className="card__thumb-btn">
                  <Link className="btn btn-white !rounded-3xl" href="#">Explore Now</Link>
                </div>
              </div>
            </div>
        </>
    );
};

export default WelcomeThumb;