/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React, { useState } from "react";
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
import { visuallyHidden } from "@mui/utils";
import useMaterialTableHook from "@/hooks/useMaterialTableHook";
import Link from "next/link";
import Image from "next/image";
import { IEmployeeSchedule, ScheduleEntry } from "@/interface/table.interface";
import { scheduleHeadCells } from "@/data/table-head-cell/table-head";
import { employeeScheduleData } from "@/data/hrm/employee-schedule-data";
import { useScheduleStatusHook } from "@/hooks/use-condition-class";
import TableControls from "@/components/elements/SharedInputs/TableControls";

const ScheduleTable = () => {
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
    handleChangeRowsPerPage,
    handleSearchChange,
  } = useMaterialTableHook<IEmployeeSchedule | any>(employeeScheduleData, 10);

  return (
    <>
      <div className="col-span-12">
        <div className="card__wrapper">
          <div className="manaz-common-mat-list w-full table__wrapper table-responsive mat-list-without-checkbox">
            <TableControls
              rowsPerPage={rowsPerPage}
              searchQuery={searchQuery}
              handleChangeRowsPerPage={handleChangeRowsPerPage}
              handleSearchChange={handleSearchChange}
            />
            <Box sx={{ width: "100%" }} className="table-responsive">
              <Paper sx={{ width: "100%", mb: 2 }}>
                <TableContainer className="table mb-[20px] hover multiple_tables w-full">
                  <Table
                    aria-labelledby="tableTitle"
                    className="whitespace-nowrap"
                  >
                    <TableHead>
                      <TableRow className="table__title">
                        {scheduleHeadCells.map((headCell) => (
                          <TableCell
                            className="table__title"
                            key={headCell.id}
                            sortDirection={
                              orderBy === headCell.id ? order : false
                            }
                          >
                            <TableSortLabel
                              active={orderBy === headCell.id}
                              direction={
                                orderBy === headCell.id ? order : "asc"
                              }
                              onClick={() => handleRequestSort(headCell.id)}
                            >
                              {headCell?.label ? (
                                <>{headCell?.label} </>
                              ) : (
                                <>
                                  <div className="date-box">
                                    <span className="date relative">
                                      {headCell?.date}
                                      <sup className="ms-[5px] text-[14px] text-body absolute top-[2px] left-7">
                                        {headCell?.dateTH}
                                      </sup>
                                    </span>
                                    <p className="flex">
                                      {headCell?.month}{" "}
                                      <span className="ms-[5px]">
                                        {headCell?.day}
                                      </span>
                                    </p>
                                  </div>
                                </>
                              )}

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
                      </TableRow>
                    </TableHead>
                    <TableBody className="table__body">
                      {paginatedRows.map((row, index) => {
                        return (
                          <TableRow
                            key={index}
                            selected={selected.includes(index)}
                            onClick={() => handleClick(index)}
                          >
                            <TableCell className="sorting_1">
                              <span className="table-avatar flex justify-start items-center">
                                <Link
                                  className="avatar-img-small me-[10px]"
                                  href={`/hrm/employee-profile/${index + 1}`}
                                >
                                  <Image
                                    className="img-36 border-circle"
                                    src={row?.employeeImg}
                                    alt="User Image"
                                  />
                                </Link>
                                <Link
                                  href={`/hrm/employee-profile/${index + 1}`}
                                >
                                  {row?.employee}
                                </Link>
                              </span>
                            </TableCell>

                            {row?.schedule?.map(
                              (scheduleItem: ScheduleEntry, index: number) => {
                                const scheduleStatus = useScheduleStatusHook(
                                  scheduleItem?.details
                                );
                                const scheduleStatusWeekend =
                                  useScheduleStatusHook(scheduleItem?.event);
                                return (
                                  <TableCell key={index}>
                                    <div
                                      className={`schedule-box ${scheduleStatus} ${
                                        scheduleStatusWeekend &&
                                        scheduleStatusWeekend
                                      }`}
                                    >
                                      <div className="schedule-box-top">
                                        <h6>{scheduleItem?.event}</h6>
                                        {scheduleItem?.additional ? (
                                          <>
                                            <span className="early-dot">
                                              {scheduleItem?.additional}
                                            </span>
                                          </>
                                        ) : (
                                          <></>
                                        )}
                                      </div>
                                      <div className="schedule-box-bottom">
                                        <span>{scheduleItem?.details}</span>
                                      </div>
                                    </div>
                                  </TableCell>
                                );
                              }
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
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
          </div>
        </div>
      </div>
    </>
  );
};

export default ScheduleTable;
