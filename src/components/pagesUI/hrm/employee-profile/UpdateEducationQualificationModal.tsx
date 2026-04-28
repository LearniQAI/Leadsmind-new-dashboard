import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IEducationQualification } from "@/interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { statePropsType } from "@/interface/common.interface";
import { toast } from "sonner";

const UpdateEducationQualificationModal = ({ open, setOpen}: statePropsType) => {
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
  const { register,handleSubmit,formState: { errors },} = useForm<IEducationQualification>();
  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: IEducationQualification) => {
    try {
      // Simulate API call or processing
      toast.success("Education updated successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message || "An error occurred while updating the leave. Please try again!");
    }
  };

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Education Qualification</h5>
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
              <h6 className="card__sub-title mb-2.5">Higher Degree</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Institution Name"
                    id="higherDegreeInstitutionName"
                    type="text"
                    required={false}
                    register={register("higherDegreeInstitutionName")}
                    error={errors.higherDegreeInstitutionName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Degree"
                    id="higherDegree"
                    type="text"
                    required={false}
                    register={register("higherDegree")}
                    error={errors.higherDegree}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Starting Date" id="selectStartingDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartingDate"
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
                      placeholderText="Starting date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Starting Date" id="selectStartingDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartingDate"
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
                      placeholderText="Starting date"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card__wrapper mb-[20px]">
              <h6 className="card__sub-title mb-2.5">Bachelor Degree</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Institution Name"
                    id="bachelorDegreeInstitutionName"
                    type="text"
                    required={false}
                    register={register("bachelorDegreeInstitutionName")}
                    error={errors.bachelorDegreeInstitutionName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Degree"
                    id="bachelorDegree"
                    type="text"
                    required={false}
                    register={register("bachelorDegree")}
                    error={errors.bachelorDegree}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Starting Date" id="selectStartingDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartingDate"
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
                      placeholderText="Starting date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Starting Date" id="selectStartingDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartingDate"
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
                      placeholderText="Starting date"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="card__wrapper">
              <h6 className="card__sub-title mb-2.5">Secondary Education</h6>
              <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Institution Name"
                    id="secondaryDegreeInstitutionName"
                    type="text"
                    required={false}
                    register={register("secondaryDegreeInstitutionName")}
                    error={errors.secondaryDegreeInstitutionName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Degree"
                    id="secondaryDegree"
                    type="text"
                    required={false}
                    register={register("secondaryDegree")}
                    error={errors.secondaryDegree}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Starting Date" id="selectStartingDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartingDate"
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
                      placeholderText="Starting date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel label="Starting Date" id="selectStartingDate" optional={true}/>
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectStartingDate"
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
                      placeholderText="Starting date"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button className="btn btn-primary">Submit</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UpdateEducationQualificationModal;
