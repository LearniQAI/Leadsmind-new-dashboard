import Link from "next/link";
import React from "react";
import DocumentsTable from "./DocumentsTable";

const Documents = () => {
  return (
    <>
      <div className="grid grid-cols-12">
        <div className="col-span-12">
          <div className="card__wrapper">
            <div className="card__title-wrap mb-[25px]">
              <h5 className="card__heading-title">Documents</h5>
            </div>
            <DocumentsTable />
          </div>
        </div>
      </div>
    </>
  );
};

export default Documents;
