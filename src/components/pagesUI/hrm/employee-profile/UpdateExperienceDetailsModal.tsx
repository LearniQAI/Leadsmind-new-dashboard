import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { useForm } from "react-hook-form";
import { IWorkExperience } from "@/interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const UpdateExperienceDetailsModal = ({ open, setOpen }: statePropsType) => {
  const [selectStartingDate1, setSelectStartingDate1] = useState<Date | null>(
    new Date()
  );
  const [selectStartingDate2, setSelectStartingDate2] = useState<Date | null>(
    new Date()
  );
  const [selectStartingDate3, setSelectStartingDate3] = useState<Date | null>(
    new Date()
  );
  const [selectStartingDate4, setSelectStartingDate4] = useState<Date | null>(
    new Date()
  );
  const [selectStartingDate5, setSelectStartingDate5] = useState<Date | null>(
    new Date()
  );
  const [selectStartingDate6, setSelectStartingDate6] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IWorkExperience>();
  const handleToggle = () => setOpen(!open);

  //handle submit
  const onSubmit = async (data: IWorkExperience) => {
    try {
      // Simulate API call or processing
      toast.success("Experience updated successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      // Show error toast message
      toast.error(
        error?.message ||
          "An error occurred while updating the leave. Please try again!"
      );
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Experience Details</h5>
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
              <h6 className="card__sub-title mb-2.5">Company Information 1</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Company Name"
                    id="c1companyName"
                    type="text"
                    required={false}
                    register={register("c1companyName")}
                    error={errors.c1companyName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Position"
                    id="c1position"
                    type="text"
                    required={false}
                    register={register("c1position")}
                    error={errors.c1position}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Period From"
                    id="selectStartDate"
                    optional={true}
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartDate"
                      selected={selectStartingDate1}
                      onChange={(date) => setSelectStartingDate1(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Period From"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Period To"
                    id="selectStartDate"
                    optional={true}
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartDate"
                      selected={selectStartingDate2}
                      onChange={(date) => setSelectStartingDate2(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Period To"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card__wrapper mb-[20px]">
              <h6 className="card__sub-title mb-2.5">Company Information 2</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Company Name"
                    id="c2companyName"
                    type="text"
                    register={register("c2companyName")}
                    required={false}
                    error={errors.c2companyName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Position"
                    id="c2position"
                    type="text"
                    required={false}
                    register={register("c2position")}
                    error={errors.c2position}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Period From"
                    id="selectStartDate"
                    optional={true}
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartDate"
                      selected={selectStartingDate3}
                      onChange={(date) => setSelectStartingDate3(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Period From"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Period To"
                    id="selectStartDate"
                    optional={true}
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartDate"
                      selected={selectStartingDate4}
                      onChange={(date) => setSelectStartingDate4(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Period To"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card__wrapper">
              <h6 className="card__sub-title mb-2.5">Company Information 3</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Company Name"
                    id="c3companyName"
                    type="text"
                    required={false}
                    register={register("c3companyName")}
                    error={errors.c3companyName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Position"
                    id="c3position"
                    type="text"
                    required={false}
                    register={register("c3position")}
                    error={errors.c3position}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Period From"
                    id="selectStartDate"
                    optional={true}
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartDate"
                      selected={selectStartingDate5}
                      onChange={(date) => setSelectStartingDate5(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Period From"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Period To"
                    id="selectStartDate"
                    optional={true}
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartDate"
                      selected={selectStartingDate6}
                      onChange={(date) => setSelectStartingDate6(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Period To"
                      className="w-full"
                    />
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

export default UpdateExperienceDetailsModal;
