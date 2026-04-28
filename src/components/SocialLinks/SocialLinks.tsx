import Link from 'next/link';
import React from 'react';

const SocialLinks = () => {
    return (
        <>
            <div className="common-social">
                <Link href="https://www.facebook.com/" target="_blank"><i className="fa-brands fa-facebook-f"></i></Link>
                <Link href="https://twitter.com/" target="_blank"><i className="fa-brands fa-x-twitter"></i></Link>
                <Link href="https://www.linkedin.com/" target="_blank"><i className="fa-brands fa-linkedin-in"></i></Link>
                <Link href="https://www.youtube.com/" target="_blank"><i className="fa-brands fa-youtube"></i></Link>
            </div>
        </>
    );
};

export default SocialLinks;