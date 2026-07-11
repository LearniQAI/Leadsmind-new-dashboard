import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getPublishedModule, modules } from '@/data/modules';
import ModulePageTemplate from '../_components/ModulePageTemplate';

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return modules.filter((m) => m.published).map((m) => ({ slug: m.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const mod = getPublishedModule(params.slug);
  if (!mod) return { title: 'Module Not Found' };

  return {
    title: mod.metaTitle,
    description: mod.metaDescription,
    alternates: { canonical: `/solutions/${mod.slug}` },
    openGraph: {
      title: mod.metaTitle,
      description: mod.metaDescription,
      url: `/solutions/${mod.slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: mod.metaTitle,
      description: mod.metaDescription,
    },
  };
}

export default async function ModuleSlugPage({ params }: PageProps) {
  const mod = getPublishedModule(params.slug);
  if (!mod) notFound();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <ModulePageTemplate slug={mod.slug} user={user} />;
}
