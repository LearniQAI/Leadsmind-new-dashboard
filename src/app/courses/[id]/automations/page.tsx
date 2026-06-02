import React from "react";
import Wrapper from "@/components/layouts/DefaultWrapper";
import { getCourse } from "@/app/actions/lms";
import { notFound } from "next/navigation";
import AutomationsClient from "./AutomationsClient";
interface PageProps {
  params: {
    id: string;
  };
}

export default async function AutomationsPage({ params }: PageProps) {
  const courseId = params.id;
  const { data: course, error } = await getCourse(courseId);

  if (error || !course) {
    notFound();
  }

  return (
    <Wrapper>
      <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)] text-white">
        <AutomationsClient course={course} />
      </div>
    </Wrapper>
  );
}
