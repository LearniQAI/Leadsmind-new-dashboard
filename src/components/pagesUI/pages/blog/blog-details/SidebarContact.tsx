import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import sidebarContactImg from "../../../../../../public/assets/images/blog/sidebar-img.png";

const SidebarContact = () => {
    return (
        <>
            <div className="sidebar-widget-banner relative">
                <div className="sidebar-widget-thumb relative">
                    <Image src={sidebarContactImg} style={{ width: "100%", height: "100%" }} priority alt="img" />
                </div>
                <div className="sidebar-widget-content">
                    <p>Free Consultation</p>
                    <h5 className="mb-[20px]"><Link href="tel:+0290848020">02 (908) 480-20</Link></h5>
                    <div className="sidebar-btn">
                        <Link className="btn btn-secondary" href="/contact">Contact Us</Link>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SidebarContact;