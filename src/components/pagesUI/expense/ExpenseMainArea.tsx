"use client";
import React, { useState } from "react";
import ExpenseSummary from "./ExpenseSummary";
import ExpenseTable from "./ExpenseTable";
import Link from "next/link";
import AddExpenseModal from "./AddExpenseModal";

const ExpenseMainArea = () => {
  const [modalOpen, setModalOpen] = useState(false);
  return (
    <>
      <div className="app__slide-wrapper">
        <div className="breadcrumb__area">
          <div className="breadcrumb__wrapper mb-[25px]">
            <nav>
              <ol className="breadcrumb mb-0 flex">
                <li className="breadcrumb-item">
                  <Link href="/">Home</Link>
                </li>
                <li className="breadcrumb-item active" aria-current="page">
                  Expense
                </li>
              </ol>
            </nav>
            <div className="breadcrumb__btn">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setModalOpen(true)}
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-x-6 maxXs:gap-x-0">
          <ExpenseSummary />
          <ExpenseTable />
        </div>
      </div>

      {modalOpen && <AddExpenseModal open={modalOpen} setOpen={setModalOpen} />}
    </>
  );
};

export default ExpenseMainArea;
