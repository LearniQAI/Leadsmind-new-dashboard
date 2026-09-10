import React from 'react';
import { getPublicCalendarBySlug } from '@/app/actions/calendar/core';
import PublicBookingLayout from '@/components/calendar/public/PublicBookingLayout';
import { notFound } from 'next/navigation';

export default async function BookingPage({
  params
}: {
  params: { slug: string }
}) {
  const { slug } = await params;
  const calendar = await getPublicCalendarBySlug(slug);

  if (!calendar) {
    return notFound();
  }

  return <PublicBookingLayout calendar={calendar} />;
}
