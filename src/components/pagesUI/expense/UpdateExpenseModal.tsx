"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IExpese } from "@/interface/table.interface";
import { expenseData } from "@/data/expense-data";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { purchaseStatusOptions } from "@/data/dropdown-data";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { expenseStatePropsType } from "@/interface/common.interface";
import { toast } from "sonner";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";

const UpdateExpenseModal = ({
  open,
  setOpen,
  editData,
}: expenseStatePropsType) => {
  const [selectPurchaseDate, setSelectPurchaseDate] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IExpese>();

  const [selectedTrainer, setSelectedTrainer] = useState<IExpese | null>(null);
  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: IExpese) => {
    try {
      toast.success("Expense Update successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Expense. Please try again!"
      );
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Edit Expense</h5>
            <button
              onClick={handleToggle}
              type="button"
              className="bd-btn-close"
            >
              <i className="fa-solid fa-xmark-large"></i>
            </button>
          </div>
        </DialogTitle>
        <DialogContent className="common-scrollbar overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-12 gap-y-5 gap-x-5 maxXs:gap-x-0">
              <div className="col-span-12">
                <div className="card__wrapper mb-20">
                  <div className="grid grid-cols-12 gap-y-5 gap-x-5 maxXs:gap-x-0">
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Invoice Number"
                        id="invoiceNumber"
                        type="text"
                        required={false}
                        defaultValue={editData?.invoiceNumber}
                        register={register("invoiceNumber")}
                        error={errors.invoiceNumber}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Item Name"
                        id="itemName"
                        defaultValue={editData?.itemName}
                        type="text"
                        required={false}
                        register={register("itemName")}
                        error={errors.itemName}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <div className="from__input-box select-wrapper">
                        <div className="form__input-title">
                          <label htmlFor="lastname">Trainer Name</label>
                        </div>
                        <div className="relative">
                          <div className="mz-default-select">
                            <SelectWithImage
                              data={expenseData}
                              selectedValue={selectedTrainer}
                              valueKey="purchasedBy"
                              displayKey="purchasedBy"
                              imageKey="employeeImg"
                              placeholder="Select Owner"
                              onChange={setSelectedTrainer}
                              title={editData?.purchasedBy}
                              image={editData?.employeeImg}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <FormLabel
                        label="Purchase Date"
                        id="selectPurchaseDate"
                        optional={true}
                      />
                      <div className="datepicker-style">
                        <DatePicker
                          id="selectPurchaseDate"
                          selected={selectPurchaseDate}
                          onChange={(date) => setSelectPurchaseDate(date)}
                          showYearDropdown
                          showMonthDropdown
                          useShortMonthInDropdown
                          showPopperArrow={false}
                          peekNextMonth
                          dropdownMode="select"
                          isClearable
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Purchase date"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Purchase Amount"
                        id="amount"
                        type="number"
                        defaultValue={editData?.amount}
                        required={false}
                        register={register("amount")}
                        error={errors.purchaseDate}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-6">
                      <SelectBox
                        id="status"
                        label="Purchase Status"
                        defaultValue={editData?.status}
                        options={purchaseStatusOptions}
                        control={control} // Validation rule
                        error={errors.status}
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

export default UpdateExpenseModal;
