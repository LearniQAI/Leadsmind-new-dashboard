"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import { ITimeSheet } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import DatePicker from "react-datepicker";
import userMocup from "../../../../../public/assets/images/user/user-mockup.png";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const AddTimeSheetModal = ({ open, setOpen }: statePropsType) => {
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(new Date());
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors } } = useForm<ITimeSheet>();
  const handleToggle = () => setOpen(!open);

  //handle submit form
  const onSubmit = async (data: ITimeSheet) => {
    try {
      // Simulate API call or processing
      toast.success("Add Timesheet successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message || "An error occurred while the timesheet. Please try again!");
    }
  };

  //handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.readyState === 2) {
          setUploadedImage(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Time Sheet</h5>
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
              <div className="grid grid-cols-12 gap-y-5 gap-x-6 maxXs:gap-x-0 items-center">
                <div className="col-span-12 md:col-span-3">
                  <div className="contacts__thumb-wrapper">
                    <div className="employee__profile-chnage">
                      <div className="employee__profile-edit">
                        <input onChange={handleImageUpload}
                          type="file"
                          id="imageUpload2"
                          accept=".png, .jpg, .jpeg" />
                        <label htmlFor="imageUpload2"></label>
                      </div>
                      <div className="employee__profile-preview">
                        <div className="employee__profile-preview-box" id="imagePreview2" style={{
                          backgroundImage: `url(${uploadedImage || userMocup.src})`,
                        }}>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-9">
                  <InputField
                    label="Employee Name"
                    id="employee"
                    type="text"
                    register={register("employee", {
                      required: "Employee  Name is required",
                    })}
                    error={errors.employee}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
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
                      placeholderText="Date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
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
                    label="Remarks"
                    id="remarks"
                    isTextArea={true}
                    required={true}
                    register={register("remarks", {
                      required: "Remarks is required",
                    })}
                    error={errors.remarks}
                  />
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button className="btn btn-primary">Update</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddTimeSheetModal;
