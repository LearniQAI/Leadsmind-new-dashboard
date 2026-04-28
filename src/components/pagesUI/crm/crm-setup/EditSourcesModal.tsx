"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IPipeline } from "@/interface/table.interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import { useForm } from "react-hook-form";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IPipeline;
}

const EditSourcesModal = ({ open, setOpen, editData }: statePropsType) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IPipeline>();

  const onSubmit = async (data: IPipeline) => {};
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm" sx={{
          "& .MuiDialog-paper": {
            width: "500px",
          },
        }}>
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Edit Source</h5>
            <button
              onClick={handleToggle}
              type="button"
              className="bd-btn-close"
            >
              <i className="fa-solid fa-xmark-large"></i>
            </button>
          </div>
        </DialogTitle>
        <DialogContent className="common-scrollbar overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card__wrapper">
              <InputField
                label="Source Name"
                id="pipeline"
                type="text"
                defaultValue={editData?.pipeline}
                register={register("pipeline", {
                  required: "Source Name is required",
                })}
                error={errors.pipeline}
              />
            </div>
            <div className="submit__btn text-center">
              <button
                type="button"
                className="btn btn-danger me-[5px]"
                onClick={handleToggle}
              >
                Close
              </button>
              <button type="submit" className="btn btn-primary">
                Save changes
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditSourcesModal;
