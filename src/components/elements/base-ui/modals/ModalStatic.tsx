import { IconButton } from '@mui/material';
import React from 'react';
import CloseIcon from "@mui/icons-material/Close";

const ModalStatic = () => {
    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-[20px]">
                    <h5 className="card__heading-title">Modal Static</h5>
                </div>
                <div className="">
                    <div className="modal modal static block">
                        <div className="modal-dialog flex justify-center modal-dialog-centered">
                            <div className="modal-content common-modal">
                                <div className="modal-header flex">
                                    <h5 className="modal-title">Modal title</h5>
                                    <IconButton>
                                        <CloseIcon />
                                    </IconButton>
                                </div>
                                <div className="modal-body">
                                    <form action="#">
                                        <div className="card__wrapper mb-[20px]">
                                            <div className="modal-body">
                                                <p>Modal body text goes here.</p>
                                            </div>
                                        </div>
                                        <div className="submit__btn text-center flex justify-center gap-1">
                                            <button type="button" className="btn btn-primary">Save
                                                changes</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ModalStatic;