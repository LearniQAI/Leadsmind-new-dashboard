import Link from 'next/link';
import React from 'react';

const RoundedDropdown = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Rounded Dropdown</h5>
                </div>
                <div className="">
                    <div className="dropdown-basic flex flex-wrap items-center gap-1">
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-primary rounded-[50rem]" type="button">Primary Button <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-secondary rounded-[50rem]" type="button">Secondary Button <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-success rounded-[50rem]" type="button">Success Button <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-info rounded-[50rem]" type="button">Info Button <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-warning txt-dark rounded-[50rem]" type="button">Warning Button <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-danger rounded-[50rem]" type="button">Danger Button <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RoundedDropdown;