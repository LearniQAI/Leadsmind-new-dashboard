import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IAward } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import { trainersData } from "@/data/dropdown-data";
import { ITrainer } from "@/interface";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { toast } from "sonner";
import { statePropsType } from "@/interface/common.interface";

const AddNewAwardModal = ({ open, setOpen }: statePropsType) => {
  const [selectedOwner, setSelectedOwner] = useState<ITrainer | null>(null);
  const [selectGiftDate, setSelectGiftDate] = useState<Date | null>(new Date());
  const {
    register,
    handleSubmit,

    formState: { errors },
  } = useForm<IAward>();

  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: IAward) => {
    try {
      toast.success("Award added successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Award. Please try again!"
      );
    }
  };
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Award</h5>
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
              <div className="grid grid-cols-12 gap-y-5 gap-x-5 maxXs:gap-x-0">
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="lastname">
                        Employee Name <span>*</span>
                      </label>
                    </div>
                    <div className="relative">
                      <div className="mz-default-select">
                        <SelectWithImage
                          data={trainersData}
                          selectedValue={selectedOwner}
                          valueKey="name"
                          displayKey="name"
                          imageKey="userImg"
                          placeholder="Select Owner"
                          onChange={setSelectedOwner}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Award Type"
                    id="awardType"
                    type="text"
                    register={register("awardType", {
                      required: "Award Type is required",
                    })}
                    error={errors.awardType}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Gift"
                    id="gift"
                    type="text"
                    register={register("gift", {
                      required: "Gift is required",
                    })}
                    error={errors.gift}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Gift Date" id="selectGiftDate" />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectGiftDate"
                      selected={selectGiftDate}
                      onChange={(date) => setSelectGiftDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Gift date"
                      className="w-full"
                    />
                  </div>
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

export default AddNewAwardModal;
