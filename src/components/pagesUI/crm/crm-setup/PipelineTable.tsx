"use client";
import React, { useRef, useState } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import Pagination from "@mui/material/Pagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import { visuallyHidden } from "@mui/utils";
import useMaterialTableHook from "@/hooks/useMaterialTableHook";
import { pipelineData } from "@/data/crm/pipeline-data";
import { IPipeline } from "@/interface/table.interface";
import EditPipeLineModal from "./EditPipeLineModal";
import { exportToExcel, exportToPDF, printTable } from "@/lib/utils/tableUtilis";
const headCells = [
  {
    id: "pipeline",
    numeric: false,
    disablePadding: false,
    label: "Pipeline",
  },
];

const PipelineTable = () => {
  const tableRef = useRef<HTMLTableElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<IPipeline | null>(null);
  const {
    order,
    orderBy,
    selected,
    page,
    rowsPerPage,
    searchQuery,
    paginatedRows,
    filteredRows,
    handleRequestSort,
    handleClick,
    handleChangePage,
    handleSearchChange,
  } = useMaterialTableHook<IPipeline | any>(pipelineData, 5);

  return (
    <>
      <div className="manaz-common-mat-list mat-list-without-checkbox w-full table__wrapper table-responsive">
        <Box className="table-search-box mb-[30px]" sx={{ p: 2 }}>
          <div className="flex flex-wrap gap-2.5">
            <button className="dt-button buttons-excel" onClick={() => exportToExcel(tableRef)}>
              <span>Excel</span>
            </button>
            <button className="dt-button buttons-pdf" onClick={() => exportToPDF(tableRef)}>
              <span>PDF</span>
            </button>
            <button className="dt-button buttons-print" onClick={() => printTable(tableRef)}>
              <span>Print</span>
            </button>
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
        <Box sx={{ width: "100%" }}>
          <Paper sx={{ width: "100%", mb: 2 }}>
            <TableContainer className="table mb-[20px] hover multiple_tables w-full">
              <Table aria-labelledby="tableTitle" className="whitespace-nowrap" ref={tableRef}>
                <TableHead>
                  <TableRow className="table__title">
                    {headCells.map((headCell) => (
                      <TableCell
                        className="table__title w-[75%]"
                        key={headCell.id}
                        sortDirection={orderBy === headCell.id ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === headCell.id}
                          direction={orderBy === headCell.id ? order : "asc"}
                          onClick={() => handleRequestSort(headCell.id)}
                        >
                          {headCell.label}
                          {orderBy === headCell.id ? (
                            <Box component="span" sx={visuallyHidden}>
                              {order === "desc"
                                ? "sorted descending"
                                : "sorted ascending"}
                            </Box>
                          ) : null}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody className="table__body">
                  {paginatedRows.map((row, index) => (
                    <TableRow
                      key={index}
                      selected={selected.includes(index)}
                      onClick={() => handleClick(index)}
                    >
                      <TableCell className="table__designation">
                        {row?.pipeline}
                      </TableCell>

                      <TableCell className="table__icon-box">
                        <div className="flex items-center justify-start gap-[10px]">
                          <button
                            type="button"
                            className="table__icon edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setModalOpen(true);
                              setEditData(row);
                            }}
                          >
                            <i className="fa-sharp fa-light fa-pen"></i>
                          </button>
                          <button
                            className="removeBtn table__icon delete"
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                          >
                            <i className="fa-regular fa-trash"></i>
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box className="table-search-box mt-[30px]" sx={{ p: 2 }}>
              <Box>
                {`Showing ${(page - 1) * rowsPerPage + 1} to ${Math.min(
                  page * rowsPerPage,
                  filteredRows.length
                )} of ${filteredRows.length} entries`}
              </Box>
              <Pagination
                count={Math.ceil(filteredRows.length / rowsPerPage)}
                page={page}
                onChange={(e, value) => handleChangePage(value)}
                variant="outlined"
                shape="rounded"
                className="manaz-pagination-button"
              />
            </Box>
          </Paper>
        </Box>
      </div>

      {modalOpen && editData?.pipeline && (
        <EditPipeLineModal
          open={modalOpen}
          setOpen={setModalOpen}
          editData={editData}
        />
      )}
    </>
  );
};

export default PipelineTable;
