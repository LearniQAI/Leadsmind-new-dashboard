import React from "react";
import Box from "@mui/material/Box";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

interface TableControlsProps {
  rowsPerPage: number;
  searchQuery: string;
  handleChangeRowsPerPage: (value: number) => void;
  handleSearchChange: (query: string) => void;
  rowsPerPageOptions?: number[]; // Optional custom row options
}

const TableControls: React.FC<TableControlsProps> = ({
  rowsPerPage,
  searchQuery,
  handleChangeRowsPerPage,
  handleSearchChange,
  rowsPerPageOptions = [5, 10, 15, 20, 25, 50], // Default options
}) => {
  return (
    <Box className="table-search-box mb-[30px]" sx={{ p: 2}}>
      <div className="flex justify-between items-center gap-2.5">
        <span>Show</span>
        <Select
          value={rowsPerPage}
          onChange={(e) => handleChangeRowsPerPage(+e.target.value)}
          size="small"
          sx={{ width: 100 }}
          className="manaz-table-row-per-page"
        >
          {rowsPerPageOptions.map((option) => (
            <MenuItem key={option} value={option} className="menu-item">
              {option}
            </MenuItem>
          ))}
        </Select>
        <span>entries</span>
      </div>
      <div className="flex justify-between items-center gap-2.5">
        <span>Search:</span>
        <TextField
          id="outlined-search"
          type="search"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          size="small"
          className="manaz-table-search-input"
        />
      </div>
    </Box>
  );
};

export default TableControls;
