

import React from 'react';
import { Snackbar } from '@mui/material';
import { IToastProps } from '@/interface/common.interface';

const ToastVariationFour = ({ open, setOpen }: IToastProps) => {
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
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        open={open}
        autoHideDuration={5000}
        onClose={handleClose}
        message="Hello, world! This is a toast message."
        ContentProps={{
          sx: {
            backgroundColor: '#6C5FFC',
            color: 'white',
          },
        }}
      />

    </>
  );
};

export default ToastVariationFour;
