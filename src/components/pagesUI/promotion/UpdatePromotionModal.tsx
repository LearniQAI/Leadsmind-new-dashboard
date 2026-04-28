import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { IPromotion } from "@/interface/table.interface";
import { useForm } from "react-hook-form";
import InputField from "@/components/elements/SharedInputs/InputField";
import SelectWithImage from "@/components/elements/SharedInputs/SelectWithImage";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import DatePicker from "react-datepicker";
import { toast } from "sonner";
import { promotionstatePropsType } from "@/interface/common.interface";
import { promotionData } from "@/data/promotion-data";

const UpdatePromotionModal = ({
  open,
  setOpen,
  editData,
}: promotionstatePropsType) => {
  const [selectedOwner, setSelectedOwner] = useState<IPromotion | null>(null);
  const [selectPromotionDate, setSelectPromotionDate] = useState<Date | null>(
    new Date()
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IPromotion>();

  const handleToggle = () => setOpen(!open);

  const onSubmit = async (data: IPromotion) => {
    try {
      toast.success("Promotion Update successfully!");
      setTimeout(() => setOpen(false), 2000);
    } catch (error: any) {
      toast.error(
        error?.message ||
          "An error occurred while updating the Promotion. Please try again!"
      );
    }
  };
  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="sm">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Edit Promotion</h5>
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
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="lastname">Employee Name</label>
                    </div>
                    <div className="relative">
                      <div className="mz-default-select">
                        <SelectWithImage
                          data={promotionData}
                          selectedValue={selectedOwner}
                          valueKey="promotedEmployee"
                          displayKey="promotedEmployee"
                          imageKey="employeeImg"
                          placeholder="Select Owner"
                          onChange={setSelectedOwner}
                          title={editData?.promotedEmployee}
                          image={editData?.employeeImg}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Designation"
                    id="designation"
                    defaultValue={editData?.designation}
                    type="text"
                    required={false}
                    register={register("designation")}
                    error={errors.designation}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <InputField
                    label="Promotion Title"
                    id="promotionTitle"
                    defaultValue={editData?.promotionTitle}
                    type="text"
                    required={false}
                    register={register("promotionTitle")}
                    error={errors.promotionTitle}
                  />
                </div>
                <div className="col-span-12 md:col-span-6">
                  <FormLabel
                    label="Promotion Date"
                    id="selectPromotionDate"
                    optional
                  />
                  <div className="datepicker-style">
                    <DatePicker
                      id="selectPromotionDate"
                      selected={selectPromotionDate}
                      onChange={(date) => setSelectPromotionDate(date)}
                      showYearDropdown
                      showMonthDropdown
                      useShortMonthInDropdown
                      showPopperArrow={false}
                      peekNextMonth
                      dropdownMode="select"
                      isClearable
                      dateFormat="dd/MM/yyyy"
                      placeholderText="Promotion date"
                      className="w-full"
                    />
                  </div>
                </div>
                <div className="col-span-12">
                  <InputField
                    label="Description"
                    id="description"
                    defaultValue={editData?.description}
                    isTextArea={true}
                    required={false}
                    register={register("description")}
                    error={errors.description}
                  />
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

export default UpdatePromotionModal;
