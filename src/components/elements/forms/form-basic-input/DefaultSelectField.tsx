'use client';
import { FormControl, MenuItem, Select, SelectChangeEvent } from '@mui/material';
import React, { useState } from 'react';

interface SelectorOption {
  value: string;
  label: string;
}

const singleSelectorData: SelectorOption[] = [
  { value: '1', label: 'CRM Analytics' },
  { value: '2', label: 'Banking' },
  { value: '3', label: 'Crypto' },
];

const DefaultSelectField: React.FC = () => {
  const [selectedOptions, setSelectedOptions] = useState<string>("");
  const handleSelectChange = (event: SelectChangeEvent<string>) => {
    setSelectedOptions(event.target.value);
  };

  return (
    <>
      <div className="card__wrapper no-height">
        <div className="card__title-wrap mb-[20px]">
          <h5 className="card__heading-title">Default Select Field</h5>
        </div>

        <div className="from__input-box from-grid select-wrapper">
          <div className="form__input-title">
            <label htmlFor="exampleFormControlSelect1" className="form-label">Example select</label>
          </div>
          <div className="mz-default-select w-[75%]">
            <FormControl sx={{ m: 1 }}>
              <Select
                displayEmpty
                value={selectedOptions}
                onChange={handleSelectChange}
                renderValue={(selected) => (selected === "" ? "Default Select" : selected)}
                MenuProps={{
                  disableScrollLock: true,
                }}
              >
                {singleSelectorData.map((option) => (
                  <MenuItem key={option.value} value={option.label} className="menu-item">
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
        <div className="from__input-box from-grid">
          <div className="form__input-title">
            <label htmlFor="exampleDataList" className="form-label">Datalist example</label>
          </div>
          <div className="form__input">
            <input className="form-control" list="datalistOptions" id="exampleDataList" placeholder="Type to search..." />
          </div>
        </div>
      </div>
    </>
  );
};

export default DefaultSelectField;
