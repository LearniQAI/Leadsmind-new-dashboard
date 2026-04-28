import React from 'react';
import AccordionStyleOne from './AccordionStyleOne';
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import AccordionStyleTwo from './AccordionStyleTwo';
import AccordionStyleThree from './AccordionStyleThree';
import AccordionStyleFour from './AccordionStyleFour';
import AccordionStyleFive from './AccordionStyleFive';
import AccordionsStyleSix from './AccordionsStyleSix';
import AccordionsStyleSeven from './AccordionsStyleSeven';

const AccordionsMainArea = () => {
    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Accordions' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12">
                        <AccordionStyleOne />
                    </div>
                    <div className="col-span-12">
                        <AccordionStyleTwo />
                    </div>
                    <div className="col-span-12">
                        <AccordionStyleThree />
                    </div>
                    <div className="col-span-12">
                        <AccordionStyleFour />
                    </div>
                    <div className="col-span-12">
                        <AccordionStyleFive />
                    </div>
                    <div className="col-span-12">
                       <AccordionsStyleSix/>
                    </div>
                    <div className="col-span-12">
                        <AccordionsStyleSeven/>
                    </div>
                </div>
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default AccordionsMainArea;