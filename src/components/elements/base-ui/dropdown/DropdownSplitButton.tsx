import Link from 'next/link';
import React from 'react';

const DropdownSplitButton = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Dropdown Split Button</h5>
                </div>
                <div className="">
                    <div className="dropdown-basic flex items-center flex-wrap gap-1">

                        <div className="btn-group">
                            <button className="btn btn-primary" type="button">Primary Button</button>
                            <div className="dropdown separated-btn dropdown-spit-btn">
                                <button className="btn btn-primary" type="button"><i className="icon-arrow-down"></i></button>
                                <div className="dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link><Link href="#">Link 3</Link>
                                </div>
                            </div>
                        </div>
                        <div className="btn-group">
                            <button className="btn btn-secondary" type="button">Secondary Button</button>
                            <div className="dropdown separated-btn dropdown-spit-btn">
                                <button className="btn btn-secondary" type="button"><i className="icon-arrow-down"></i></button>
                                <div className="dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link><Link href="#">Link 3</Link>
                                </div>
                            </div>
                        </div>
                        <div className="btn-group">
                            <button className="btn btn-success" type="button">Success Button</button>
                            <div className="dropdown separated-btn dropdown-spit-btn">
                                <button className="btn btn-success" type="button"><i className="icon-arrow-down"></i></button>
                                <div className="dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link><Link href="#">Link 3</Link>
                                </div>
                            </div>
                        </div>
                        <div className="btn-group">
                            <button className="btn btn-info" type="button">Info Button</button>
                            <div className="dropdown separated-btn dropdown-spit-btn">
                                <button className="btn btn-info" type="button"><i className="icon-arrow-down"></i></button>
                                <div className="dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link><Link href="#">Link 3</Link>
                                </div>
                            </div>
                        </div>
                        <div className="btn-group">
                            <button className="btn btn-warning" type="button">Warning Button</button>
                            <div className="dropdown separated-btn dropdown-spit-btn">
                                <button className="btn btn-warning" type="button"><i className="icon-arrow-down"></i></button>
                                <div className="dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link><Link href="#">Link 3</Link>
                                </div>
                            </div>
                        </div>
                        <div className="btn-group">
                            <button className="btn btn-danger" type="button">Danger Button</button>
                            <div className="dropdown separated-btn dropdown-spit-btn">
                                <button className="btn btn-danger" type="button"><i className="icon-arrow-down"></i></button>
                                <div className="dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link><Link href="#">Link 3</Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DropdownSplitButton;