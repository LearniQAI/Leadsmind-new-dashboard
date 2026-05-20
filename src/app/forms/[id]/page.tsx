import { redirect } from 'next/navigation';

export default function FormIdRootRedirect({ params }: { params: { id: string } }) {
  redirect(`/forms/builder/${params.id}`);
}
