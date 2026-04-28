import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IContact } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import { toast } from "sonner";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: IContact;
}

const UpdateContactModal = ({ open, setOpen, editData }: statePropsType) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IContact>();
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const handleToggle = () => setOpen(!open);

  //handle image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.readyState === 2) {
          setUploadedImage(reader.result as string); // Update the state with the image URL
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: IContact) => {
    try {
      toast.success("Contact update successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Contact. Please try again!"
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
      <DialogTitle>
        <div className="flex justify-between">
          <h5 className="modal-title">Update Contacts</h5>
          <button onClick={handleToggle} type="button" className="bd-btn-close">
            <i className="fa-solid fa-xmark-large"></i>
          </button>
        </div>
      </DialogTitle>
      <DialogContent>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card__wrapper">
            <div className="grid grid-cols-12 gap-y-5 gap-x-6 maxXs:gap-x-0 items-center">
              <div className="col-span-12">
                <div className="contacts__thumb-wrapper text-center">
                  <div className="employee__profile-chnage inline-block">
                    <div
                      className="employee__profile-edit"
                      onChange={handleImageUpload}
                    >
                      <input
                        type="file"
                        id="imageUpload"
                        accept=".png, .jpg, .jpeg"
                        onChange={handleImageUpload} // Handle image upload
                      />
                      <label htmlFor="imageUpload"></label>
                    </div>
                    <div className="employee__profile-preview">
                      <div
                        className="employee__profile-preview-box"
                        id="imagePreview"
                        style={{
                          backgroundImage: `url(${
                            uploadedImage || editData?.userImg?.src || ""
                          })`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-span-12">
                <div className="from__input-box">
                  <div className="form__input">
                    <InputField
                      label="Contacts Name"
                      id="name"
                      type="text"
                      defaultValue={editData?.name}
                      required={false}
                      register={register("name")}
                      error={errors.name}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="from__input-box">
                  <div className="form__input">
                    <InputField
                      label="Phone Number"
                      id="phone"
                      type="text"
                      defaultValue={editData?.phone}
                      required={false}
                      register={register("phone")}
                      error={errors.phone}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-12 md:col-span-6">
                <div className="from__input-box">
                  <div className="form__input">
                    <InputField
                      label="Email Address"
                      id="email"
                      defaultValue={editData?.email}
                      type="email"
                      required={false}
                      register={register("email")}
                      error={errors.email}
                    />
                  </div>
                </div>
              </div>
              <div className="col-span-12">
                <div className="from__input-box">
                  <div className="form__input">
                    <InputField
                      label="Contacts Address"
                      id="address"
                      isTextArea={true}
                      defaultValue={editData?.address}
                      required={false}
                      register={register("address")}
                      error={errors.address}
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
  );
};

export default UpdateContactModal;
