import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { ITransfer } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { toast } from "sonner";
import { transferStatePropsType } from "@/interface/common.interface";

const UpdateTransferModal = ({
  open,
  setOpen,
  editData,
}: transferStatePropsType) => {
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
      toast.success("Transfer update successfully!");
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
    <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
      <DialogTitle>
        <div className="flex justify-between">
          <h5 className="modal-title">Edit Transfer</h5>
          <button onClick={handleToggle} type="button" className="bd-btn-close">
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
                  defaultValue={editData?.prevBranch}
                  required={false}
                  register={register("prevBranch")}
                  error={errors.prevBranch}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <InputField
                  label="New Branch"
                  id="newBranch"
                  defaultValue={editData?.newBranch}
                  type="text"
                  required={false}
                  register={register("newBranch")}
                  error={errors.newBranch}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <InputField
                  label="Department "
                  id="department"
                  defaultValue={editData?.department}
                  type="text"
                  required={false}
                  register={register("department")}
                  error={errors.department}
                />
              </div>
              <div className="col-span-12 md:col-span-6">
                <FormLabel
                  label="Transfer Date"
                  id="selectTransferDate"
                  optional
                />
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
                  defaultValue={editData?.description}
                  isTextArea={true}
                  required={false}
                  register={register("description")}
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
  );
};

export default UpdateTransferModal;
