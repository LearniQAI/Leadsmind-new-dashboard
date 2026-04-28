"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IPaylist } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { employeeDropdownData } from "@/data/dropdown-data";
import InputField from "@/components/elements/SharedInputs/InputField";
import { toast } from "sonner";
import { paylistStatePropsType } from "@/interface/common.interface";
const EditSalaryModal = ({
  open,
  setOpen,
  editData,
}: paylistStatePropsType) => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<IPaylist>();
  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: IPaylist) => {
    try {
      toast.success("Salary update successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Salary. Please try again!"
      );
    }
  };
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Edit Employee Salary</h5>
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
            <div className="grid grid-cols-12 gap-y-2.5">
              <div className="col-span-12">
                <div className="card__wrapper">
                  <SelectBox
                    id="employeeName"
                    label="Employee Name"
                    defaultValue={editData?.employeeName}
                    isRequired={false}
                    options={employeeDropdownData}
                    control={control} // Validation rule
                    error={errors.employeeName}
                  />
                </div>
              </div>
              <div className="col-span-12">
                <div className="card__wrapper">
                  <h6 className="card__sub-title mb-10">Earning</h6>
                  <div className="grid grid-cols-12 gap-y-5 gap-x-5 maxXs:gap-x-0">
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Basic Salary (BASIC)"
                        id="salaryMonthly"
                        type="number"
                        required={false}
                        register={register("salaryMonthly")}
                        error={errors.salaryMonthly}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Dearness Allowance(DA)"
                        id="dearnessAllowance"
                        type="text"
                        required={false}
                        register={register("dearnessAllowance")}
                        error={errors.dearnessAllowance}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Transport Allowance(DA)"
                        id="transportAllowance"
                        type="text"
                        required={false}
                        register={register("transportAllowance")}
                        error={errors.transportAllowance}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Mobile Allowance(MA)"
                        id="mobileAllowance"
                        type="text"
                        required={false}
                        register={register("mobileAllowance")}
                        error={errors.mobileAllowance}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Bonus Allowance(BA)"
                        id="bonusAllowance"
                        type="text"
                        required={false}
                        register={register("bonusAllowance")}
                        error={errors.bonusAllowance}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Others"
                        id="phone"
                        type="text"
                        required={false}
                        register={register("phone")}
                        error={errors.phone}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-12">
                <div className="card__wrapper">
                  <h6 className="card__sub-title mb-10">Deduction</h6>
                  <div className="grid grid-cols-12 gap-y-5 gap-x-5 maxXs:gap-x-0">
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Provident Fund (PF)"
                        id="providentFund"
                        type="text"
                        required={false}
                        register={register("providentFund")}
                        error={errors.providentFund}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Security Deposit (SD)"
                        id="securityDeposit"
                        type="text"
                        required={false}
                        register={register("securityDeposit")}
                        error={errors.securityDeposit}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Personal Loan (PL)"
                        id="personalLoan"
                        type="text"
                        required={false}
                        register={register("personalLoan")}
                        error={errors.personalLoan}
                      />
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <InputField
                        label="Early Leaving (EL)"
                        id="earlyLeaving"
                        type="text"
                        required={false}
                        register={register("earlyLeaving")}
                        error={errors.earlyLeaving}
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

export default EditSalaryModal;
