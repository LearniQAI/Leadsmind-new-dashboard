import Link from 'next/link';
import React from 'react';

const SocialProfile = () => {
    return (
        <>
            <div className="company__info-list">
                <h5 className="company__info-list-title">Social Profile</h5>
                <div className="company__social">
                    <Link className="company__social-icon" href="#"><i
                        className="fa-brands fa-square-facebook"></i></Link>
                    <Link className="company__social-icon" href="#"><i
                        className="fa-brands fa-linkedin"></i></Link>
                    <Link className="company__social-icon" href="#"><i
                        className="fa-brands fa-square-x-twitter"></i></Link>
                    <Link className="company__social-icon" href="#"><i
                        className="fa-brands fa-square-youtube"></i></Link>
                    <Link className="company__social-icon" href="#"><i
                        className="fa-brands fa-square-instagram"></i></Link>
                    <Link className="company__social-icon" href="#"><i
                        className="fa-brands fa-square-whatsapp"></i></Link>
                    <Link className="company__social-icon" href="#"><i
                        className="fa-brands fa-square-pinterest"></i></Link>
                </div>
            </div>
        </>
    );
};

export default SocialProfile;