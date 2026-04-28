"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IOvertimeRecord } from "@/interface/table.interface";
import employeeData from "@/data/hrm/employee-data";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import { IEmployee } from "@/interface";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import { toast } from "sonner";

const AddOverTimeModal = ({ open, setOpen }: statePropsType) => {
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(new Date());
  const { register, handleSubmit, formState: { errors } } = useForm<IOvertimeRecord>();
  const [selectedTrainer, setSelectedTrainer] = useState<IEmployee | null>(null);

  //handle submit form
  const onSubmit = async (data: IOvertimeRecord) => {
    try {
      // Simulate API call or processing
      toast.success("Add Overtime successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message || "An error occurred while add the overtime. Please try again!");
    }
  };

  const handleToggle = () => setOpen(!open);
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
            <h5 className="modal-title">Add Overtime</h5>
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
              <div className="grid grid-cols-12 items-center gap-y-5">
                <div className="col-span-12">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="lastname">Employee</label>
                    </div>
                    <div className="relative">
                      <div className="mz-default-select">
                        <SelectWithImage
                          data={employeeData}
                          selectedValue={selectedTrainer}
                          valueKey="name"
                          displayKey="name"
                          imageKey="image"
                          placeholder="Select Owner"
                          onChange={setSelectedTrainer}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12">
                  <FormLabel label="Date" id="selectStartDate" />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartDate"
                      selected={selectStartDate}
                      onChange={(date) => setSelectStartDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Hours"
                    id="hours"
                    type="text"
                    register={register("hours", {
                      required: "Hours is required",
                    })}
                    error={errors.hours}
                  />
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

export default AddOverTimeModal;
