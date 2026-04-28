"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import InputField from "@/components/elements/SharedInputs/InputField";
import { useForm } from "react-hook-form";
import {
  designationStatePropsType,
  IDesignationsData,
} from "@/interface/common.interface";
import { toast } from "sonner";
import { employeeDesignationData } from "@/data/dropdown-data";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";

const DesignationUpdateModal = ({
  open,
  setOpen,
  editData,
}: designationStatePropsType) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IDesignationsData>();
  const handleToggle = () => setOpen(!open);

  // Handle form submission
  const onSubmit = async (data: IDesignationsData) => {
    try {
      toast.success("Designation updated successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error) {
      toast.error("Failed to update designation. Please try again.");
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleToggle}
        fullWidth
        maxWidth="sm"
        sx={{ "& .MuiDialog-paper": { width: "500px" } }}
      >
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Designation Edit</h5>
            <button
              onClick={handleToggle}
              type="button"
              className="bd-btn-close"
            >
              <i className="fa-solid fa-xmark-large"></i>
            </button>
          </div>
        </DialogTitle>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card__wrapper">
              <div className="grid grid-cols-12 items-center justify-center gap-y-4 gap-x-3">
                <div className="col-span-12">
                  <InputField
                    label="Department"
                    id="department "
                    type="text"
                    required={false}
                    defaultValue={editData?.department}
                    register={register("department")}
                    error={errors.department}
                  />
                </div>
                <div className="col-span-12">
                  <SelectBox
                    id="designation"
                    label="Designation"
                    options={employeeDesignationData}
                    control={control}
                    isRequired={false}
                    defaultValue={editData?.designation}
                  />
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button className="btn btn-primary" type="submit">
                Submit
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DesignationUpdateModal;
