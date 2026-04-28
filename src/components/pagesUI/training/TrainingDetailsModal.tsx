import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent } from "@mui/material";
import { trainersData, trainingTitles } from "@/data/dropdown-data";
import { ITrainer } from "@/interface/dropdown.interface";
import Image, { StaticImageData } from "next/image";
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import { ITraining } from "@/interface/table.interface";
import img1 from "../../../../public/assets/images/avatar/avatar1.png";

interface StatePropsType {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editData: ITraining;
}

const TrainingDetailsModal = ({ open, setOpen, editData }: StatePropsType) => {
  const [selectedTrainer, setSelectedTrainer] = useState<ITrainer>(
    trainersData[0]
  );
  const [selectedEmployee, setSelectedEmployee] = useState<ITrainer>(
    trainersData[0]
  );

  const handleToggle = () => setOpen(!open);

  return (
    <>
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between items-center">
            <h5 className="modal-title font-bold text-lg">Training Details</h5>
            <button
              onClick={handleToggle}
              type="button"
              className="bd-btn-close"
            >
              <i className="fa-solid fa-xmark-large text-gray-500 text-xl"></i>
            </button>
          </div>
        </DialogTitle>
        <DialogContent>
          <div className="grid grid-cols-12 gap-y-2.5">
            <div className="col-span-12">
              <div className="card__wrapper">
                <div className="grid grid-cols-12 gap-y-5">
                  <div className="col-span-12">
                    <div className="label__content-wrapper">
                      <span className="label__subtitle">Training Title</span>
                      <h6 className="label__title">
                        Creating RESTful APIs with PHP
                      </h6>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="label__content-wrapper">
                      <span className="label__subtitle">Trainer Name</span>
                      <h6 className="label__title flex justify-start items-center">
                        <Image
                          className="img-36 border-circle me-[3px]"
                          src={img1 as StaticImageData}
                          alt="image"
                        />
                        Ethan Mitchell
                      </h6>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="label__content-wrapper">
                      <span className="label__subtitle">Employee Name</span>
                      <h6 className="label__title flex justify-start items-center">
                        <Image
                          className="img-36 border-circle me-[3px]"
                          src={editData?.trainerImg as StaticImageData}
                          alt="image"
                        />
                        Ethan Mitchell
                      </h6>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="label__content-wrapper">
                      <span className="label__subtitle">Start Date</span>
                      <h6 className="label__title">15 April 2024</h6>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="label__content-wrapper">
                      <span className="label__subtitle">End Date</span>
                      <h6 className="label__title">05 March 2024</h6>
                    </div>
                  </div>
                  <div className="col-span-12 md:col-span-6">
                    <div className="label__content-wrapper">
                      <span className="label__subtitle">Status</span>
                      <h6 className="label__title">Open</h6>
                    </div>
                  </div>
                  <div className="col-span-12">
                    <div className="label__content-wrapper">
                      <span className="label__subtitle">Description</span>
                      <p>
                        As a Sales Representative at Manez, you will play a key
                        role in driving revenue growth and expanding our
                        customer base. You will be responsible for identifying
                        and prospecting new leads, nurturing relationships with
                        existing clients, and closing sales opportunities. Your
                        primary duties will include.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TrainingDetailsModal;
