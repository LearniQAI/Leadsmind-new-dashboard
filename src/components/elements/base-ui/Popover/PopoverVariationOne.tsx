import * as React from 'react';
import Popover from '@mui/material/Popover';

const PopoverVariationOne = ({ anchorEl, open, handleClose, position }: any) => {
    return (
        <>
            <div className='popover-wrapper'>
                <Popover
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: position === 'top' ? 'top' : position === 'bottom' ? 'bottom' : 'center',
                        horizontal: position === 'left' ? 'left' : position === 'right' ? 'right' : 'center',
                    }}
                    transformOrigin={{
                        vertical: position === 'top' ? 'bottom' : position === 'bottom' ? 'top' : 'center',
                        horizontal: position === 'left' ? 'right' : position === 'right' ? 'left' : 'center',
                    }}
                    PaperProps={{
                        sx: {
                            boxShadow: 'none',
                            borderRadius: '8px',
                        },
                    }}
                >
                    <div className='popover'>
                        <div className='popover-arrow'>
                            <h3 className='popover-header'>Popover Title</h3>
                            <div className='popover-body'>
                                And {`here's`} some amazing content. {`It's`} very engaging. Right?
                            </div>
                        </div>
                    </div>
                </Popover>
            </div>
        </>
    );
};

export default PopoverVariationOne;
