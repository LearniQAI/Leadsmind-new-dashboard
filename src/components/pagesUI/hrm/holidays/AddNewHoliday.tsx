"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { holidayDates } from "@/data/dropdown-data";
import { IHoliday } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const AddNewHoliday = ({ open, setOpen }: statePropsType) => {
  const [selectHolidayDate, setSelectHolidayDate] = useState<Date | null>(
    new Date()
  );
  const { register, handleSubmit, control, formState: { errors }} = useForm<IHoliday>();
  const handleToggle = () => setOpen(!open);

//handle submit form
  const onSubmit = async (data: IHoliday) => {
    try {
      // Simulate API call or processing
      toast.success("Add New holiday successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      // Show error toast message
      toast.error(
        error?.message || "An error occurred while updating the leave. Please try again!");
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
            <h5 className="modal-title">New Holidays</h5>
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
              <div className="grid grid-cols-12 items-center justify-center gap-y-6 gap-x-6 maxXs:gap-x-0">
                <div className="col-span-12">
                  <FormLabel label="Holiday Date" id="selectHolidayDate" />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectHolidayDate"
                      selected={selectHolidayDate}
                      onChange={(date) => setSelectHolidayDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Holiday date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12">
                  <SelectBox
                    id="holidayDay"
                    label="Holiday Day"
                    options={holidayDates}
                    control={control} // Validation rule
                    error={errors.day}
                  />
                </div>

                <div className="col-span-12">
                  <InputField
                    label="Holiday Name"
                    id="holidayName"
                    isTextArea={true}
                    register={register("holidayName", {
                      required: "Holiday Name is required",
                    })}
                    error={errors.holidayName}
                  />
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddNewHoliday;
