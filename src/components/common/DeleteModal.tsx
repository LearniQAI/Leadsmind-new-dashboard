"use client";
import React from "react";
import { Dialog, DialogContent } from "@mui/material";
import ModalWarningSvg from "@/svg/ModalWarningSvg";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleDeleteFunc: (id: number) => void;
  deleteId: number;
}

const DeleteModal = ({
  open,
  setOpen,
  handleDeleteFunc,
  deleteId,
}: statePropsType) => {
  const handleToggle = () => setOpen(!open);

  const handleDelete = () => {
    handleDeleteFunc(deleteId); // Trigger delete function with deleteId
    setOpen(false); // Close the modal after confirming
  };

  const handleCancel = () => {
    setOpen(false); // Close the modal without deleting
  };

  return (
    <Dialog
      open={open}
      onClose={handleToggle}
      fullWidth
      maxWidth="sm"
      sx={{
        "& .MuiDialog-paper": {
          width: "350px",
        },
      }}
    >
      <DialogContent>
        <div className="flex flex-col items-center text-center">
          <div className="bg-orange-100 text-orange-500 rounded-full p-4 mb-4">
            <ModalWarningSvg />
          </div>
          <h2 className="text-lg font-semibold text-gray-800">Are you sure?</h2>
          <p className="text-sm text-gray-600">
            You {`won't`} be able to revert this!
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <button onClick={handleCancel} className="btn bg-gray-200">
            Cancel
          </button>
          <button onClick={handleDelete} className="btn btn-primary !m-0">
            Yes, delete it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DeleteModal;
