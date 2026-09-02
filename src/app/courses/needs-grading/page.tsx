import React from "react";
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";
import NeedsGradingClient from "./NeedsGradingClient";
import { getWorkspacePendingGradingQueue } from "@/app/actions/courseGrading";

export const dynamic = "force-dynamic";

export default async function NeedsGradingPage() {
  const res = await getWorkspacePendingGradingQueue();
  const items = "data" in res ? res.data : [];

  return (
    <MetaData pageTitle="Needs Grading">
      <Wrapper>
        <div className="mx-auto min-h-[calc(100vh-80px)] max-w-6xl p-6 font-body">
          <NeedsGradingClient items={items} />
        </div>
      </Wrapper>
    </MetaData>
  );
}
