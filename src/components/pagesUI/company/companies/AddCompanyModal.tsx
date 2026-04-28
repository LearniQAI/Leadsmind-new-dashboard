import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import CompanyInformationForm from "./CompanyInformationForm"; // Assuming this component exists
import CompanyAddress from "./CompanyAddress";
import SocialMedai from "./SocialMedai";
import Access from "./Access";
import { ICompany } from "@/interface/table.interface";
import { useForm } from "react-hook-form";

interface statePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

const AddCompanyModal = ({ open, setOpen }: statePropsType) => {
  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<ICompany>();

  const onSubmit = async (data: ICompany) => {};

  const handleToggle = () => setOpen(!open);
  const [activeIndex, setActiveIndex] = useState(0);

  const steps = [
    { label: "Company Information" },
    { label: "Company Address" },
    { label: "Social Media" },
    { label: "Access" },
  ];

  const renderStepContent = (index: number) => {
    switch (index) {
      case 0:
        return (
          <CompanyInformationForm
            register={register}
            errors={errors}
            control={control}
          />
        );
      case 1:
        return <CompanyAddress register={register} errors={errors} />;
      case 2:
        return <SocialMedai register={register} errors={errors} />;
      case 3:
        return <Access register={register} errors={errors} />;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
      <DialogTitle>
        <div className="flex justify-between">
          <h5 className="modal-title">Add New Company</h5>
          <button onClick={handleToggle} type="button" className="bd-btn-close">
            <i className="fa-solid fa-xmark-large"></i>
          </button>
        </div>
      </DialogTitle>
      {/* Common scrollbar overflow-y-auto */}
      <DialogContent className="common-scrollbar overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card__wrapper">
            <div className="steps__form mb-[20px]">
              <div className="steps__row style_two setup-panel-2 flex flex-wrap justify-start md:justify-between gap-4 ">
                {steps.map((step, index) => (
                  <div className="steps__step" key={index}>
                    <button
                      onClick={() => setActiveIndex(index)}
                      type="button"
                      className={`steps__title ${
                        activeIndex === index ? "step-active" : ""
                      }`}
                    >
                      {step.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
            {/* Render the content for the current active step */}
            <div className="step-content mt-[20px]">
              {renderStepContent(activeIndex)}
            </div>
            <div className="flex gap-[20px] flex-wrap justify-between items-center mt-[20px]">
              {/* Conditionally render the Previous button */}
              {activeIndex !== 0 && (
                <button
                  type="button"
                  className="prevBtn-2 btn btn-secondary"
                  onClick={() => setActiveIndex(Math.max(activeIndex - 1, 0))}
                  disabled={activeIndex === 0}
                >
                  Previous
                </button>
              )}

              {/* Next button is always right aligned */}
              <button
                type="button"
                className="nextBtn-2 btn btn-primary"
                onClick={() =>
                  setActiveIndex(Math.min(activeIndex + 1, steps.length - 1))
                }
                disabled={activeIndex === steps.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddCompanyModal;
