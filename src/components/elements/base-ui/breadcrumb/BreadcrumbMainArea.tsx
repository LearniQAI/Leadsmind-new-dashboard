import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import Link from 'next/link';
import React from 'react';

const BreadcrumbMainArea = () => {
    return (
        <>
           {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Breadcrumb' subTitle='Ui Elements'/>
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Theme Breadcrumb</h5>
                            </div>
                            <div className="">
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb breadcrumb-spacing">
                                        <li className="breadcrumb-item active" aria-current="page">Home</li>
                                    </ol>
                                </nav>
                                <nav aria-label="breadcrumb"> 
                                    <ol className="breadcrumb flex items-center breadcrumb-spacing">
                                        <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Library</li>
                                    </ol>
                                </nav>
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb flex items-center mb-0">
                                        <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                        <li className="breadcrumb-item"><Link href="#">Library</Link></li>
                                        <li className="breadcrumb-item active" aria-current="page">Data</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Theme Breadcrumb with Icon</h5>
                            </div>
                            <div className="">
                                <nav aria-label="breadcrumb">
                                    <ol className="breadcrumb breadcrumb-style2 flex items-center mb-0">
                                        <li className="breadcrumb-item"><Link href="#"><i
                                                    className="icon-house me-1 text-[15px] d-inline-block"></i>Home</Link></li>
                                        <li className="breadcrumb-item"><Link href="#"><i
                                                    className="icon-grid-2-plus me-1 text-[15px] d-inline-block"></i>About</Link>
                                        </li>
                                        <li className="breadcrumb-item active" aria-current="page">Services</li>
                                    </ol>
                                </nav>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Colored Breadcrumb</h5>
                            </div>
                            <div className="">
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-primary mb-[20px]">
                                    <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                    <li className="breadcrumb-item active" aria-current="page">Library</li>
                                </ol>
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-secondary mb-[20px]">
                                    <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                    <li className="breadcrumb-item active" aria-current="page">Library</li>
                                </ol>
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-success mb-[20px]">
                                    <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                    <li className="breadcrumb-item active" aria-current="page">Library</li>
                                </ol>
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-info mb-[20px]">
                                    <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                    <li className="breadcrumb-item active" aria-current="page">Library</li>
                                </ol>
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-warning mb-[20px]">
                                    <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                    <li className="breadcrumb-item active" aria-current="page">Library</li>
                                </ol>
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-danger mb-[20px]">
                                    <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                    <li className="breadcrumb-item active" aria-current="page">Library</li>
                                </ol>
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-light dark:bg-light-dark mb-[20px]">
                                    <li className="breadcrumb-item"><Link href="#">Home</Link></li>
                                    <li className="breadcrumb-item active" aria-current="page">Library</li>
                                </ol>
                                <ol className="breadcrumb flex items-center breadcrumb-colored bg-dark dark:bg-dark-dark">
                                    <li className="breadcrumb-item dark:!text-headingPrimary dark:before:!text-headingPrimary"><Link href="#" className='dark:!text-headingPrimary'>Home</Link></li>
                                    <li className="breadcrumb-item active dark:!text-headingPrimary dark:before:!text-headingPrimary" aria-current="page">Library</li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default BreadcrumbMainArea;