"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IResignation } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { resignationstatePropsType } from "@/interface/common.interface";
import { toast } from "sonner";
import { resignationData } from "@/data/resignation-data";

const UpdateResignationModal = ({
  open,
  setOpen,
  editData,
}: resignationstatePropsType) => {
  const [selectResignationDate, setSelectResignationDate] =
    useState<Date | null>(new Date());
  const [selectLastWorkingDate, setSelectLastWorkingDate] =
    useState<Date | null>(new Date());
  const [selectedOwner, setSelectedOwner] = useState<IResignation | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<IResignation>();

  const handleToggle = () => setOpen(!open);
  const onSubmit = async (data: IResignation) => {
    try {
      toast.success("Resignation Update successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Resignation. Please try again!"
      );
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Edit Resignation</h5>
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
                <div className="col-span-12">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="lastname">Employee Name</label>
                    </div>
                    <div className="relative">
                      <div className="mz-default-select">
                        <SelectWithImage
                          data={resignationData}
                          selectedValue={selectedOwner}
                          valueKey="employee"
                          displayKey="employee"
                          imageKey="employeeImg"
                          placeholder="Select Owner"
                          onChange={setSelectedOwner}
                          title={editData?.employee}
                          image={editData?.employeeImg}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Resignation Date"
                    id="selectResignationDate"
                    optional
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectResignationDate"
                      selected={selectResignationDate}
                      onChange={(date) => setSelectResignationDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Resignation date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Last Working Date"
                    id="selectLastWorkingDate"
                    optional
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectLastWorkingDate"
                      selected={selectLastWorkingDate}
                      onChange={(date) => setSelectLastWorkingDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Last Working date"
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="col-span-12">
                  <InputField
                    label="Description"
                    id="description"
                    isTextArea={true}
                    required={false}
                    register={register("description")}
                    error={errors.description}
                  />
                </div>
              </div>
            </div>
            <div className="submit__btn flex items-center justify-end gap-[10px]">
              <button className="btn btn-danger" onClick={handleToggle}>
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

export default UpdateResignationModal;
