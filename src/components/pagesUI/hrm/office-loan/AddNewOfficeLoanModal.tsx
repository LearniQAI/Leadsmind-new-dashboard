"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { useForm } from "react-hook-form";
import { IOfficeLoan } from "@/interface/table.interface";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const AddNewOfficeLoanModal = ({ open, setOpen }: statePropsType) => {
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(
    new Date()
  );
  const handleToggle = () => setOpen(!open);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<IOfficeLoan>();

  // Handle submit
  const onSubmit = async (data: IOfficeLoan) => {
    try {
      toast.success("Office loan form submitted successfully!");
      setOpen(false);
    } catch (error) {
      toast.error("An error occurred while submitting the form.");
    }
  };
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Office Loan Edit</h5>
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
            <div className="grid grid-cols-12">
              <div className="col-span-12">
                <div className="card__wrapper mb-20">
                  <div className="grid grid-cols-12 gap-x-5 gap-y-5 maxXs:gap-x-0">
                    <div className="col-span-12">
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
                      <FormLabel label="Month & Year" id="selectStartDate" />
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
                          placeholderText="Month & Year"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Total Amount"
                        id="amount"
                        type="text"
                        register={register("amount", {
                          required: "amount is required",
                        })}
                        error={errors.amount}
                        groupInput={true}
                        groupText="USD"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <SelectBox
                        id="loanType"
                        label="Loan Type"
                        options={[
                          { value: "personal", label: "Personal Loan" },
                          { value: "business", label: "Business Loan" },
                        ]}
                        control={control}
                        error={errors.loanType}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Monthly Installment Amount (EMI)"
                        id="monthlyInsAmount "
                        type="text"
                        required={true}
                        register={register("emi", {
                          required: "EMI is required",
                        })}
                        error={errors.emi}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Paid Amount"
                        id="paidAmount "
                        type="text"
                        required={true}
                        register={register("paid", {
                          required: "Paid Amount is required",
                        })}
                        error={errors.paid}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <SelectBox
                        id="status"
                        label="Status"
                        options={[
                          { value: "Pending", label: "Pending" },
                          { value: "Reject", label: "Reject" },
                          { value: "Approved", label: "Approved" },
                        ]}
                        control={control}
                        error={errors.status}
                      />
                    </div>
                    <div className="col-span-12">
                      <InputField
                        label="Reason"
                        id="reason"
                        isTextArea={true}
                        required={true}
                        register={register("reason", {
                          required: "Reason is required",
                        })}
                        error={errors.reason}
                      />
                    </div>
                  </div>
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

export default AddNewOfficeLoanModal;
