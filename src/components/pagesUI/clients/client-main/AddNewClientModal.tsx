"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import { IClient } from "@/interface";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}
const AddNewClientModal = ({ open, setOpen }: statePropsType) => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IClient>();

  const onSubmit = async (data: IClient) => {};
  const handleToggle = () => setOpen(!open);
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Client</h5>
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
            <div className="card__wrapper mt-[20px] mb-[20px]">
              <div className="grid grid-cols-12 items-center justify-center gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="First Name"
                    id="firstName"
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
                    id="lastName"
                    type="text"
                    required={false}
                    register={register("lastName", {
                      required: "Last Name is required",
                    })}
                    error={errors.lastName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Contact Number"
                    id="contactNumber"
                    type="text"
                    required={false}
                    register={register("contactNumber", {
                      required: "Contact Number is required",
                    })}
                    error={errors.contactNumber}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Email"
                    id="email"
                    type="email"
                    register={register("email", {
                      required: "Email required",
                    })}
                    error={errors.email}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="User Name"
                    id="userName"
                    type="text"
                    register={register("userName", {
                      required: "User Name required",
                    })}
                    error={errors.userName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Client ID"
                    id="clientId"
                    type="text"
                    register={register("clientId", {
                      required: "Client ID required",
                    })}
                    error={errors.clientId}
                  />
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Address"
                    id="address"
                    type="text"
                    isTextArea={true}
                    register={register("address", {
                      required: "Address required",
                    })}
                    error={errors.address}
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

export default AddNewClientModal;
