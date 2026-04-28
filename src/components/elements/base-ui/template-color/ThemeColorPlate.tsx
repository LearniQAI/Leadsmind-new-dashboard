import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';

const ThemeColorPlate = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
              <Breadcrumb breadTitle='Color Plate' subTitle='Ui Elements'/>
                <div className="grid grid-cols-12">
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Theme Color Plate</h5>
                            </div>
                            <div className="">
                                <div className="grid grid-cols-12 gy-20 gap-x-6 maxXs:gap-x-0">
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-primary text-center">
                                            <h5 className="text-white dark:text-white-dark">Primary </h5>
                                            <div className="color-name">
                                                <span>#6C5FFC</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-secondary text-center">
                                            <h5 className="text-white dark:text-white-dark">Secondary</h5>
                                            <div className="color-name">
                                                <span>#1ABC9C</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-success text-center">
                                            <h5 className="text-white dark:text-white-dark">Success</h5>
                                            <div className="color-name">
                                                <span>#34B53A</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-info text-center">
                                            <h5 className="text-white dark:text-white-dark">Info</h5>
                                            <div className="color-name">
                                                <span>#0dcaf0</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-warning text-center">
                                            <h5 className="text-white dark:text-white-dark">Warning</h5>
                                            <div className="color-name">
                                                <span>#FFB200</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-danger text-center">
                                            <h5 className="text-white dark:text-white-dark">Danger</h5>
                                            <div className="color-name">
                                                <span>#FF3A29</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-light text-center">
                                            <h5 className="text-dark">Light</h5>
                                            <div className="color-name">
                                                <span>#B8B8B8</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="col-span-12 sm:col-span-4 md:col-span-3 xxl:col-span-2">
                                        <div className="card-body mb-0 bg-dark dark:bg-white text-center">
                                            <h5 className="text-white dark:text-white-dark">Dark</h5>
                                            <div className="color-name">
                                                <span className='text-white dark:text-white-dark'>#2E2E2E</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default ThemeColorPlate;