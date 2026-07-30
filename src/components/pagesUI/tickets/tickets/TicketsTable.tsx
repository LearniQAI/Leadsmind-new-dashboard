/* eslint-disable react-hooks/rules-of-hooks */
"use client";
import React, { useState } from "react";
import Link from "next/link";
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
import { ITicket } from "@/interface/table.interface";
import { ticketsHeadCells } from "@/data/table-head-cell/table-head";
import TableControls from "@/components/elements/SharedInputs/TableControls";
import DeleteModal from "@/components/common/DeleteModal";
import { DashStatusPill } from "@/components/dashboard-ui";

const PRIORITY_VARIANT: Record<string, "danger" | "warning" | "success" | "neutral"> = {
  High: "danger",
  Medium: "warning",
  Low: "neutral",
};

const STATUS_VARIANT: Record<string, "danger" | "warning" | "success" | "accent" | "neutral"> = {
  Open: "accent",
  Hold: "warning",
  Closed: "danger",
  Cancelled: "danger",
};

const TicketsTable = ({ initialTickets }: { initialTickets: any[] }) => {
  // Map Supabase data to table format
  const mappedData = initialTickets.map(t => ({
    id: t.id,
    ticketID: `#${t.id.slice(0, 4)}`,
    ticketTitle: t.subject,
    priority: t.priority.charAt(0).toUpperCase() + t.priority.slice(1),
    date: new Date(t.created_at).toLocaleDateString(),
    createdBy: t.contact ? `${t.contact.first_name} ${t.contact.last_name}` : 'Unknown',
    lastReply: t.updated_at ? new Date(t.updated_at).toLocaleDateString() : 'No reply',
    status: t.status.charAt(0).toUpperCase() + t.status.slice(1),
  }));

  const displayData = mappedData;

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
  } = useMaterialTableHook<ITicket | any>(displayData, 10);
 const [modalDeleteOpen, setModalDeleteOpen] = useState(false);
 const [deleteId, setDeleteId] = useState<number>(0);

 return (
  <>
   <div className="col-span-12">
    <div className="bg-white border border-dash-border rounded-2xl shadow-sm p-6">
     <div className="manaz-common-mat-list w-full table-responsive mat-list-without-checkbox">
      <TableControls
       rowsPerPage={rowsPerPage}
       searchQuery={searchQuery}
       handleChangeRowsPerPage={handleChangeRowsPerPage}
       handleSearchChange={handleSearchChange}
      />
       <Box sx={{ width: "100%" }} className="table-responsive">
        <Paper
          sx={{
            width: "100%",
            mb: 2,
            bgcolor: "transparent",
            boxShadow: "none",
            backgroundImage: "none",
            color: "inherit",
            "& .MuiTableContainer-root": {
              bgcolor: "transparent",
              backgroundImage: "none",
            },
            "& .MuiTable-root": {
              border: "none",
            },
            "& .MuiTableCell-root": {
              borderColor: "#E2E8F0",
              color: "#475569",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              py: "14px",
            },
            "& .MuiTableCell-head": {
              color: "#475569",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: "11px",
              letterSpacing: "0.03em",
              borderBottom: "1px solid #E2E8F0",
              bgcolor: "#F8F9FC",
              py: "12px",
            },
            "& .MuiTableSortLabel-root": {
              color: "#475569 !important",
              "&:hover": {
                color: "#0F172A !important",
              },
              "&.Mui-active": {
                color: "#1359FF !important",
                "& .MuiTableSortLabel-icon": {
                  color: "#1359FF !important",
                }
              }
            },
            "& .MuiTableSortLabel-icon": {
              color: "#475569 !important",
            },
            "& .MuiTableRow-root": {
              transition: "all 0.15s ease",
              "&.Mui-selected": {
                bgcolor: "rgba(19, 89, 255, 0.06) !important",
                "&:hover": {
                  bgcolor: "rgba(19, 89, 255, 0.1) !important",
                }
              },
              "&:hover": {
                bgcolor: "#F8F9FC !important",
              }
            }
          }}
        >
         <TableContainer className="table mb-[20px] hover multiple_tables w-full">
          <Table
           aria-labelledby="tableTitle"
           className="whitespace-nowrap"
          >
           <TableHead>
            <TableRow className="table__title">
             {ticketsHeadCells.map((headCell) => (
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
             return (
              <TableRow
               key={index}
               selected={selected.includes(index)}
               onClick={() => handleClick(index)}
              >
               <TableCell className="table__loan-amount">
                {row?.ticketID}
               </TableCell>
               <TableCell className="table__loan-amount">
                {row?.ticketTitle}
               </TableCell>

               <TableCell className="table__delivery">
                <DashStatusPill variant={PRIORITY_VARIANT[row?.priority] || "neutral"}>
                 {row?.priority}
                </DashStatusPill>
               </TableCell>

               <TableCell className="table__loan-date">
                {row?.date}
               </TableCell>
               <TableCell className="table__loan-date">
                {row?.createdBy}
               </TableCell>
               <TableCell className="table__loan-date">
                {row?.lastReply}
               </TableCell>

               <TableCell className="table__delivery">
                <DashStatusPill variant={STATUS_VARIANT[row?.status] || "neutral"}>
                 {row?.status}
                </DashStatusPill>
               </TableCell>
               <TableCell className="table__icon-box">
                <div className="flex items-center justify-start gap-[10px]">
                 <Link
                  href={`/support/tickets-reply?id=${row?.id}`}
                  className="table__icon reply"
                  onClick={(e) => {
                   e.stopPropagation();
                  }}
                 >
                  <i className="fa-sharp fa-light fa-reply"></i>
                 </Link>
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
         sx={{
          '& .MuiPaginationItem-root': {
            color: '#475569',
            borderColor: '#E2E8F0',
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 700,
            fontSize: "12px",
            '&:hover': {
              bgcolor: '#F8F9FC',
              color: '#0F172A',
            },
            '&.Mui-selected': {
              bgcolor: '#1359FF !important',
              borderColor: '#1359FF',
              color: '#fff',
              '&:hover': {
                bgcolor: '#1359FF !important',
                opacity: 0.9,
              }
            }
          }
         }}
        />
       </Box>
     </div>
    </div>
   </div>

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

export default TicketsTable;
