"use client"
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import ToastVariationOne from './ToastVariationOne';
import ToastVariationTwo from './ToastVariationTwo';
import ToastVariationThree from './ToastVariationThree';
import ToastVariationFour from './ToastVariationFour';
import ToastVariationFive from './ToastVariationFive';
import ToastVariationSix from './ToastVariationSix';
import { useState } from 'react';

const ToastsMainArea = () => {
    const [open, setOpen] = useState(false);
    const [toastType, setToastType] = useState<string | null>(null);

    // Snackbar open control
    const handleClick = (type: string) => () => {
        setToastType(type);
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setToastType(null);
    };

    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Toasts' subTitle='Toasts UI Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6 xxl:col-span-12">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Custom Toaster</h5>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <button onClick={handleClick("variationOne")} className="btn btn-primary">Show Top Center</button>
                                <button onClick={handleClick("variationTwo")} className="btn btn-primary">Show Bottom Center</button>
                                <button onClick={handleClick("variationThree")} className="btn btn-primary">Show Bottom Left</button>
                                <button onClick={handleClick('variationFour')} className="btn btn-primary">Show Top Left</button>
                                <button onClick={handleClick('variationFive')} className="btn btn-primary">Show Top Right</button>
                                <button onClick={handleClick("variationSix")} className="btn btn-primary">Show Bottom Right</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}

            {/* Conditionally render the selected toast variation */}
            {open && toastType === 'variationOne' && (
                <ToastVariationOne open={open} setOpen={handleClose} />
            )}
            {open && toastType === 'variationTwo' && (
                <ToastVariationTwo open={open} setOpen={handleClose} />
            )}
            {open && toastType === 'variationThree' && (
                <ToastVariationThree open={open} setOpen={handleClose} />
            )}
            {open && toastType === 'variationFour' && (
                <ToastVariationFour open={open} setOpen={handleClose} />
            )}
            {open && toastType === 'variationFive' && (
                <ToastVariationFive open={open} setOpen={handleClose} />
            )}
            {open && toastType === 'variationSix' && (
                <ToastVariationSix open={open} setOpen={handleClose} />
            )}
        </>
    );
};

export default ToastsMainArea;
