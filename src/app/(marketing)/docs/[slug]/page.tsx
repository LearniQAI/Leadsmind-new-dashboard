import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getDocCategory, docCategories } from '@/data/docs';
import DocCategoryContent from '../_components/DocCategoryContent';

interface PageProps {
  params: { slug: string };
}

export function generateStaticParams() {
  return docCategories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const category = getDocCategory(params.slug);
  if (!category) return { title: 'Not Found' };

  return {
    title: category.label,
    description: category.description,
    alternates: { canonical: `/docs/${category.slug}` },
  };
}

export default async function DocCategoryPage({ params }: PageProps) {
  const category = getDocCategory(params.slug);
  if (!category) notFound();

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <DocCategoryContent slug={category.slug} user={user} />;
}
