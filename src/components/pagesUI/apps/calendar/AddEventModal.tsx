import InputField from '@/components/elements/SharedInputs/InputField';
import SelectBox from '@/components/elements/SharedInputs/SelectBox';
import { eventCategoryData } from '@/data/dropdown-data';
import { statePropsType } from '@/interface/common.interface';
import { Dialog, DialogContent, DialogTitle } from '@mui/material';
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { useForm } from 'react-hook-form';
import FormLabel from "@/components/elements/SharedInputs/FormLabel";
import { toast } from 'sonner';
import { IEvent } from '@/interface';

const AddEventModal = ({ open, setOpen }: statePropsType) => {
    const [selectEventDate, setSelectEventDate] = useState<Date | null>(new Date());
    const handleToggle = () => setOpen(!open);
    const { register, handleSubmit, control, formState: { errors }, reset } = useForm<IEvent>();


    // handle submit form
    const onSubmit = async (data: IEvent) => {
        try {
          toast.success("Event added successfully! 🎉");
          reset();
          setSelectEventDate(null);
        } catch (error: any) {
          const errorMessage = error?.response?.data?.message || "Something went wrong while adding the event. Please try again.";
          toast.error(errorMessage);
        }
      };

    return (
        <>
            <Dialog open={open} onClose={handleToggle} maxWidth={false}
                sx={{
                    '& .MuiDialog-paper': {
                        width: '500px',
                    },
                }}>
                <DialogTitle>
                    <div className="flex justify-between">
                        <h5 className="modal-title">Add New Event</h5>
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
                        <div className="card__wrapper mb-20">
                            <div className="grid grid-cols-12 gap-5 maxXs:gap-x-0 items-center justify-center">
                                <div className="col-span-12">
                                    <InputField
                                        label="Event Name"
                                        id="event"
                                        type="text"
                                        register={register("event", {
                                            required: "Event Name is required",
                                        })}
                                        error={errors.event}
                                    />
                                </div>
                                <div className="col-span-12">
                                    <FormLabel label="Event Date" id="humanFriendlyDates" optional />
                                    <div className="datepicker-style">
                                        <DatePicker
                                            id="humanFriendlyDates"
                                            selected={selectEventDate}
                                            onChange={(date) => setSelectEventDate(date)}
                                            showYearDropdown
                                            showMonthDropdown
                                            useShortMonthInDropdown
                                            showPopperArrow={false}
                                            peekNextMonth
                                            dropdownMode="select"
                                            isClearable
                                            dateFormat="dd/MM/yyyy"
                                            placeholderText=""
                                            className="w-full"
                                            required={false}
                                        />
                                    </div>
                                </div>
                                <div className="col-span-12">
                                    <SelectBox
                                        id="category"
                                        label="Category"
                                        options={eventCategoryData}
                                        control={control}
                                        isRequired={false}
                                    />
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

export default AddEventModal;