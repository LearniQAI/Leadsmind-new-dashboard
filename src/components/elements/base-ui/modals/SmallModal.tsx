
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import React from 'react';
import CloseIcon from "@mui/icons-material/Close";

const SmallModal = ({ open, setOpen }: any) => {
    const handleToggle = () => setOpen(!open);
    return (
        <>
            <Dialog open={open} onClose={handleToggle} maxWidth={false}
                sx={{
                    '& .MuiDialog-paper': {
                        width: '300px',
                        height: "300px"
                    },
                }}>
                <DialogTitle>
                    <div className="flex justify-between items-center">
                        <h5 className="modal-title">Small Model</h5>
                        <IconButton onClick={handleToggle}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                </DialogTitle>
                <DialogContent className="common-scrollbar overflow-y-auto">
                <div className="modal-content-wrapper  border-b border-borderLightest">
            <p>This is a vertically centered modal.</p>
          </div>
          <div className="flex justify-end gap-2.5 mt-5">
            <button type="submit" className="btn btn-secondary" onClick={handleToggle}>close</button>
            <button type="submit" className="btn btn-primary">Save changes</button>
          </div>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SmallModal;
