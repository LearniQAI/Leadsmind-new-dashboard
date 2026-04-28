"use client";
import { Tab, Tabs } from "@mui/material";
import Link from "next/link";
import React, { useState } from "react";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DealsStagesTabContent from "./DealsStagesTabContent";
import LeadStagesTabContent from "./LeadStagesTabContent";
import LabelsTabTable from "./LabelsTabTable";
import PipelineTable from "./PipelineTable";
import SourcesTabTable from "./SourcesTabTable";
import AddPipelineModal from "./AddPipelineModal";

const CrmSetupMainArea = () => {
  const [value, setValue] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };
  return (
    <>
      {/* -- App side area start -- */}
      <div className="app__slide-wrapper">
        <div className="breadcrumb__area">
          <div className="breadcrumb__wrapper mb-[25px]">
            <nav>
              <ol className="breadcrumb flex items-center mb-0">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active">CRM Setup</li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModalOpen(true)}
              >
                Add Pipeline
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12">
          <div className="col-span-12">
            <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
              <div className="col-span-12 xxl:col-span-4">
                <div className="card__wrapper no-height">
                  <div className="crm_vertical_tabs">
                    <Tabs
                      value={value}
                      onChange={handleChange}
                      orientation="vertical"
                      variant="scrollable"
                      className="w-full"
                    >
                      {[
                        "Pipeline",
                        "Lead Stages",
                        "Deal Stages",
                        "Sources",
                        "Labels",
                      ].map((label, index) => (
                        <Tab
                          key={index}
                          label={
                            <div className="flex justify-between items-center w-full">
                              <span style={{ textAlign: "left" }}>{label}</span>
                              <ChevronRightIcon style={{ fontSize: "28px" }} />
                            </div>
                          }
                        />
                      ))}
                    </Tabs>
                  </div>
                </div>
              </div>
              <div className="col-span-12 xxl:col-span-8">
                <div className="card__wrapper no-height">
                  <div className="tab-content">
                    <div hidden={value !== 0}>
                      {value === 0 && <PipelineTable />}
                    </div>
                    <div hidden={value !== 1}>
                      {value === 1 && <LeadStagesTabContent />}
                    </div>
                    <div hidden={value !== 2}>
                      {value === 2 && <DealsStagesTabContent />}
                    </div>
                    <div hidden={value !== 3}>
                      {value === 3 && <SourcesTabTable />}
                    </div>
                    <div hidden={value !== 4}>
                      {value === 4 && <LabelsTabTable />}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {modalOpen && (
        <AddPipelineModal open={modalOpen} setOpen={setModalOpen} />
      )}
      {/* -- App side area end -- */}
    </>
  );
};

export default CrmSetupMainArea;
