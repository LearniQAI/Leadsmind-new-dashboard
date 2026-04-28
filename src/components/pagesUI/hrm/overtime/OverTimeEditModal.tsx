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
import { toast } from "sonner";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import { overtimeStatePropsType } from "@/interface/common.interface";
import { overtimeData } from "@/data/hrm/overtime-data";

const OverTimeEditModal = ({
  open,
  setOpen,
  editData,
}: overtimeStatePropsType) => {
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IOvertimeRecord>();
  const [selectedEmployee, setSelectedEmployee] =
    useState<IOvertimeRecord | null>(null);
  const handleToggle = () => setOpen(!open);

  //handle update overtime
  const onSubmit = async (data: IOvertimeRecord) => {
    try {
      // Simulate API call or processing
      toast.success("Overtime updated successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the overtime. Please try again!"
      );
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
            <h5 className="modal-title">Edit Overtime</h5>
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
                          data={overtimeData}
                          selectedValue={selectedEmployee}
                          valueKey="employee"
                          displayKey="employee"
                          imageKey="adminImg"
                          placeholder="Select Owner"
                          onChange={setSelectedEmployee}
                          title={editData?.employee}
                          image={editData?.employeeImg}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12">
                  <FormLabel label="Date" id="selectStartDate" optional />
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
                    defaultValue={editData?.hours}
                    required={false}
                    register={register("hours")}
                    error={errors.hours}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Description"
                    id="description"
                    isTextArea={true}
                    defaultValue={editData?.description}
                    required={false}
                    register={register("description")}
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

export default OverTimeEditModal;
