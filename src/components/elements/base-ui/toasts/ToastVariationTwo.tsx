
import React from 'react';
import { Snackbar, Alert } from '@mui/material';
import { IToastProps } from '@/interface/common.interface';

const ToastVariationTwo = ({ open, setOpen}:IToastProps) => {
  // Snackbar close control
  const handleClose = (event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpen(false);
  };

  return (
    <>
      <Snackbar  anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} open={open} autoHideDuration={6000} onClose={handleClose}>
        <Alert
          onClose={handleClose}
          severity="success"
          variant="filled"
          sx={{ width: '100%' }}
        >
          This is a success Alert inside a Snackbar!
        </Alert>
      </Snackbar>
    </>
  );
};

export default ToastVariationTwo;
