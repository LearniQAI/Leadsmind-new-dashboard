"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IAnnouncement } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const AddNewAnnouncementModal = ({ open, setOpen }: statePropsType) => {
  const [selectEndDate, setSelectEndDate] = useState<Date | null>(new Date());
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IAnnouncement>();

  const onSubmit = async (data: IAnnouncement) => {
    try {
      toast.success("Announcement added successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Announcement. Please try again!"
      );
    }
  };
  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Announcement</h5>
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
                        label="Title"
                        id="title"
                        type="text"
                        register={register("title", {
                          required: "Title is required",
                        })}
                        error={errors.title}
                      />
                    </div>

                    <div className="col-span-12 md:col-span-6">
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
                    <div className="col-span-12 md:col-span-6">
                      <FormLabel label="End Date" id="endDate" />
                      <div className="datepicker-style">
                        <DatePicker
                          id="endDate"
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
                          placeholderText="End Date"
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

export default AddNewAnnouncementModal;
