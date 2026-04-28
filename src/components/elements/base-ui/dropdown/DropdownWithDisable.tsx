import Link from 'next/link';
import React from 'react';

const DropdownWithDisable = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Dropdown With Disable</h5>
                </div>
                <div className="">
                    <div className="dropup-basic dropdown-basic">
                        <div className="dropup dropdown">
                            <button className="dropbtn btn-primary" type="button">Dropdown Button <span><i
                                className="icofont icofont-arrow-up"></i></span></button>
                            <div className="dropup-content dropdown-content"><Link href="#">Normal</Link><Link className="active" href="#">Active</Link><Link className="disabled" href="#">Disabled</Link></div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default DropdownWithDisable;