"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { countriesData } from "@/data/country-data";
import { useForm } from "react-hook-form";
import { IPassport } from "@/interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { toast } from "sonner";

const UpdatePassportModal = ({ open, setOpen }: statePropsType) => {
  const [selectIssueDate, setSelectIssueDate] = useState<Date | null>(new Date());
  const [selectExpiryDate, setSelectExpiryDate] = useState<Date | null>(new Date());
  const { register, handleSubmit, control,formState: { errors } } = useForm<IPassport>();
  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: IPassport) => { 
    try {
      // Simulate API call or processing
      toast.success("Passport information updated successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
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
        }}>
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Passport Information</h5>
            <button
              onClick={handleToggle}
              type="button"
              className="bd-btn-close"
            >
              <i className="fa-solid fa-xmark-large"></i>
            </button>
          </div>
        </DialogTitle>
        <DialogContent className="common-scrollbar max-h-screen overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="card__wrapper mb-[20px]">
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6 items-center justify-center">
                <div className="col-span-12">
                  <InputField
                    label="Passport Number"
                    id="passportNumber"
                    type="text"
                    required={false}
                    register={register("passportNumber")}
                    error={errors.passportNumber}
                  />
                </div>
                <div className="col-span-12">
                  <SelectBox
                    id="country"
                    label="Country"
                    isRequired={false}
                    options={countriesData}
                    control={control}
                    error={errors.country}
                  />
                </div>
                <div className="col-span-12">
                  <FormLabel label="Issue Date" id="selectIssueDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectIssueDate"
                      selected={selectIssueDate}
                      onChange={(date) => setSelectIssueDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Issue date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12">
                  <FormLabel label="Expiry Date" id="selectExpiryDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectExpiryDate"
                      selected={selectExpiryDate}
                      onChange={(date) => setSelectExpiryDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Expiry date"
                      className="w-full"
                    />
                  </div>
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

export default UpdatePassportModal;
