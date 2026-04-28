
import React from 'react';
import { Snackbar, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { IToastProps } from '@/interface/common.interface';

const ToastVariationFive = ({ open, setOpen }:IToastProps) => {

  // Snackbar close control
  const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <Snackbar
        open={open}
        onClose={handleClose}
        className="toast__container"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        autoHideDuration={5000}
      >
        <div className='toast_wrapper_content'>
          <div className="toast__content toast_style">
            <div className='close_area'>
            <strong className="title">Hello, world! This is a toast message.</strong>
              <IconButton className="closeIcon" size="small" onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </div>
          </div>
        </div>
      </Snackbar>
    </>
  );
};

export default ToastVariationFive;
