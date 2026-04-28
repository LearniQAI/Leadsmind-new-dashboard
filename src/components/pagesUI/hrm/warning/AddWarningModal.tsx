"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IWarningRecord } from "@/interface/table.interface";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import { warningData } from "@/data/hrm/warning-data";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import { toast } from "sonner";

const AddWarningModal = ({ open, setOpen }: statePropsType) => {
  const [selectWarningDate, setSelectWarningDate] = useState<Date | null>(new Date());
  const { register, handleSubmit, formState: { errors } } = useForm<IWarningRecord>();
  const [selectedWarning, setSelectedWarning] = useState<IWarningRecord | null>(null);
  const handleToggle = () => setOpen(!open);

  //handle submit form
  const onSubmit = async (data: IWarningRecord) => {
    try {
      // Simulate API call or processing
      toast.success("Add Warning successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message || "An error occurred while add the warning. Please try again!");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm" sx={{
        "& .MuiDialog-paper": {
          width: "500px",
        },
      }}>
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Edit Warning</h5>
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
                      <label htmlFor="lastname">Warning</label>
                    </div>
                    <div className="relative">
                      <div className="mz-default-select">
                        <SelectWithImage
                          data={warningData}
                          selectedValue={selectedWarning}
                          valueKey="employee"
                          displayKey="employee"
                          imageKey="employeeImg"
                          placeholder="Select Owner"
                          onChange={setSelectedWarning}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Subject"
                    id="subject"
                    type="text"
                    register={register("subject", {
                      required: "Subject is required",
                    })}
                    error={errors.subject}
                  />
                </div>
                <div className="col-span-12">
                  <FormLabel label="Warning Date" id="selectWarningDate" />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectWarningDate"
                      selected={selectWarningDate}
                      onChange={(date) => setSelectWarningDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Warning date"
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
                      required: "Reason is required",
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

export default AddWarningModal;
