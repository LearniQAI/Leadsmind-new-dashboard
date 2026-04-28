import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { ITransfer } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { toast } from "sonner";
import { statePropsType } from "@/interface/common.interface";
const AddNewTransferModal = ({ open, setOpen }: statePropsType) => {
  const [selectTransferDate, setSelectTransferDate] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ITransfer>();

  const onSubmit = async (data: ITransfer) => {
    try {
      toast.success("Transfer added successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Transfer. Please try again!"
      );
    }
  };
  const handleToggle = () => setOpen(!open);
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Transfer</h5>
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
              <div className="grid grid-cols-12 gap-y-5 gap-x-5 maxXs:gap-x-0">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Prev Branch"
                    id="prevBranch"
                    type="text"
                    register={register("prevBranch", {
                      required: "Prev Branch is required",
                    })}
                    error={errors.prevBranch}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="New Branch"
                    id="newBranch"
                    type="text"
                    register={register("newBranch", {
                      required: "New Branch is required",
                    })}
                    error={errors.newBranch}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Department "
                    id="department"
                    type="text"
                    register={register("department", {
                      required: "Department is required",
                    })}
                    error={errors.department}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Transfer Date" id="selectTransferDate" />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectTransferDate"
                      selected={selectTransferDate}
                      onChange={(date) => setSelectTransferDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Transfer date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Description"
                    id="description"
                    isTextArea={true}
                    required={true}
                    register={register("description", {
                      required: "Description is required",
                    })}
                    error={errors.description}
                  />
                </div>
              </div>
            </div>
            <div className="submit__btn flex items-center justify-end gap-[10px]">
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleToggle}
              >
                Cancel
              </button>
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

export default AddNewTransferModal;
