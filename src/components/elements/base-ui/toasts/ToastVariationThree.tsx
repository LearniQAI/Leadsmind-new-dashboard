
import React from 'react';
import { Snackbar } from '@mui/material';
import { IToastProps } from '@/interface/common.interface';

const ToastVariationThree = ({ open, setOpen}:IToastProps) => {
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
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        message="Hello, world! This is a toast message."
      />

    </>
  );
};

export default ToastVariationThree;
