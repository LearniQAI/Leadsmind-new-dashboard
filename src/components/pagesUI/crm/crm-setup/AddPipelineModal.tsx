"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useForm } from "react-hook-form";
import { IPipeline } from "@/interface/table.interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const AddPipelineModal = ({ open, setOpen }: statePropsType) => {
  const { register, handleSubmit, formState: { errors } } = useForm<IPipeline>();
  const handleToggle = () => setOpen(!open);

  //handle submit form
  const onSubmit = async (data: IPipeline) => {
    try {
      // Simulate API call or processing
      toast.success("Add pipeline successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message || "An error occurred while add the pipeline. Please try again!");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            width: "500px",
          },
        }}
      >
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add Pipeline</h5>
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
                label="Pipeline Name"
                id="pipeline"
                type="text"
                register={register("pipeline", {
                  required: "Pipeline Name is required",
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

export default AddPipelineModal;
