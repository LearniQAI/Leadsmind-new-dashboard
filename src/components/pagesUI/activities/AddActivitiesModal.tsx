"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IActivity } from "@/interface/table.interface";
import { contactMethodsData, trainersData } from "@/data/dropdown-data";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { ITrainer } from "@/interface";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { toast } from "sonner";
import { statePropsType } from "@/interface/common.interface";

const AddActivitiesModal = ({ open, setOpen }: statePropsType) => {
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(
    new Date()
  );
  const [selectEndDate, setSelectEndDate] = useState<Date | null>(new Date());
  const {
    register,
    handleSubmit,
    control,

    formState: { errors },
  } = useForm<IActivity>();

  const [selectedOwner, setSelectedOwner] = useState<ITrainer | null>(null);
  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: IActivity) => {
    try {
      toast.success("Activity Added successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Activity. Please try again!"
      );
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Activities</h5>
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
                <div className="card__wrapper mb-[20px]">
                  <div className="grid grid-cols-12 gap-y-5 gap-x-5 maxXs:gap-x-0">
                    <div className="col-span-12">
                      <InputField
                        label="Activity Title"
                        id="title"
                        type="text"
                        register={register("title", {
                          required: "Activity Title is required",
                        })}
                        error={errors.title}
                      />
                    </div>
                    <div className="col-span-12">
                      <SelectBox
                        id="activityType"
                        label="Activity Type"
                        options={contactMethodsData}
                        control={control} // Validation rule
                        error={errors.activityType}
                      />
                    </div>

                    <div className="col-span-12">
                      <div className="from__input-box select-wrapper">
                        <div className="form__input-title">
                          <label htmlFor="lastname">
                            Owner Name <span>*</span>
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

                    <div className="col-span-12">
                      <FormLabel label="Start Date" id="selectStartDate" />
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
                          placeholderText="Start date"
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div className="col-span-12">
                      <FormLabel label="Deadline" id="deadline" />
                      <div className="datepicker-style">
                        <DatePicker
                          id="deadline"
                          selected={selectEndDate}
                          onChange={(date) => setSelectEndDate(date)}
                          showYearDropdown
                          showMonthDropdown
                          useShortMonthInDropdown
                          showPopperArrow={false}
                          peekNextMonth
                          dropdownMode="select"
                          isClearable
                          dateFormat="dd/MM/yyyy"
                          placeholderText="Deadline"
                          className="w-full"
                        />
                      </div>
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

export default AddActivitiesModal;
