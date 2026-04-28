"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { ISocialMediaLinks } from "@/interface";
import { useForm } from "react-hook-form";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";
import InputField from "@/components/elements/SharedInputs/InputField";

const UpdateSocialProfileModal = ({ open, setOpen }: statePropsType) => {
  const { register, handleSubmit, formState: { errors } } = useForm<ISocialMediaLinks>();
  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: ISocialMediaLinks) => {
    try {
      // Simulate API call or processing
      toast.success("Social prifile updated successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      // Show error toast message
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
        }}
      >
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Social Profile</h5>
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
                    label="Linkedin Name"
                    id="linkedinName"
                    type="text"
                    required={false}
                    groupInput={true}
                    groupText="@"
                    register={{ ...register("linkedin") }}
                    error={errors.linkedin}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="X Name"
                    id="xName"
                    type="text"
                    required={false}
                    groupInput={true}
                    groupText="@"
                    register={{ ...register("x") }}
                    error={errors.x}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Facebook Name"
                    id="facebookName"
                    type="text"
                    required={false}
                    groupInput={true}
                    groupText="@"
                    register={{ ...register("facebook") }}
                    error={errors.facebook}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Instagram Name"
                    id="instagramName"
                    type="text"
                    required={false}
                    groupInput={true}
                    groupText="@"
                    register={{ ...register("instagram") }}
                    error={errors.instagram}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="WhatsApps Number"
                    id="whatsAppsNumber"
                    type="text"
                    required={false}
                    register={{ ...register("whatsapp") }}
                    error={errors.whatsapp}
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

export default UpdateSocialProfileModal;
