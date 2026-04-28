"use client";
import React, { useState } from "react";
import AddNewEmployeeModal from "./AddNewEmployeeModal";
import { FormControl, MenuItem, Select, SelectChangeEvent } from "@mui/material";
import { employeeDesignationData } from "@/data/dropdown-data";

const EmployeeFilter = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string>("");
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    setSelectedOptions(event.target.value);
  };
  return (
    <>
      <div className="grid grid-cols-12 gap-x-5 maxXs:gap-x-0 mb-[20px]">
        <div className="col-span-12 md:col-span-6 xxl:col-span-3">
          <div className="card__wrapper">
            <div className="search-box">
              <input
                type="text"
                className="form-control"
                id="employeeName"
                placeholder="Employee Name"
              />
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 xxl:col-span-3">
          <div className="card__wrapper">
            <div className="search-box">
              <input
                type="text"
                className="form-control"
                id="employeeId"
                placeholder="Employee ID"
              />
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 xxl:col-span-3">
          <div className="card__wrapper">
            <div className="from__input-box select-wrapper">
              <div className="mz-default-select">
                <FormControl sx={{ m: 1 }}>
                  <Select
                    displayEmpty
                    value={selectedOptions}
                    onChange={handleSelectChange}
                    renderValue={(selected) => (selected === "" ? "Employee Designation" : selected)}
                    MenuProps={{
                      disableScrollLock: true,
                    }}
                  >
                    {employeeDesignationData.map((option) => (
                      <MenuItem key={option.value} value={option.label} className="menu-item">
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-12 md:col-span-6 xxl:col-span-3">
          <div className="card__wrapper">
            <div className="flex items-center justify-between flex-wrap gap-[15px]">
              <button type="button" className="btn btn-secondary">
                Filters
              </button>
              <button
                type="button"
                className="btn btn-primary max-w-[68%] w-full"
                data-bs-toggle="modal"
                data-bs-target="#addNewEmployee"
                onClick={() => setModalOpen(true)}
              >
                Add Employee
              </button>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && (
        <AddNewEmployeeModal open={modalOpen} setOpen={setModalOpen} />
      )}
    </>
  );
};

export default EmployeeFilter;
