"use client";
import React, { useState } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import useMaterialTableHook from "@/hooks/useMaterialTableHook";
import { pipelineData } from "@/data/crm/pipeline-data";
import { IPipeline } from "@/interface/table.interface";
import EditLabelsModal from "./EditLabelsModal";

const LabelsTabTable = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<IPipeline | null>(null);
  const { selected, paginatedRows, handleClick } = useMaterialTableHook<
    IPipeline | any
  >(pipelineData, 5);

  return (
    <>
      <div className="manaz-common-mat-list mat-list-without-checkbox w-full table__wrapper table-responsive">
        <Box sx={{ width: "100%" }}>
          <Paper sx={{ width: "100%", mb: 2 }}>
            <TableContainer className="table mb-[20px] hover multiple_tables w-full">
              <Table aria-labelledby="tableTitle" className="whitespace-nowrap">
                <TableBody className="table__body">
                  {paginatedRows.map((row, index) => (
                    <TableRow
                      key={index}
                      selected={selected.includes(index)}
                      onClick={() => handleClick(index)}
                    >
                      <TableCell className="table__designation w-[75%]">
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
          </Paper>
        </Box>
      </div>

      {modalOpen && editData?.pipeline && (
        <EditLabelsModal
          open={modalOpen}
          setOpen={setModalOpen}
          editData={editData}
        />
      )}
    </>
  );
};

export default LabelsTabTable;
