import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import InputField from "@/components/elements/SharedInputs/InputField";
import { useForm } from "react-hook-form";
import { IDesignationsData, statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { employeeDesignationData } from "@/data/dropdown-data";

const AddNewDesignationModal = ({ open, setOpen }: statePropsType) => {
  const { register, handleSubmit,control, formState: { errors }, } = useForm<IDesignationsData>();
  const handleToggle = () => setOpen(!open);

  //handle submit form
  const onSubmit = async (data: IDesignationsData) => {
    try {
      toast.success("Designation added successfully! 🎉");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Failed to add designation. Please try again.";
      toast.error(errorMessage);
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm"
        sx={{"& .MuiDialog-paper": { width: "500px" }}}>
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Designation</h5>
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
              <div className="grid grid-cols-12 items-center justify-center gap-y-3 gap-x-3">
                <div className="col-span-12">
                  <InputField
                    label="Department"
                    id="department "
                    type="text"
                    register={register("department", {
                      required: "Department Name is required",
                    })}
                    error={errors.department}
                  />
                </div>
                <div className="col-span-12">
                <SelectBox
                    id="designation"
                    label="Designation"
                    options={employeeDesignationData}
                    control={control}
                    error={errors.designation}
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

export default AddNewDesignationModal;
