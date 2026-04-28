import React, { useState } from "react";
import defaultImg from "../../../../../public/assets/images/user/user-mockup.png";
import { Autocomplete, Chip, TextField } from "@mui/material";
import {
  companyData,
  contactMethodsData,
  currencyData,
  languagesData,
} from "@/data/dropdown-data";

import InputField from "@/components/elements/SharedInputs/InputField";
import SelectBox from "@/components/elements/SharedInputs/SelectBox";
import { CompanyInformationFormProps } from "@/interface";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import { expenseData } from "@/data/expense-data";
import { IExpese } from "@/interface/table.interface";
const CompanyInformationForm: React.FC<CompanyInformationFormProps> = ({
  register,
  errors,
  control,
}) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedTrainer, setSelectedTrainer] = useState<IExpese | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const reader = new FileReader();

      reader.onload = () => {
        if (reader.readyState === 2) {
          setUploadedImage(reader.result as string); // Update the state with the image URL
        }
      };

      reader.readAsDataURL(file);
    }
  };
  const [tags, setTags] = useState<string[]>(["Tag1", "Tag2"]);
  const [inputValue, setInputValue] = useState<string>("");
  const handleTagsChange = (event: any, newValue: string[]) => {
    // Ensure tags are unique and validated
    const uniqueTags = Array.from(
      new Set(newValue.filter((tag) => tag.trim() !== ""))
    );
    setTags(uniqueTags);
  };
  const handleBlur = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !tags.includes(trimmedValue)) {
      // Add the new tag if not already added and it’s not empty
      setTags((prevTags) => [...prevTags, trimmedValue]);
    }
    setInputValue(""); // Clear the input field after adding the tag
  };
  return (
    <>
      <div className="col-span-12">
        <div className="employee__profile-chnage">
          <div className="employee__profile-edit">
            <input
              type="file"
              id="imageUpload"
              accept=".png, .jpg, .jpeg"
              onChange={handleImageUpload} // Handle image upload
            />
            <label htmlFor="imageUpload"></label>
          </div>
          <div className="employee__profile-preview">
            <div
              className="employee__profile-preview-box"
              id="imagePreview"
              style={{
                backgroundImage: `url(${
                  uploadedImage || defaultImg.src || ""
                })`, // Display uploaded image or fallback to default
              }}
            ></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
        <div className="col-span-12">
          <InputField
            label="Company Name"
            id="name"
            type="text"
            register={register("name", {
              required: "Company Name is required",
            })}
            error={errors.name}
          />
        </div>

        <div className="col-span-12 md:col-span-6">
          <div className="from__input-box select-wrapper">
            <div className="form__input-title">
              <label htmlFor="lastname">Company Owner</label>
            </div>
            <div className="relative">
              <div className="mz-default-select">
                <SelectWithImage
                  data={expenseData}
                  selectedValue={selectedTrainer}
                  valueKey="purchasedBy"
                  displayKey="purchasedBy"
                  imageKey="employeeImg"
                  placeholder="Select Owner"
                  onChange={setSelectedTrainer}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6">
          <InputField
            label="Email Address"
            id="email"
            type="email"
            register={register("email", {
              required: "Email Address is required",
            })}
            error={errors.email}
          />
        </div>

        <div className="col-span-12 md:col-span-6">
          <InputField
            label="Phone Number"
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
            label="Mobile Number"
            id="mobile"
            type="text"
            register={register("mobile", {
              required: "Mobile Number is required",
            })}
            error={errors.mobile}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <InputField
            label="Fax"
            id="fax"
            type="text"
            register={register("fax", {
              required: "Fax Number is required",
            })}
            error={errors.fax}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <InputField
            label="Websites"
            id="websites"
            type="text"
            required={false}
            register={register("websites")}
            error={errors.websites}
          />
        </div>

        <div className="col-span-12 md:col-span-6">
          <SelectBox
            id="loanType"
            label="Industry"
            options={companyData}
            control={control} // Validation rule
            error={errors.industry}
          />
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
        <div className="col-span-12 md:col-span-6">
          <SelectBox
            id="currencyType"
            label="Currency Type"
            options={currencyData}
            control={control} // Validation rule
            error={errors.currencyType}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <SelectBox
            id="language"
            label="Language"
            options={languagesData}
            control={control} // Validation rule
            error={errors.language}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <SelectBox
            id="language"
            label="source"
            options={contactMethodsData}
            control={control} // Validation rule
            error={errors.source}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <InputField
            label="Rating"
            id="rating"
            type="text"
            register={register("rating")}
            error={errors.rating}
          />
        </div>
        <div className="col-span-12 text-center">
          <InputField
            label="Description"
            id="description"
            type="text"
            register={register("description")}
            error={errors.rating}
          />
        </div>
      </div>
    </>
  );
};

export default CompanyInformationForm;
