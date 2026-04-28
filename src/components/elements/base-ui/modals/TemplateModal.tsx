
"use client"
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import React, { useState } from 'react';
import CloseIcon from "@mui/icons-material/Close";

const TemplateModal = () => {
    const [open, setOpen] = useState(false);
    const handleToggle = () => setOpen(!open);

    return (
        <>
            <div className="card__wrapper no-height">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Template Modal</h5>
                </div>
                <div>
                    <div className="">
                        <button onClick={() => setOpen(true)} type="button" className="btn btn-primary">Template Modal</button>
                    </div>
                </div>
            </div>

            {/* -- Material Dialog -- */}
            <Dialog open={open} onClose={handleToggle} maxWidth={false}
                sx={{
                    '& .MuiDialog-paper': {
                        width: '700px',
                    },
                }}>
                <DialogTitle>
                    <div className="flex justify-between items-center">
                        <h5 className="modal-title">Add New Client</h5>
                        <IconButton onClick={handleToggle}>
                            <CloseIcon />
                        </IconButton>
                    </div>
                </DialogTitle>
                <DialogContent className="common-scrollbar overflow-y-auto">
                    <form action="#">
                        <div className="card__wrapper mb-20">
                            <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0 items-center justify-center">
                                <div className="col-span-12">
                                    <div className="from__input-box">
                                        <div className="form__input-title">
                                            <label htmlFor="address">
                                               Modal Content
                                            </label>
                                        </div>
                                        <div className="form__input">
                                            <textarea
                                                className="form-control"
                                                name="address"
                                                id="address"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="submit__btn text-center">
                            <button className="btn btn-primary">Submit</button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default TemplateModal;
