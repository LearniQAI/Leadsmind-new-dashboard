import employeeData from "@/data/hrm/employee-data";
import React, { useState } from "react";
import { FormControlLabel, RadioGroup } from "@mui/material";
import { BpRadio } from "@/components/elements/forms/form-basic-input/Radio";
import { CompanyInformationFormProps, IEmployee } from "@/interface";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
const Access: React.FC<CompanyInformationFormProps> = ({
  register,
  errors,
}) => {
  const [selectEmployee, setselectEmployee] = useState<IEmployee | null>(null);

  return (
    <>
      <div className="col-span-12">
        <div className="from__input-box select-wrapper">
          <div className="form__input-title">
            <label htmlFor="lastname">Company Owner</label>
          </div>
          <div className="relative">
            <div className="mz-default-select">
              <SelectWithImage
                data={employeeData}
                selectedValue={selectEmployee}
                valueKey="name"
                displayKey="name"
                imageKey="image"
                placeholder="Select Owner"
                onChange={setselectEmployee}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 mt-[20px]">
        <div className="col-span-12 md:col-span-6">
          <div className="form__input-title">
            <label>Lead Visibility</label>
          </div>
          <RadioGroup
            defaultValue="primary"
            aria-labelledby="demo-customized-radios"
            name="customized-radios"
          >
            <div className="radio flex flex-wrap items-center radio-input-style">
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
        <div className="col-span-12 md:col-span-6">
          <div className="form__input-title">
            <label>Lead Status</label>
          </div>
          <RadioGroup
            defaultValue="primary"
            aria-labelledby="demo-customized-radios"
            name="customized-radios"
          >
            <div className="radio flex flex-wrap items-center radio-input-style">
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

      <div className="submit__btn text-center maxXs:text-start mt-[20px]">
        <button
          className="btn btn-primary"
          onClick={(e) => {
            e.preventDefault();
            //   handleToggle();
          }}
        >
          Submit
        </button>
      </div>
    </>
  );
};

export default Access;
