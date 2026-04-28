import Link from 'next/link';
import React from 'react';

const BasicColorDropdown = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Basic Color Dropdown</h5>
                </div>
                <div className="">
                    <div className="dropdown-basic flex flex-wrap items-center gap-1">
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-primary" type="button">Action <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-secondary" type="button">Action <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-success" type="button">Action <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-info" type="button">Action <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-warning txt-dark" type="button">Action <span><i
                                    className="icon-arrow-down"></i></span></button>
                                <div className="dropdown-content"><Link href="#">Action</Link><Link href="#">Another Action</Link><Link href="#">Something Else Here</Link><Link href="#">Separated Link </Link></div>
                            </div>
                        </div>
                        <div className="dropdown">
                            <div className="btn-group mb-0">
                                <button className="dropbtn btn-danger" type="button">Action <span><i
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

export default BasicColorDropdown;