import React from 'react';
import Wrapper from '@/components/layouts/DefaultWrapper';
import FormsClient from './FormsClient';
import { getForms } from '@/app/actions/marketing';

export default async function FormsPage() {
 const { data: forms } = await getForms();

 return (
  <Wrapper>
   <div className="p-6 max-w-7xl mx-auto font-body min-h-[calc(100vh-80px)]">
    <FormsClient initialForms={forms || []} />
   </div>
  </Wrapper>
 );
}
