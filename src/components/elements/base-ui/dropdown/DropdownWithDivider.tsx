import Link from 'next/link';
import React from 'react';

const DropdownWithDivider = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Dropdown With Divider</h5>
                </div>
                <div className="">
                    <div className="dropdown-basic">
                        <div className="dropdown">
                            <button className="dropbtn btn-primary" type="button">Dropdown Button <span><i
                                className="icon-arrow-down"></i></span></button>
                            <div className="dropdown-content"><Link href="#">Link 1</Link><Link href="#">Link 2</Link><Link href="#">Link 3</Link><Link href="#">Another Link</Link></div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DropdownWithDivider;