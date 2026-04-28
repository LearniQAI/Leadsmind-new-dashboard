import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import React from 'react';

const VideosMainArea = () => {
    return (
        <>
          {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Video' subTitle='Ui Elements'/>
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper no-height">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title mb-2.5">Responsive embed video 21x9</h5>
                                <p>Use class <code>.ratio-21x9</code></p>
                            </div>
                            <div className="">
                                <div className="ratio ratio-21x9">
                                    <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
                                </div>
                            </div>
                        </div>

                        <div className="card__wrapper no-height">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title mb-2.5">Responsive embed video 4x3</h5>
                                <p>Use class <code>.ratio-4x3</code></p>
                            </div>
                            <div className="">
                                <div className="ratio ratio-4x3">
                                    <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper no-height">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title mb-2.5">Responsive embed video 16x9</h5>
                                <p>Use class <code>.ratio-16x9</code></p>
                            </div>
                            <div className="">
                                <div className="ratio ratio-16x9">
                                    <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
                                </div>
                            </div>
                        </div>
                        <div className="card__wrapper no-height">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title mb-2.5">Custom ratios 2x1</h5>
                                <p>Use class <code>{`style="--bs-aspect-ratio: 50%;"`}</code></p>
                            </div>
                            <div className="">
                                <div className="ratio aspect-ratio">
                                    <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
                                </div>
                            </div>
                        </div>
                    </div>
            
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title mb-2.5">Responsive embed video 1x1</h5>
                                <p>Use class <code>.ratio-1x1</code></p>
                            </div>
                            <div className="">
                                <div className="ratio ratio-1x1">
                                    <iframe src="https://www.youtube.com/embed/IyR_uYsRdPs?si=cRVsyYlGOP9dL066"></iframe>
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

export default VideosMainArea;