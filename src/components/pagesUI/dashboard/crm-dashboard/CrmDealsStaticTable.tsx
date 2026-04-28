/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import * as React from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Paper from "@mui/material/Paper";
import Checkbox from "@mui/material/Checkbox";
import { visuallyHidden } from "@mui/utils";
import { IDealStatistic } from "@/interface/table.interface";
import { dealsStatics } from "@/data/crm/deals-statics";
import Image, { StaticImageData } from "next/image";
import Link from "next/link";
import CustomDropdown from "@/components/dropdown/CustomDropdown";
import { dropdownItems } from "@/data/dropdown-data";
import { useLocaitonStatusHook } from "@/hooks/use-condition-class";

const rows = dealsStatics.map((item) =>
  createData(
    item.id,
    item.salesRep,
    item.category,
    item.email,
    item.location,
    item.date,
    item.employeeImg
  )
);

function createData(
  id: number,
  salesRep: string,
  category: string,
  email: string,
  location: string,
  date: string,
  employeeImg: StaticImageData
): IDealStatistic {
  return { id, salesRep, category, email, location, date, employeeImg };
}

function descendingComparator(
  a: { [x: string]: number },
  b: { [x: string]: number },
  orderBy: string | number
) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order: "asc" | "desc", orderBy: string) {
  return order === "desc"
    ? (a: any, b: any) => descendingComparator(a, b, orderBy)
    : (a: any, b: any) => -descendingComparator(a, b, orderBy);
}

function stableSort(array: any[], comparator: (a: any, b: any) => number) {
  const stabilizedThis = array.map((el: any, index: any) => [el, index]);
  stabilizedThis.sort((a: number[], b: number[]) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el: any[]) => el[0]);
}

const headCells = [
  { id: "salesRep", numeric: false, disablePadding: true, label: "Sales Rep" },
  { id: "category", numeric: true, disablePadding: false, label: "category" },
  { id: "email", numeric: true, disablePadding: false, label: "Email" },
  { id: "location", numeric: true, disablePadding: false, label: "Location" },
  { id: "date", numeric: true, disablePadding: false, label: "Date" },
];

export default function CrmDealsStaticTable() {
  const [order, setOrder] = React.useState<"asc" | "desc">("asc");
  const [orderBy, setOrderBy] = React.useState("category");
  const [selected, setSelected] = React.useState<number[]>([]);
  const [page, setPage] = React.useState(0);
  const [dense, setDense] = React.useState(false);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  const handleRequestSort = (
    event: React.MouseEvent<HTMLElement>,
    property: string
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (event: { target: { checked: boolean } }) => {
    if (event.target.checked) {
      const newSelected = rows.map((n) => n.id);
      setSelected(newSelected);
      return;
    }
    setSelected([]);
  };

  const handleClick = (
    event: React.MouseEvent<HTMLTableRowElement, MouseEvent>,
    id: number
  ) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(selected, id);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(selected.slice(1));
    } else if (selectedIndex === selected.length - 1) {
      newSelected = newSelected.concat(selected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        selected.slice(0, selectedIndex),
        selected.slice(selectedIndex + 1)
      );
    }
    setSelected(newSelected);
  };

  const handleChangePage = (event: any, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: { target: { value: string } }) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const isSelected = (id: number) => selected.indexOf(id) !== -1;

  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

  const visibleRows = React.useMemo(
    () =>
      stableSort(rows, getComparator(order, orderBy)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [order, orderBy, page, rowsPerPage]
  );

  return (
    <>
      <div className="card__wrapper">
        <div className="table__wrapper table-responsive">
          <div className="dataTables_wrapper no-footer">
            <div className="card__title-wrap flex items-center justify-between mb-[20px]">
              <h5 className="card__heading-title">Deals Static</h5>
              <CustomDropdown items={dropdownItems} />
            </div>
            <div className="manaz-common-mat-list w-full table__wrapper table-responsive ">
              <Box sx={{ width: "100%" }}>
                <Paper sx={{ width: "100%", mb: 2 }}>
                  <TableContainer>
                    <Table
                      aria-labelledby="tableTitle"
                      className="whitespace-nowrap"
                    >
                      <TableHead>
                        <TableRow className="table__title">
                          <TableCell padding="checkbox">
                            <Checkbox
                              color="primary"
                              indeterminate={
                                selected.length > 0 &&
                                selected.length < rows.length
                              }
                              checked={
                                rows.length > 0 &&
                                selected.length === rows.length
                              }
                              onChange={handleSelectAllClick}
                              inputProps={{
                                "aria-label": "select all desserts",
                              }}
                              size="small"
                              className="custom-checkbox checkbox-small"
                            />
                          </TableCell>
                          {headCells.map((headCell) => (
                            <TableCell
                              key={headCell.id}
                              align={headCell.numeric ? "left" : "left"}
                              padding={
                                headCell.disablePadding ? "none" : "normal"
                              }
                              sortDirection={
                                orderBy === headCell.id ? order : false
                              }
                            >
                              <TableSortLabel
                                active={orderBy === headCell.id}
                                direction={
                                  orderBy === headCell.id ? order : "asc"
                                }
                                onClick={(event) =>
                                  handleRequestSort(event, headCell.id)
                                }
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
                        {visibleRows.map((row, index) => {
                          const isItemSelected = isSelected(row.id);
                          const labelId = `enhanced-table-checkbox-${index}`;
                          const stausClass = useLocaitonStatusHook(
                            row?.location
                          );
                          return (
                            <TableRow
                              hover
                              onClick={(event) => handleClick(event, row.id)}
                              role="checkbox"
                              aria-checked={isItemSelected}
                              tabIndex={-1}
                              key={row.id}
                              selected={isItemSelected}
                              sx={{ cursor: "pointer" }}
                            >
                              <TableCell padding="checkbox">
                                <Checkbox
                                  color="primary"
                                  checked={isItemSelected}
                                  inputProps={{
                                    "aria-labelledby": labelId,
                                  }}
                                  size="small"
                                  className="custom-checkbox checkbox-small"
                                />
                              </TableCell>

                              <TableCell className="sorting_1">
                                <span className="table-avatar flex justify-start items-center">
                                  <Link className="me-[10px]" href="">
                                    <Image
                                      className="img-36 border-circle"
                                      src={row?.employeeImg}
                                      alt="User Image"
                                    />
                                  </Link>
                                  <Link href="">{row?.salesRep}</Link>
                                </span>
                              </TableCell>

                              <TableCell>{row.category}</TableCell>
                              <TableCell>{row.email}</TableCell>
                              <TableCell>
                                <Link
                                  className={`bd-badge ${stausClass}`}
                                  href="#"
                                >
                                  {row.location}
                                </Link>
                              </TableCell>

                              <TableCell>{row.date}</TableCell>
                              <TableCell className="table__icon-box">
                                <div className="flex items-center justify-start gap-[10px]">
                                  <button
                                    type="button"
                                    className="table__icon download"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <i className="fa-regular fa-arrow-down-to-bracket"></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="table__icon edit"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                    }}
                                  >
                                    <i className="fa-sharp fa-light fa-pen"></i>
                                  </button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                        {emptyRows > 0 && (
                          <TableRow
                            style={{ height: (dense ? 33 : 53) * emptyRows }}
                          >
                            <TableCell colSpan={6} />
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={rows.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                  />
                </Paper>
              </Box>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
