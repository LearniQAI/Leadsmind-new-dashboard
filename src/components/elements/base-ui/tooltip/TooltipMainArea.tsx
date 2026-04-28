
import React from 'react';
import { Tooltip } from '@mui/material';
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import Link from 'next/link';

const TooltipMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Tooltip' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    {/* Inline-Text Tooltip */}
                    <div className="col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Inline-Text Tooltip</h5>
                            </div>
                            <div>
                                <p className="mb-0">This is an example paragraph to showcase some
                                    <Tooltip title="Additional Information" placement="top" arrow>
                                        <Link href="#" className="text-primary"> inline links</Link>
                                    </Tooltip> with tooltips. The text here serves as a demonstration, providing context and substance. The main goal is to illustrate how
                                    <Tooltip title="Additional Information" placement="top" arrow>
                                        <Link href="#" className="text-primary"> these tooltips on links</Link>
                                    </Tooltip> can be effectively used in practice, whether on your
                                    <Tooltip title="Additional Information" placement="top" arrow>
                                        <Link href="#" className="text-primary"> own site</Link>
                                    </Tooltip> or project.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Basic Tooltip */}
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Basic Tooltip</h5>
                            </div>
                            <div className="btn-showcase">
                                <Tooltip className="custom-tooltip" title="Popover title" placement="top" arrow>
                                    <button className="btn btn-primary" type="button">Hover Me</button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>

                    {/* Directions Tooltip */}
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Directions Tooltip</h5>
                            </div>
                            <div className="btn-showcase flex flex-wrap gap-1">
                                <Tooltip className="custom-tooltip" title="Tooltip on top" placement="top" arrow>
                                    <button className="btn btn-primary" type="button">Tooltip on top</button>
                                </Tooltip>
                                <Tooltip className="custom-tooltip" title="Tooltip on right" placement="right" arrow>
                                    <button className="btn btn-primary" type="button" >Tooltip on right</button>
                                </Tooltip>
                                <Tooltip className="custom-tooltip" title="Tooltip on bottom" placement="bottom" arrow>
                                    <button className="btn btn-primary" type="button" >Tooltip on bottom</button>
                                </Tooltip>
                                <Tooltip className="custom-tooltip" title="Tooltip on left" placement="left" arrow>
                                    <button className="btn btn-primary" type="button" >Tooltip on left</button>
                                </Tooltip>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default TooltipMainArea;
