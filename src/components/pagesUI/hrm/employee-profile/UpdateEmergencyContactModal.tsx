import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useForm } from "react-hook-form";
import { IEmergenryContact } from "@/interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const UpdateEmergencyContactModal = ({ open, setOpen }: statePropsType) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IEmergenryContact>();
  const handleToggle = () => setOpen(!open);

  // Handle submit
  const onSubmit = async (data: IEmergenryContact) => {
    try {
      reset();
      // Show success toast
      toast.success("Emergency contact updated successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error) {
      toast.error("Failed to update emergency contact. Please try again.");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Emergency Contact</h5>
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
              <h6 className="card__sub-title mb-2.5">Primary Contact</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Full Name"
                    id="fullName "
                    type="text"
                    required={false}
                    register={register("fullName")}
                    error={errors.fullName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Relationship"
                    id="relationship"
                    type="text"
                    required={false}
                    register={register("relationship")}
                    error={errors.relationship}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Phone"
                    id="Phone"
                    type="text"
                    required={false}
                    register={register("phoneNumber")}
                    error={errors.phoneNumber}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Phone Number 2"
                    id="phoneNumber2"
                    type="text"
                    required={false}
                    register={register("phoneNumber2")}
                    error={errors.phoneNumber2}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Email Address"
                    id="emailAddress"
                    type="email"
                    required={false}
                    register={register("emailAddress")}
                    error={errors.emailAddress}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Address"
                    id="address"
                    type="text"
                    required={false}
                    register={register("address")}
                    error={errors.address}
                  />
                </div>
              </div>
            </div>
            <div className="card__wrapper">
              <h6 className="card__sub-title mb-2.5">Secondary Contact</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Full Name"
                    id="secondaryFullName"
                    type="text"
                    register={register("secondaryFullName")}
                    required={false}
                    error={errors.secondaryFullName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Relationship"
                    id="secondaryRelationship"
                    type="text"
                    register={register("secondaryRelationship")}
                    required={false}
                    error={errors.secondaryRelationship}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Phone"
                    id="secondaryPhoneNumber"
                    type="text"
                    required={false}
                    register={register("secondaryPhoneNumber")}
                    error={errors.secondaryPhoneNumber}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Phone Number 2"
                    id="secondaryPhoneNumber2"
                    type="text"
                    required={false}
                    register={register("secondaryPhoneNumber2")}
                    error={errors.secondaryPhoneNumber2}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Email Address"
                    id="secondaryEmailAddress"
                    type="email"
                    required={false}
                    register={register("secondaryEmailAddress")}
                    error={errors.secondaryEmailAddress}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Address"
                    id="secondaryAddress"
                    type="text"
                    required={false}
                    register={register("secondaryAddress")}
                    error={errors.secondaryAddress}
                  />
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

export default UpdateEmergencyContactModal;
