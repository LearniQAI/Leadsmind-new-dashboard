import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useForm } from "react-hook-form";
import { IBankAccount } from "@/interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const UpdateBankAccountModal = ({ open, setOpen }: statePropsType) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IBankAccount>();
  const handleToggle = () => setOpen(!open);

  //handle submit form
  const onSubmit = async (data: IBankAccount) => {
    try {
      // Simulate API call or processing
      toast.success("Bank Account updated successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the leave. Please try again!"
      );
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Bank Account Information</h5>
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
              <div className="grid grid-cols-12 gap-y-6 justify-center align-center">
                <div className="col-span-12">
                  <InputField
                    label="Account Holder Name"
                    id="accountHolderName"
                    type="text"
                    required={false}
                    register={register("accountHolderName")}
                    error={errors.accountHolderName}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Account Number"
                    id="accountNumber"
                    type="text"
                    required={false}
                    register={register("accountNumber")}
                    error={errors.accountNumber}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Bank Name"
                    id="bankName"
                    type="text"
                    required={false}
                    register={register("bankName")}
                    error={errors.bankName}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Branch Name"
                    id="branchName"
                    type="text"
                    required={false}
                    register={register("branchName")}
                    error={errors.branchName}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="SWIFT Code"
                    id="swiftCode"
                    type="text"
                    required={false}
                    register={register("swiftCode")}
                    error={errors.swiftCode}
                  />
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

export default UpdateBankAccountModal;
