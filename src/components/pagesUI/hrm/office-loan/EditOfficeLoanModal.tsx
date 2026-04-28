"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IOfficeLoan } from "@/interface/table.interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import { useForm } from "react-hook-form";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { officeLoanStatePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const EditOfficeLoanModal = ({
  open,
  setOpen,
  editData,
}: officeLoanStatePropsType) => {
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

  //handle office loan update
  const onSubmit = async (data: IOfficeLoan) => {
    try {
      toast.success("Office Loan updated successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error) {
      toast.error("Failed to update Office Loan. Please try again.");
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
                        required={false}
                        defaultValue={editData?.bankName}
                        register={register("bankName")}
                        error={errors.bankName}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <FormLabel
                        label="Month & Year"
                        id="selectStartDate"
                        optional={true}
                      />
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
                        defaultValue={editData?.amount}
                        register={register("amount")}
                        required={false}
                        error={errors.amount}
                        groupInput={true}
                        groupText="USD"
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <SelectBox
                        id="loanType"
                        label="Loan Type"
                        defaultValue="Personal Loan"
                        options={[
                          { value: "personal", label: "Personal Loan" },
                          { value: "business", label: "Business Loan" },
                        ]}
                        isRequired={false}
                        control={control}
                        error={errors.loanType}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Paid Amount"
                        id="paidAmount "
                        type="text"
                        required={false}
                        defaultValue={editData?.paid}
                        register={register("paid")}
                        error={errors.paid}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <SelectBox
                        id="status"
                        label="Status"
                        defaultValue={editData?.status}
                        options={[
                          { value: "Pending", label: "Pending" },
                          { value: "Reject", label: "Reject" },
                          { value: "Approved", label: "Approved" },
                        ]}
                        isRequired={false}
                        control={control}
                        error={errors.status}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Monthly Installment Amount (EMI)"
                        id="monthlyInsAmount "
                        type="text"
                        required={false}
                        defaultValue={editData?.emi}
                        register={register("emi")}
                        error={errors.emi}
                      />
                    </div>
                    <div className="col-span-12">
                      <InputField
                        label="Reason"
                        id="reason"
                        isTextArea={true}
                        required={false}
                        register={register("reason")}
                        error={errors.reason}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button className="btn btn-primary">Submit</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EditOfficeLoanModal;
