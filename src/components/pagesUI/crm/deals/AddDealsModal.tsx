"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Autocomplete,
  Chip,
  TextField,
} from "@mui/material";
import {
  dealsStatusDropdownData,
  pipelineData,
  trainersData,
} from "@/data/dropdown-data";
import { ITrainer } from "@/interface/dropdown.interface";
import { statePropsType } from "@/interface/common.interface";
import { useForm } from "react-hook-form";
import { IDeal } from "@/interface/table.interface";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { toast } from "sonner";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";

const AddDealsModal = ({ open, setOpen }: statePropsType) => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<IDeal>();
  const [selectedOwner, setSelectedOwner] = useState<ITrainer | null>(null);
  const [selectStartDate, setSelectStartDate] = useState<Date | null>(
    new Date()
  );
  const [selectEndDate, setSelectEndDate] = useState<Date | null>(new Date());
  const [tags, setTags] = useState<string[]>(["Tag1", "Tag2"]);
  const [inputValue, setInputValue] = useState<string>("");
  const handleToggle = () => setOpen(!open);

  //handle submit form
  const onSubmit = async (data: IDeal) => {
    try {
      // Simulate API call or processing
      toast.success("Add Deal successfully!");
      reset();
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while add the deal. Please try again!"
      );
    }
  };

  //handle tag change
  const handleTagsChange = (event: any, newValue: string[]) => {
    const uniqueTags = Array.from(
      new Set(newValue.filter((tag) => tag.trim() !== ""))
    );
    setTags(uniqueTags);
  };
  const handleBlur = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !tags.includes(trimmedValue)) {
      setTags((prevTags) => [...prevTags, trimmedValue]);
    }
    setInputValue("");
  };
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Deals</h5>
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
            <div className="card__wrapper">
              <div className="grid grid-cols-12 gap-y-6 gap-x-6 maxXs:gap-x-0 justify-center items-center">
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Deal Name"
                    id="bankName"
                    type="text"
                    register={register("dealName", {
                      required: "Deal Name is required",
                    })}
                    error={errors.dealName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="pipeline"
                    label="Loan Type"
                    options={pipelineData}
                    control={control}
                    error={errors.pipelineType}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="status"
                    label="Status Type"
                    options={dealsStatusDropdownData}
                    control={control}
                    error={errors.status}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="currency"
                    label="Currency"
                    options={dealsStatusDropdownData}
                    control={control}
                    error={errors.currency}
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

                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label=" Mobile Number"
                    id="mobileNumber"
                    type="text"
                    register={register("mobileNumber", {
                      required: "Mobile Number is required",
                    })}
                    error={errors.mobileNumber}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label=" Phone Number"
                    id="phone"
                    type="text"
                    register={register("phone", {
                      required: "Phone Number is required",
                    })}
                    error={errors.phone}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label=" Email Address"
                    id="phone"
                    type="email"
                    register={register("email", {
                      required: "Email Address is required",
                    })}
                    error={errors.email}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label=" Source Type"
                    id="sourceType"
                    type="text"
                    register={register("sourceType", {
                      required: "Source is required",
                    })}
                    error={errors.sourceType}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="lastname">
                        Assignee <span>*</span>
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
                          placeholder="Select Assignee"
                          onChange={setSelectedOwner}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box autocomplete-tags">
                    <div className="form__input-title">
                      <label htmlFor="TagifyBasic">Tag</label>
                    </div>
                    <Autocomplete
                      multiple
                      freeSolo
                      options={[]}
                      value={tags}
                      onChange={handleTagsChange}
                      inputValue={inputValue}
                      onInputChange={(event, newInputValue) =>
                        setInputValue(newInputValue)
                      }
                      renderTags={(value: string[], getTagProps) => {
                        return value.map((option, index) => {
                          const { key, ...rest } = getTagProps({ index });
                          return (
                            <Chip
                              key={index}
                              variant="outlined"
                              label={option}
                              {...rest}
                            />
                          );
                        });
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          variant="outlined"
                          placeholder="Add tags..."
                          onBlur={handleBlur}
                        />
                      )}
                    />
                  </div>
                </div>

                <div className="col-span-12 text-center">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="address">
                        Lead Description <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <textarea
                        className="form-control"
                        name="address"
                        id="address"
                      ></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="submit__btn text-center">
              <button type="submit" className="btn btn-primary">
                Submit
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AddDealsModal;
