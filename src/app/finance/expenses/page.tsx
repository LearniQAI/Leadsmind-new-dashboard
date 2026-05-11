import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import React from "react";
import { getExpensesLive } from "@/app/actions/expenses";
import ExpenseLiveClient from "@/components/pagesUI/expense/ExpenseLiveClient";

export const dynamic = 'force-dynamic';

export default async function ExpensePage() {
 const { data: expenses } = await getExpensesLive();

 return (
  <MetaData pageTitle="Expenses">
   <Wrapper>
    <ExpenseLiveClient initialExpenses={expenses || []} />
   </Wrapper>
  </MetaData>
 );
}
