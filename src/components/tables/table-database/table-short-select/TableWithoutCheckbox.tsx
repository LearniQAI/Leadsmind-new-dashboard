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
import { ICompany, ILead } from "@/interface/table.interface";
import { withoutCheckListHeadCells } from "@/data/table-head-cell/table-head";
import { useTableStatusHook } from "@/hooks/use-condition-class";
import Link from "next/link";
import Image from "next/image";
import { materialData } from "@/data/material/material-data";
import { useRouter } from "next/navigation";
import TableControls from "@/components/elements/SharedInputs/TableControls";
import DeleteModal from "@/components/common/DeleteModal";
import AddCompanyModal from "@/components/pagesUI/company/companies/AddCompanyModal";

const TableWithoutCheckbox = () => {
  const routes = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<ILead | null>(null);
  const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number>(0);

  const TableShortingAndSearching = (id: number) => {
    routes.push(`/company/company-details/${id}`);
  };

  const {
    order,
    orderBy,
    selected,
    page,
    rowsPerPage,
    searchQuery,
    paginatedRows,
    filteredRows,
    handleDelete,
    handleRequestSort,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearchChange,
  } = useMaterialTableHook<ICompany | any>(materialData, 5);

  return (
    <>
      <div className="card__wrapper">
        <div className="card__title-wrap mb-5">
          <h3 className="card__heading-title">
            <i className="icon-ListBullets"></i> Table without Checkbox
          </h3>
        </div>
        <div className="manaz-common-mat-list mat-list-without-checkbox w-full table__wrapper">
          <TableControls
            rowsPerPage={rowsPerPage}
            searchQuery={searchQuery}
            handleChangeRowsPerPage={handleChangeRowsPerPage}
            handleSearchChange={handleSearchChange}
          />
          <Box sx={{ width: "100%" }} className='table-responsive'>
            <Paper sx={{ width: "100%", mb: 2 }}>
              <TableContainer className="table mb-[20px] hover multiple_tables w-full">
                <Table
                  aria-labelledby="tableTitle"
                  className="whitespace-nowrap"
                >
                  <TableHead>
                    <TableRow className="table__title">
                      {withoutCheckListHeadCells.map((headCell) => (
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
                    {paginatedRows.map((row, index) => {
                      const stausClass = useTableStatusHook(row?.status);
                      return (
                        <TableRow
                          key={index}
                          selected={selected.includes(index)}
                          onClick={() => handleClick(index)}
                        >
                          <TableCell className="sorting_1">
                            <span className="table-avatar flex justify-start items-center">
                              <Link
                                className="company__thumb me-[10px]"
                                href={`/company/company-details/${index + 1}`}
                              >
                                <Image
                                  src={row?.companyImg}
                                  alt="User Image"
                                />
                              </Link>
                              <Link
                                href={`/company/company-details/${index + 1}`}
                              >
                                {row?.name}
                              </Link>
                            </span>
                          </TableCell>

                          <TableCell className="table__loan-amount">
                            {row?.location}
                          </TableCell>

                          <TableCell className="table__loan-created">
                            {row?.phone}
                          </TableCell>
                          <TableCell className="table__loan-created">
                            {row?.email}
                          </TableCell>
                          <TableCell className="table__loan-created">
                            {row?.owner}
                          </TableCell>
                          <TableCell>
                            {row?.rating}
                            <span className="company__rating ms-[2px]">
                              <i className="fa-sharp fa-solid fa-star"></i>
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="tag-badge"> {row?.tag}</span>
                          </TableCell>
                          <TableCell className="table__loan-created">
                            <div className="company__contact">
                              <Link href="#">
                                <i className="fa-light fa-phone"></i>
                              </Link>
                              <Link href="#">
                                <i className="fa-sharp fa-light fa-envelope"></i>
                              </Link>
                              <Link href="#">
                                <i className="fa-sharp fa-light fa-mailbox"></i>
                              </Link>
                              <Link href="#">
                                <i className="fa-brands fa-whatsapp"></i>
                              </Link>
                              <Link href="#">
                                <i className="fa-brands fa-x-twitter"></i>
                              </Link>
                            </div>
                          </TableCell>

                          <TableCell className="table__delivery">
                            <span className={`bd-badge ${stausClass}`}>
                              {row?.status}
                            </span>
                          </TableCell>
                          <TableCell className="table__icon-box">
                            <div className="flex items-center justify-start gap-[10px]">
                              <button
                                type="button"
                                className="table__icon download"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  TableShortingAndSearching(row?.id);
                                }}
                              >
                                <i className="fa-regular fa-eye"></i>
                              </button>
                              <button
                                type="button"
                                className="table__icon edit"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditData(row);
                                  setModalOpen(true);
                                }}
                              >
                                <i className="fa-sharp fa-light fa-pen"></i>
                              </button>
                              <button
                                className="removeBtn table__icon delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(index);
                                  setModalDeleteOpen(true);
                                }}
                              >
                                <i className="fa-regular fa-trash"></i>
                              </button>
                            </div>
                          </TableCell>
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

      {modalOpen && <AddCompanyModal open={modalOpen} setOpen={setModalOpen} />}

      {modalDeleteOpen && (
        <DeleteModal
          open={modalDeleteOpen}
          setOpen={setModalDeleteOpen}
          handleDeleteFunc={handleDelete}
          deleteId={deleteId}
        />
      )}
    </>
  );
};

export default TableWithoutCheckbox;
