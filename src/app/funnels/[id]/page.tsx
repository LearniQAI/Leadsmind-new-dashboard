import { redirect } from 'next/navigation';

export default async function FunnelBuilderRouteRedirect({ params }: { params: { id: string } }) {
 const { id } = await params;
 redirect(`/editor/funnel/${id}`);
}
