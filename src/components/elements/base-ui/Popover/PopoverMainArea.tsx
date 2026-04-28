"use client"
import Breadcrumb from '@/common/Breadcrumb/breadcrumb';
import PopoverVariationOne from './PopoverVariationOne';
import PopoverVariationTwo from './PopoverVariationTwo';
import React from 'react';

const PopoverMainArea = () => {
 // State for PopoverVariationOne
 const [anchorElOne, setAnchorElOne] = React.useState<HTMLButtonElement | null>(null);
 const [positionOne, setPositionOne] = React.useState('');

 // State for PopoverVariationTwo
 const [anchorElTwo, setAnchorElTwo] = React.useState<HTMLButtonElement | null>(null);
 const [positionTwo, setPositionTwo] = React.useState('');

 // Handlers for PopoverVariationOne
 const handleClickOne = (event: React.MouseEvent<HTMLButtonElement>, pos: string) => {
     setAnchorElOne(event.currentTarget);
     setPositionOne(pos);
 };

 const handleCloseOne = () => {
     setAnchorElOne(null);
     setPositionOne('');
 };

 // Handlers for PopoverVariationTwo
 const handleClickTwo = (event: React.MouseEvent<HTMLButtonElement>, pos: string) => {
     setAnchorElTwo(event.currentTarget);
     setPositionTwo(pos);
 };

 const handleCloseTwo = () => {
     setAnchorElTwo(null);
     setPositionTwo('');
 };

 // Open states
 const openOne = Boolean(anchorElOne);
 const openTwo = Boolean(anchorElTwo);

    return (
        <>
            {/* -- App side area start -- */}
            <div className="app__slide-wrapper">
                <Breadcrumb breadTitle='Popover' subTitle='Ui Elements' />
                <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Popover Basic Directions</h5>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <button onClick={(event) => handleClickOne(event, 'top')} type="button" className="btn btn-primary">Popover on top</button>
                                <button onClick={(event) => handleClickOne(event, 'right')} type="button" className="btn btn-primary">Popover on right</button>
                                <button onClick={(event) => handleClickOne(event, 'bottom')} type="button" className="btn btn-primary">Popover on bottom</button>
                                <button onClick={(event) => handleClickOne(event, 'left')} type="button" className="btn btn-primary">Popover on left</button>
                            </div>
                        </div>
                    </div>
                    <div className="col-span-12 xl:col-span-6">
                        <div className="card__wrapper">
                            <div className="card__title-wrap mb-[20px]">
                                <h5 className="card__heading-title">Popover without Header</h5>
                            </div>
                            <div className="flex flex-wrap items-center gap-1">
                                <button onClick={(event) => handleClickTwo(event, 'top')} type="button" className="btn btn-primary">Popover on top</button>
                                <button onClick={(event) => handleClickTwo(event, 'right')} type="button" className="btn btn-primary">Popover on right</button>
                                <button onClick={(event) => handleClickTwo(event, 'bottom')} type="button" className="btn btn-primary">Popover on bottom</button>
                                <button onClick={(event) => handleClickTwo(event, 'left')} type="button" className="btn btn-primary">Popover on left</button>
                            </div>
                        </div>
                    </div>
                </div>
                  {/* Popover Components */}
                  <PopoverVariationOne 
                    anchorEl={anchorElOne} 
                    open={openOne} 
                    handleClose={handleCloseOne} 
                    position={positionOne} 
                />
                <PopoverVariationTwo 
                    anchorEl={anchorElTwo} 
                    open={openTwo} 
                    handleClose={handleCloseTwo} 
                    position={positionTwo} 
                />
            </div>
            {/* -- App side area end -- */}
        </>
    );
};

export default PopoverMainArea;