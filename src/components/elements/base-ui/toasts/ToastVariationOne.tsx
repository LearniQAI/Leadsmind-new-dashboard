
import React from 'react';
import { Snackbar, IconButton } from '@mui/material';
import Image from 'next/image';
import CloseIcon from '@mui/icons-material/Close';
import image from "../../../../../public/assets/images/avatar/avatar.png";
import { IToastProps } from '@/interface/common.interface';

const ToastVariationOne = ({ open, setOpen }:IToastProps) => {

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
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        autoHideDuration={5000}
      >
        <div className='toast_wrapper_content'>
          <div className="toast__content">
            <div className="toast__content__avatar-wrapper">
              <Image src={image} width={36} height={36} className="avatar" alt="avatar" />
              <strong className="title">Material</strong>
            </div>
            <div className='close_area'>
              <small className="toast__meta">11 mins ago</small>
              <IconButton className="closeIcon" size="small" onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </div>
          </div>
          <div className="toast__footer">
            <p className="toast__message">Hello, world! This is a toast message.</p>
          </div>
        </div>
      </Snackbar>
    </>
  );
};

export default ToastVariationOne;
