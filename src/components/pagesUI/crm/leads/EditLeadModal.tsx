"use client";
import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, FormControlLabel, Autocomplete, Chip, TextField, RadioGroup } from "@mui/material";
import { companyData, currencyData, singleSelectorData, trainersData } from "@/data/dropdown-data";
import { BpRadio } from "@/components/elements/forms/form-basic-input/Radio";
import { ITrainer } from "@/interface/dropdown.interface";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { ILead } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import { leadStatePropsType } from "@/interface/common.interface";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import { toast } from "sonner";


const EditLeadModal = ({ open, setOpen, editData }: leadStatePropsType) => {
  const { register, control, handleSubmit, formState: { errors } } = useForm<ILead>();
  const [selectedOwner, setSelectedOwner] = useState<ITrainer | null>(null);
  const [tags, setTags] = useState<string[]>(["Tag1", "Tag2"]);
  const [inputValue, setInputValue] = useState<string>("");
  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: ILead) => { 
    try {
      // Simulate API call or processing
      toast.success("Lead updated successfully!");
      // Close modal after submission
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message || "An error occurred while update the lead. Please try again!");
    }
  };

  //handle tag change
  const handleTagsChange = (event: any, newValue: string[]) => {
    const uniqueTags = Array.from(
      new Set(newValue.filter((tag) => tag.trim() !== ""))
    );
    setTags(uniqueTags);
  };
  //handle blur
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
            <h5 className="modal-title">Edit Lead</h5>
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
                <div className="col-span-12">
                  <InputField
                    label="Lead Name"
                    id="leadName"
                    type="text"
                    defaultValue={editData?.leadName}
                    required={false}
                    register={register("leadName")}
                    error={errors.leadName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="leadType"
                    label="Lead Type"
                    options={singleSelectorData}
                    control={control}
                    isRequired={false}
                    error={errors.leadType}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="companyName"
                    label="Company Name"
                    defaultValue={editData?.companyName}
                    options={companyData}
                    control={control}
                    isRequired={false}
                    error={errors.companyName}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Phone"
                    id="phone"
                    type="text"
                    defaultValue={editData?.phone}
                    required={false}
                    register={register("phone")}
                    error={errors.phone}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="currency"
                    label="Currency"
                    options={currencyData}
                    control={control}
                    isRequired={false}
                    error={errors.currency}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <SelectBox
                    id="status"
                    label="Status"
                    defaultValue={editData?.status}
                    options={[
                      { value: "Approved", label: "Approved" },
                      { value: "Pending", label: "Pending" },
                      { value: "Rejected", label: "Rejected" },
                      { value: "Contacted", label: "Contacted" },
                    ]}
                    isRequired={false}
                    control={control}
                    error={errors.status}
                  />
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Email Address"
                    id="email"
                    type="text"
                    defaultValue={editData?.email}
                    required={false}
                    register={register("email")}
                    error={errors.email}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="lastname">Owner Name</label>
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
                          title={editData?.owner}
                          image={editData?.employeeImg}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box autocomplete-tags">
                    <div className="form__input-title">
                      <label htmlFor="TagifyBasic">Basic Tag</label>
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
                  <InputField
                    label="Lead Description"
                    id="description"
                    isTextArea={true}
                    required={false}
                    register={register("description")}
                    error={errors.description}
                  />
                </div>
                <div className=" col-span-12 md:col-span-6">
                  <div className="form__input-title">
                    <label>Lead Visibility</label>
                  </div>
                  <RadioGroup
                    defaultValue="primary"
                    aria-labelledby="demo-customized-radios"
                    name="customized-radios"
                  >
                    <div className="radio flex items-center radio-input-style">
                      <FormControlLabel
                        className="radio-primary"
                        control={<BpRadio value="public" />}
                        label="Public"
                      />
                      <FormControlLabel
                        className="radio-primary"
                        control={<BpRadio value="private" />}
                        label="Private"
                      />
                      <FormControlLabel
                        className="radio-primary"
                        control={<BpRadio value="people" />}
                        label="Select People"
                      />
                    </div>
                  </RadioGroup>
                </div>
                <div className=" col-span-12 md:col-span-6">
                  <div className="form__input-title">
                    <label>Lead Status</label>
                  </div>
                  <RadioGroup
                    defaultValue="primary"
                    aria-labelledby="demo-customized-radios"
                    name="customized-radios"
                  >
                    <div className="radio flex items-center radio-input-style">
                      <FormControlLabel
                        className="radio-primary"
                        control={<BpRadio value="active" />}
                        label="Active"
                      />
                      <FormControlLabel
                        className="radio-primary"
                        control={<BpRadio value="inactive" />}
                        label="Inactive"
                      />
                      <FormControlLabel
                        className="radio-primary"
                        control={<BpRadio value="pending" />}
                        label="Pending"
                      />
                    </div>
                  </RadioGroup>
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

export default EditLeadModal;
