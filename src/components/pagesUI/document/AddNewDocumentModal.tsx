"use client";
import React from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useForm } from "react-hook-form";
import { IDocument } from "@/interface/table.interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const AddNewDocumentModal = ({ open, setOpen }: statePropsType) => {
  const {
    register,
    handleSubmit,

    formState: { errors },
  } = useForm<IDocument>();

  const onSubmit = async (data: IDocument) => {
    try {
      toast.success("Document added successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Document. Please try again!"
      );
    }
  };
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog
        open={open}
        onClose={handleToggle}
        fullWidth
        maxWidth="sm"
        sx={{
          "& .MuiDialog-paper": {
            width: "500px",
          },
        }}
      >
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Document</h5>
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
                    <div className="col-span-12">
                      <InputField
                        label="File Name"
                        id="fileName"
                        type="text"
                        register={register("fileName", {
                          required: "File Name is required",
                        })}
                        error={errors.fileName}
                      />
                    </div>
                    <div className="col-span-12">
                      <div className="from__input-box">
                        <div className="form__input-title">
                          <label htmlFor="purchaseDate">Document</label>
                        </div>
                        <div className="from__input-box">
                          <div className="form__input">
                            <input
                              className="form-control"
                              type="file"
                              defaultValue=""
                              id="filename"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-span-12">
                      <InputField
                        label="Role"
                        id="role"
                        type="text"
                        register={register("role", {
                          required: "Role is required",
                        })}
                        error={errors.role}
                      />
                    </div>
                    <div className="col-span-12">
                      <InputField
                        label="Description"
                        id="description"
                        isTextArea={true}
                        required={true}
                        register={register("description", {
                          required: "Description is required",
                        })}
                        error={errors.description}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="submit__btn flex items-center justify-end gap-[10px]">
              <button
                className="btn btn-danger"
                type="button"
                onClick={handleToggle}
              >
                Cancel
              </button>
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

export default AddNewDocumentModal;
