import InputField from "@/components/elements/SharedInputs/InputField";
import { CompanyInformationFormProps } from "@/interface";
import React from "react";

const CompanyAddress: React.FC<CompanyInformationFormProps> = ({
  register,
  errors,
}) => {
  return (
    <>
      <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0 gap-y-6">
        <div className="col-span-12 text-center">
          <InputField
            label="Address"
            id="address"
            isTextArea={true}
            required={true}
            register={register("address", {
              required: "Address is required",
            })}
            error={errors.address}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <InputField
            label="City"
            id="city"
            isTextArea={true}
            required={true}
            register={register("city", {
              required: "City is required",
            })}
            error={errors.city}
          />
        </div>

        <div className="col-span-12 md:col-span-6">
          <InputField
            label="State / Province"
            id="state"
            register={register("state", {
              required: "State is required",
            })}
            error={errors.state}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <InputField
            label="Country"
            id="country"
            register={register("country", {
              required: "Country is required",
            })}
            error={errors.country}
          />
        </div>
        <div className="col-span-12 md:col-span-6">
          <InputField
            label="ZIP Code"
            id="zipCode"
            register={register("zipCode", {
              required: "ZIP Code is required",
            })}
            error={errors.zipCode}
          />
        </div>
      </div>
    </>
  );
};

export default CompanyAddress;
