
import { statePropsType } from '@/interface/common.interface';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import React from 'react';
import CloseIcon from "@mui/icons-material/Close";

const LargeModal = ({ open, setOpen }: statePropsType) => {
    const handleToggle = () => setOpen(!open);

    return (
        <>
            <Dialog open={open} onClose={handleToggle} maxWidth={false}
                sx={{
                    '& .MuiDialog-paper': {
                        width: '500px',
                        height: "500px"
                    },
                }}>
                <DialogTitle>
                    <div className="flex justify-between items-center">
                        <h5 className="modal-title">Large Model</h5>
                        <IconButton onClick={handleToggle} aria-label="close">
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

export default LargeModal;