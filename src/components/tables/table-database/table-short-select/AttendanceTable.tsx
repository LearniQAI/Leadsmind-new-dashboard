/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React from "react";
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
import Image from "next/image";
import Link from "next/link";
import {
    adminAttendanceData,
    dateKeys,
} from "@/data/hrm/admin-attendance-data";
import { IAdminAttendance } from "@/interface/table.interface";
import { useAttendanceHook } from "@/hooks/use-condition-class";
import { adminAttendanceHeadCells } from "@/data/table-head-cell/table-head";
import TableControls from "@/components/elements/SharedInputs/TableControls";
import AttendanceTypeIcons from "@/components/pagesUI/hrm/attendance/AttendanceTypeIcons";

const AttendanceTable = () => {
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
    } = useMaterialTableHook<IAdminAttendance | any>(adminAttendanceData, 15);

    return (
        <>
            <div className="card__wrapper">
                <div className="card__title-wrap mb-5">
                    <h3 className="card__heading-title">
                        <i className="icon-ListBullets"></i> Attendance table
                    </h3>
                </div>
                <AttendanceTypeIcons />
                <div className="manaz-common-mat-list mat-list-without-checkbox w-full table__wrapper">
                    <TableControls
                        rowsPerPage={rowsPerPage}
                        searchQuery={searchQuery}
                        handleChangeRowsPerPage={handleChangeRowsPerPage}
                        handleSearchChange={handleSearchChange}
                    />

                    <Box
                        className="table-search-box mb-[20px] multiple_tables dataTable no-footer table-responsive"
                        sx={{ width: "100%" }}
                    >
                        <Paper sx={{ width: "100%", mb: 2 }}>
                            <TableContainer className="table mb-[20px] hover multiple_tables w-full">
                                <Table
                                    aria-labelledby="tableTitle"
                                    className="whitespace-nowrap"
                                >
                                    <TableHead>
                                        <TableRow className="table__title">
                                            {adminAttendanceHeadCells.map((headCell) => (
                                                <TableCell
                                                    className="table__title table_head_custom"
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
                                        </TableRow>
                                    </TableHead>
                                    <TableBody className="table__body">
                                        {paginatedRows.map((row, index) => {
                                            // Use map to loop through date keys and render the cells
                                            return (
                                                <TableRow
                                                    key={index}
                                                    selected={selected.includes(index)}
                                                    onClick={() => handleClick(index)}
                                                >
                                                    <TableCell className="sorting_1">
                                                        <span className="table-avatar flex justify-start items-center">
                                                            <Link
                                                                className="me-2.5 avatar-img"
                                                                href={`/hrm/employee-profile/${index + 1}`}
                                                            >
                                                                <Image
                                                                    className=" border-circle"
                                                                    src={row?.employeeImg}
                                                                    alt="User Image"
                                                                />
                                                            </Link>
                                                            <Link
                                                                href={`/hrm/employee-profile/${index + 1}`}
                                                                className="avatar-name"
                                                            >
                                                                {row?.name}
                                                            </Link>
                                                        </span>
                                                    </TableCell>
                                                    {dateKeys.map((dateKey) => {
                                                        // Dynamically call the useAttendanceHook for each dateKey
                                                        const attendanceStatus = useAttendanceHook(
                                                            row?.[dateKey]
                                                        );

                                                        return (
                                                            <TableCell key={dateKey}>
                                                                <button>
                                                                    <i className={attendanceStatus}></i>
                                                                </button>
                                                            </TableCell>
                                                        );
                                                    })}
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
        </>
    );
};

export default AttendanceTable;
