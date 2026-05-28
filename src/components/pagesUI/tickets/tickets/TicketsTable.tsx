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
import {
 useTablePrirotyHook,
 useTableStatusHook,
} from "@/hooks/use-condition-class";
import TableControls from "@/components/elements/SharedInputs/TableControls";
import DeleteModal from "@/components/common/DeleteModal";

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
    <div className="card__wrapper">
     <div className="manaz-common-mat-list w-full table__wrapper table-responsive mat-list-without-checkbox">
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
              borderColor: "rgba(255, 255, 255, 0.05)",
              color: "var(--t2)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "13px",
              py: "14px",
            },
            "& .MuiTableCell-head": {
              color: "var(--t3)",
              fontFamily: "'Space Grotesk', sans-serif",
              fontWeight: 700,
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              bgcolor: "rgba(255, 255, 255, 0.01)",
              py: "12px",
            },
            "& .MuiTableSortLabel-root": {
              color: "var(--t3) !important",
              "&:hover": {
                color: "var(--t2) !important",
              },
              "&.Mui-active": {
                color: "var(--accent2) !important",
                "& .MuiTableSortLabel-icon": {
                  color: "var(--accent2) !important",
                }
              }
            },
            "& .MuiTableSortLabel-icon": {
              color: "var(--t3) !important",
            },
            "& .MuiTableRow-root": {
              transition: "all 0.15s ease",
              "&.Mui-selected": {
                bgcolor: "rgba(37, 99, 235, 0.08) !important",
                "&:hover": {
                  bgcolor: "rgba(37, 99, 235, 0.12) !important",
                }
              },
              "&:hover": {
                bgcolor: "rgba(255, 255, 255, 0.02) !important",
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
             const stausClass = useTableStatusHook(row?.status);
             const priorityClass = useTablePrirotyHook(
              row?.priority
             );
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
                <span className={`bd-badge ${priorityClass}`}>
                 {row?.priority}
                </span>
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
                <span className={`bd-badge ${stausClass}`}>
                 {row?.status}
                </span>
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
            color: 'var(--t2)',
            borderColor: 'rgba(255,255,255,0.1)',
            fontFamily: "'Space Grotesk', sans-serif",
            fontWeight: 700,
            fontSize: "12px",
            '&:hover': {
              bgcolor: 'rgba(255,255,255,0.05)',
              color: 'var(--t1)',
            },
            '&.Mui-selected': {
              bgcolor: 'var(--accent) !important',
              borderColor: 'var(--accent)',
              color: '#fff',
              '&:hover': {
                bgcolor: 'var(--accent2) !important',
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
