import React, { useState, useEffect } from "react";
import {
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import Image from "next/image";

interface ISelectWithImageProps<T> {
  data: T[];
  selectedValue: T | null;
  valueKey: keyof T; // Key to use as the value in options
  displayKey: keyof T; // Key to display in options
  imageKey: keyof T; // Key for the image source
  placeholder?: string;
  title?: string; // Default title to display initially
  image?: keyof T | any; // Default image to display initially
  onChange: (selected: T | null) => void;
}

function SelectWithImage<T extends Record<string, any>>({
  data,
  selectedValue,
  valueKey,
  displayKey,
  imageKey,
  placeholder = "Select an option",
  title,
  image,
  onChange,
}: ISelectWithImageProps<T>) {
  const [isDefault, setIsDefault] = useState(true);

  // Reset to default when selectedValue changes
  useEffect(() => {
    if (!selectedValue) {
      setIsDefault(true);
    } else {
      setIsDefault(false);
    }
  }, [selectedValue]);

  const handleChange = (event: SelectChangeEvent<T[keyof T]>) => {
    const selected = data.find((item) => item[valueKey] === event.target.value);
    setIsDefault(false);
    onChange(selected || null);
  };

  return (
    <FormControl sx={{ m: 1 }}>
      <Select
        displayEmpty
        value={selectedValue ? selectedValue[valueKey] : ""}
        onChange={handleChange} // Using SelectChangeEvent
        renderValue={(selected) => {
          if (isDefault && title) return title; // Show default title
          if (!selected || selected === "") return placeholder;
          return selectedValue?.[displayKey] as string; // Show selected value
        }}
        MenuProps={{
          disableScrollLock: true,
        }}
      >
        {data.map((item, index) => (
          <MenuItem key={index} value={item[valueKey]}>
            {item[displayKey] as string /* Explicitly cast as string */}
          </MenuItem>
        ))}
      </Select>

      {(isDefault && image) || selectedValue ? (
        <Image
          src={(isDefault ? image : selectedValue?.[imageKey]) as string} // Use default or selected image
          height={30}
          width={30}
          alt={(isDefault ? title : selectedValue?.[displayKey]) as string} // Use default or selected title
          className="absolute right-4 top-1/2 transform -translate-y-1/2 rounded-full border-2 border-gray-200"
        />
      ) : null}
    </FormControl>
  );
}

export default SelectWithImage;
