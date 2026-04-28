"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IActivity } from "@/interface/table.interface";
import { contactMethodsData } from "@/data/dropdown-data";
import InputField from "@/components/elements/SharedInputs/InputField";
import { useForm } from "react-hook-form";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { toast } from "sonner";
import { activityStatePropsType } from "@/interface/common.interface";
import { activityData } from "@/data/activity-data";

const EditActivityModal = ({
  open,
  setOpen,
  editData,
}: activityStatePropsType) => {
  const [selectedOwner, setSelectedOwner] = useState<IActivity | null>(null);
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

  const handleToggle = () => setOpen(!open);
  const onSubmit = async (data: IActivity) => {
    try {
      toast.success("Activity Update successfully!");
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
            <h5 className="modal-title">Activities Update</h5>
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
                        label="Activity Title"
                        id="title"
                        type="text"
                        required={false}
                        register={register("title")}
                        error={errors.title}
                      />
                    </div>
                    <div className="col-span-12">
                      <SelectBox
                        id="activityType"
                        label="Activity Type"
                        isRequired={false}
                        options={contactMethodsData}
                        control={control} // Validation rule
                        error={errors.activityType}
                        defaultValue={editData?.activityType}
                      />
                    </div>

                    <div className="col-span-12">
                      <div className="from__input-box select-wrapper">
                        <div className="form__input-title">
                          <label htmlFor="lastname">Owner Name</label>
                        </div>
                        <div className="relative">
                          <div className="mz-default-select">
                            <SelectWithImage
                              data={activityData}
                              selectedValue={selectedOwner}
                              valueKey="owner"
                              displayKey="owner"
                              imageKey="employeeImg"
                              placeholder="Select Owner"
                              onChange={setSelectedOwner}
                              title={editData?.owner}
                              image={editData?.employeeImg}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="col-span-12">
                      <FormLabel
                        label="Start Date"
                        id="selectStartDate"
                        optional
                      />
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
                      <FormLabel label="Deadline" id="deadline" optional />
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

export default EditActivityModal;
