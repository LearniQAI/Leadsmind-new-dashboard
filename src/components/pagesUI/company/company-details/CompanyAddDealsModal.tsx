"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  FormControl,
  Select,
  MenuItem,
  Autocomplete,
  Chip,
  TextField,
} from "@mui/material";
import {
  currencyData,
  dealsStatusDropdownData,
  pipelineData,
  trainersData,
} from "@/data/dropdown-data";
import Image from "next/image";
import { ITrainer } from "@/interface/dropdown.interface";
import { statePropsType } from "@/interface/common.interface";

const CompanyAddDealsModal = ({ open, setOpen }: statePropsType) => {
  const [selectedOwner, setSelectedOwner] = useState<ITrainer>(trainersData[0]);
  const [selectedOptions, setSelectedOptions] = useState<string>("");
  const [selectedCompany, setSelectedCompany] = useState<string>("");
  const [selectedCurrency, setSelectedCurrency] = useState<string>("");
  const handleToggle = () => setOpen(!open);

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
      <Dialog open={open} onClose={handleToggle} fullWidth maxWidth="md">
        <DialogTitle>
          <div className="flex justify-between">
            <h5 className="modal-title">Add New Lead</h5>
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
          <form>
            <div className="card__wrapper">
              <div className="grid grid-cols-12 gap-y-6 gap-x-6 maxXs:gap-x-0 justify-center items-center">
                <div className="col-span-12">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="leadName">
                        Deal Name <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="leadName"
                        id="leadName"
                        type="text"
                      />
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="lastname">
                        Pipeline <span>*</span>
                      </label>
                    </div>
                    <div className="mz-default-select">
                      <FormControl sx={{ m: 1 }}>
                        <Select
                          displayEmpty
                          value={selectedOptions}
                          onChange={(event) => {
                            setSelectedOptions(event.target.value);
                          }}
                          renderValue={(selected) =>
                            selected === "" ? "Select Pipeline" : selected
                          }
                          MenuProps={{
                            disableScrollLock: true,
                          }}
                        >
                          {pipelineData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.label}
                              className="menu-item"
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="contactnumber">
                        Status <span>*</span>
                      </label>
                    </div>
                    <div className="mz-default-select">
                      <FormControl sx={{ m: 1 }}>
                        <Select
                          displayEmpty
                          value={selectedCompany}
                          onChange={(event) => {
                            setSelectedCompany(event.target.value);
                          }}
                          renderValue={(selected) =>
                            selected === "" ? "Select Status" : selected
                          }
                          MenuProps={{
                            disableScrollLock: true,
                          }}
                        >
                          {dealsStatusDropdownData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.label}
                              className="menu-item"
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="value">
                        Value <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="text"
                        id="value"
                        type="text"
                      />
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box select-wrapper">
                    <div className="form__input-title">
                      <label htmlFor="userName">
                        Currency <span>*</span>
                      </label>
                    </div>
                    <div className="mz-default-select">
                      <FormControl sx={{ m: 1 }}>
                        <Select
                          displayEmpty
                          value={selectedCurrency}
                          onChange={(event) => {
                            setSelectedCurrency(event.target.value);
                          }}
                          renderValue={(selected) =>
                            selected === "" ? "Select Currency" : selected
                          }
                          MenuProps={{
                            disableScrollLock: true,
                          }}
                        >
                          {currencyData.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.label}
                              className="menu-item"
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="purchaseDate3">
                        Start Date <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="purchaseDate3"
                        id="purchaseDate3"
                        type="text"
                      />
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="humanFriendlyDates3">
                        Expected End Date <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="humanFriendlyDates3"
                        id="humanFriendlyDates3"
                        type="text"
                      />
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="phoneNumber">
                        Mobile Number <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="phoneNumber"
                        id="phoneNumber"
                        type="text"
                      />
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="phoneNumber3">Phone Number</label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="phoneNumber3"
                        id="phoneNumber3"
                        type="text"
                      />
                    </div>
                  </div>
                </div>

                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="emailAddress">
                        Email Address <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="emailAddress"
                        id="emailAddress"
                        type="email"
                      />
                    </div>
                  </div>
                </div>
                <div className="col-span-12 md:col-span-6">
                  <div className="from__input-box">
                    <div className="form__input-title">
                      <label htmlFor="sourceType">
                        Source Type <span>*</span>
                      </label>
                    </div>
                    <div className="form__input">
                      <input
                        className="form-control"
                        name="sourceType"
                        id="sourceType"
                        type="text"
                      />
                    </div>
                  </div>
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
                        <FormControl sx={{ m: 1 }}>
                          <Select
                            displayEmpty
                            value={selectedOwner.name}
                            onChange={(e) =>
                              setSelectedOwner(
                                trainersData.find(
                                  (trainer) => trainer.name === e.target.value
                                ) as ITrainer
                              )
                            }
                            renderValue={(selected) => {
                              if (!selected || selected === "")
                                return "Select Type";
                              return typeof selected === "string"
                                ? selected
                                : (selected as ITrainer).name;
                            }}
                            MenuProps={{
                              disableScrollLock: true,
                            }}
                          >
                            {trainersData.map((option, index) => (
                              <MenuItem
                                key={index}
                                value={option.name}
                                className="menu-item"
                              >
                                {option.name}
                              </MenuItem>
                            ))}
                          </Select>
                          {selectedOwner && (
                            <Image
                              src={selectedOwner.userImg}
                              height={30}
                              width={30}
                              alt={selectedOwner.name}
                              className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full border-2 border-gray-200"
                            />
                          )}
                        </FormControl>
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
              <button className="btn btn-primary">Submit</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CompanyAddDealsModal;
