"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, } from "@mui/material";
import { statePropsType } from "@/interface/common.interface";
import CloseIcon from "@mui/icons-material/Close";

const ExtraLargeModal = ({ open, setOpen }: statePropsType) => {
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleToggle}
        fullWidth
        maxWidth="xl"
        aria-labelledby="extra-large-modal-title"
        aria-describedby="extra-large-modal-description"
        sx={{
          "& .MuiDialog-paper": {
            height: "100%",
            margin: 0,
          },
        }}
      >
        <DialogTitle id="extra-large-modal-title">
          <div className="flex justify-between items-center">
            <h5>Extra Large Modal</h5>
            <IconButton onClick={handleToggle}>
              <CloseIcon />
            </IconButton>
          </div>
        </DialogTitle>
        <DialogContent id="extra-large-modal-description" className="common-scrollbar overflow-y-auto">
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

export default ExtraLargeModal;
