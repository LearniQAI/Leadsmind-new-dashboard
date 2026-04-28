import Link from 'next/link';
import React from 'react';

const DropdownWithDropUp = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Dropdown With DropUp</h5>
                </div>
                <div className="">
                    <div className="dropup-basic dropdown-basic">
                        <div className="dropup dropdown">
                            <button className="dropbtn btn-primary" type="button">Dropdown Button <span><i
                                className="icofont icofont-arrow-up"></i></span></button>
                            <div className="dropup-content dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link></div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DropdownWithDropUp;