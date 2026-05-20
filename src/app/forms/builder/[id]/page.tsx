import React from 'react';
import { FormBuilderProvider } from './components/FormBuilderContext';
import { BuilderLayout } from './components/BuilderLayout';
import { getForm } from '@/app/actions/marketing';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function FormBuilderPage({ params }: { params: { id: string } }) {
  const { data: form, error } = await getForm(params.id);
  
  if (error || !form) {
    notFound();
  }
  
  return (
    <FormBuilderProvider initialForm={form}>
      <BuilderLayout />
    </FormBuilderProvider>
  );
}
