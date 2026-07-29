import { requireAuth } from '@/lib/auth';
import { ContactForm } from '@/components/crm/ContactForm';
import { getContact } from '@/app/actions/contacts';
import { getWorkspaceMembers } from '@/app/actions/workspace';
import { listTags } from '@/app/actions/tags';
import { notFound, redirect } from 'next/navigation';
import Wrapper from "@/components/layouts/DefaultWrapper";
import MetaData from "@/hooks/useMetaData";

export const dynamic = 'force-dynamic';

export default async function EditContactPage({
 params,
}: {
 params: { id: string };
}) {
 await requireAuth();
 const { id } = params;
 const [contactResult, members, tagsRes] = await Promise.all([
  getContact(id),
  getWorkspaceMembers(),
  listTags(),
 ]);
 const availableTags = tagsRes.success ? tagsRes.data : [];

 if (!contactResult.success) {
  if (contactResult.error === 'Contact not found') {
    notFound();
  }
  redirect('/apps/contacts');
 }

 if (!contactResult.data) {
  redirect('/apps/contacts');
 }

 return (
  <MetaData pageTitle="Edit Contact">
   <Wrapper>
    <div className="space-y-8 py-10 px-4 max-w-4xl mx-auto">
     <div>
      <h1 className="text-3xl font-extrabold tracking-tight !text-dash-text mb-1">Edit contact</h1>
      <p className="text-sm !text-dash-textMuted font-medium">Update information for {contactResult.data.first_name} {contactResult.data.last_name}</p>
     </div>

     <div className="bg-white border border-dash-border rounded-2xl p-8 md:p-12 shadow-sm">
      <ContactForm initialData={contactResult.data} members={members} availableTags={availableTags} />
     </div>
    </div>
   </Wrapper>
  </MetaData>
 );
}
