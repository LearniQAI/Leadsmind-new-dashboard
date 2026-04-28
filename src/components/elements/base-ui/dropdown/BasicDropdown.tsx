import Link from 'next/link';
import React from 'react';

const BasicDropdown = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Basic Dropdown</h5>
                </div>
                <div className="">
                    <div className="dropdown-basic">
                        <div className="dropdown">
                            <button className="dropbtn btn-primary" type="button">Dropdown Button <span><i
                                className="icon-arrow-down"></i></span></button>
                            <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link></div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default BasicDropdown;