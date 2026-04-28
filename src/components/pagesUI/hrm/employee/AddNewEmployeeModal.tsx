"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { statePropsType } from "@/interface/common.interface";
import { employeeDesignationData } from "@/data/dropdown-data";
import { useForm } from "react-hook-form";
import { IEmployee } from "@/interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { toast } from "sonner";

const AddNewEmployeeModal = ({ open, setOpen }: statePropsType) => {
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(new Date());
  const { register, handleSubmit, control, formState: { errors } } = useForm<IEmployee>();
  const handleToggle = () => setOpen(!open);

  // Handle form submission
  const onSubmit = async (data: IEmployee) => {
    try {
      toast.success("Employee added successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error) {
      toast.error("Failed to add employee. Please try again.");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Employee</h5>
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
            <div className="card__wrapper mt-[5px]">
              <div className="grid grid-cols-12 gap-y-6 gap-x-6 maxXs:gap-x-0 justify-center align-center">
                <div className="col-span-12 md:col-span-6 ">
                  <InputField
                    label="First Name"
                    id="firstName "
                    type="text"
                    register={register("firstName", {
                      required: "First Name is required",
                    })}
                    error={errors.firstName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Last Name"
                    id="lastName "
                    type="text"
                    register={register("lastName", {
                      required: "Last Name is required",
                    })}
                    error={errors.lastName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Contact Number"
                    id="phone "
                    type="text"
                    register={register("phone", {
                      required: "Contact Number is required",
                    })}
                    error={errors.phone}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Email"
                    id="email "
                    type="text"
                    register={register("email", {
                      required: "Email is required",
                    })}
                    error={errors.email}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label=" User Name"
                    id="userName"
                    type="text"
                    register={register("userName", {
                      required: " User Name is required",
                    })}
                    error={errors.userName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label=" Employee ID"
                    id="employeeID"
                    type="text"
                    register={register("employeeID", {
                      required: " Employee ID is required",
                    })}
                    error={errors.employeeID}
                  />
                </div>
                <div className="col-span-12 text-center">
                  <InputField
                    label="Address"
                    id="address"
                    isTextArea={true}
                    required={true}
                    register={register("address", {
                      required: "Address is required",
                    })}
                    error={errors.address}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="designation"
                    label="Designation"
                    options={employeeDesignationData}
                    control={control}
                    isRequired={true}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Joining Date" id="selectJoiningDate" />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectJoiningDate"
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
                      placeholderText="Joining date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label=" Account Holder Name"
                    id="accountHolderName"
                    type="text"
                    register={register("accountHolderName", {
                      required: " Account Holder Name is required",
                    })}
                    error={errors.accountHolderName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Account Number"
                    id="accountNumber"
                    type="text"
                    register={register("accountNumber", {
                      required: "Account Number is required",
                    })}
                    error={errors.accountNumber}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Bank Name"
                    id="bankName"
                    type="text"
                    register={register("bankName", {
                      required: "Bank Name is required",
                    })}
                    error={errors.bankName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Branch Name"
                    id="branchName"
                    type="text"
                    register={register("branchName", {
                      required: "Branch Name is required",
                    })}
                    error={errors.branchName}
                  />
                </div>
                <div className="col-span-12">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="sellerphoto">
                        Employee Photo (100px*100px)
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        id="sellerphoto"
                        type="file"
                      />
                    </div>
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

export default AddNewEmployeeModal;
