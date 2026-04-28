"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useForm } from "react-hook-form";
import { IPersonalLoan } from "@/interface/table.interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const AddPersonalLoanModal = ({ open, setOpen }: statePropsType) => {
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IPersonalLoan>();
  const handleToggle = () => setOpen(!open);

  // Handle form submission
  const onSubmit = async (data: IPersonalLoan) => {
    try {
      // Simulate API call or processing
      toast.success("Personal Loan added successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error) {
      toast.error("Failed to add Personal Loan. Please try again.");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add Personal Loan</h5>
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
                        label="Amount"
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
                        label="One Time Deduct"
                        options={[
                          { value: "yes", label: "Yes" },
                          { value: "no", label: "No" },
                        ]}
                        control={control}
                        error={errors.oneTimeDeduct}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Monthly Installment Amount (EMI)"
                        id="emi"
                        type="text"
                        register={register("emi", {
                          required: "Monthly Installment Amount (EMI) required",
                        })}
                        error={errors.emi}
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

export default AddPersonalLoanModal;
