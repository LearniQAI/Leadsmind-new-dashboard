"use client"
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import Link from 'next/link';
import React from 'react';

const PaginationMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Pagination' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-primary">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link>
                                    </li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination with icons</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-primary">
                                    <li className="page-item"><Link className="page-link" href="#" aria-label="Previous"><i
                                        className="fa-regular fa-chevrons-left"></i></Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#" aria-label="Next"><i
                                        className="fa-regular fa-chevrons-right"></i></Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination with active and disabled</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-primary">
                                    <li onClick={(e) => e.preventDefault()} className="page-item disabled"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item active"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination Alignment</h5>
                            </div>
                            <div className="mb-[20px]">
                                <nav>
                                    <ul className="pagination pagination-primary">
                                        <li className="page-item"><Link className="page-link" href="#">Previous</Link>
                                        </li>
                                        <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                    </ul>
                                </nav>
                            </div>
                            <div className="flex justify-center mb-[20px]">
                                <nav>
                                    <ul className="pagination pagination-primary">
                                        <li className="page-item"><Link className="page-link" href="#">Previous</Link>
                                        </li>
                                        <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                    </ul>
                                </nav>
                            </div>
                            <div className="flex justify-end">
                                <nav>
                                    <ul className="pagination pagination-primary">
                                        <li className="page-item"><Link className="page-link" href="#">Previous</Link>
                                        </li>
                                        <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                        <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                    </ul>
                                </nav>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination Primary Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-primary">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination Secondary Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-secondary">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination Success Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-success">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>

                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination info Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-info">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination warning Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-warning">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination danger Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-danger">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination light Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-light">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination dark Color</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-dark">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination XL size</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-lg pagination-primary flex-wrap">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-4">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Pagination SM size</h5>
                            </div>
                            <nav>
                                <ul className="pagination pagination-sm pagination-primary">
                                    <li className="page-item"><Link className="page-link" href="#">Previous</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">1</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">2</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">3</Link></li>
                                    <li className="page-item"><Link className="page-link" href="#">Next</Link></li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default PaginationMainArea;