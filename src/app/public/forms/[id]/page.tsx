import React from 'react';
import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { sanitizeFormSchema } from '@/app/api/public/forms/_lib/cors';
import PublicFormRenderer from './PublicFormRenderer';

interface Props {
  params: { id: string };
  searchParams: { embed?: string; theme?: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createAdminClient();
  const { data: form } = await supabase
    .from('forms')
    .select('name, status')
    .eq('id', params.id)
    .single();

  const isPublished = form?.status === 'published';

  return {
    title: isPublished ? `${form.name} — LeadsMind Forms` : 'Form',
    robots: { index: false, follow: false },
  };
}

export default async function PublicFormPage({ params, searchParams }: Props) {
  const isEmbedFrame = searchParams.embed === '1';
  const supabase = createAdminClient();

  const { data: form, error } = await supabase
    .from('forms')
    .select('id, name, fields, config, status, workspace_id, published_version')
    .eq('id', params.id)
    .single();

  const isPublished = form?.status === 'published';
  let schema: any = null;
  let finalError = error || !isPublished;

  if (isPublished && form) {
    if (form.published_version) {
      const { data: verSnap } = await supabase
        .from('form_versions')
        .select('snapshot')
        .eq('form_id', params.id)
        .eq('version_number', form.published_version)
        .single();

      if (verSnap?.snapshot) {
        schema = sanitizeFormSchema({
          id: form.id,
          name: form.name,
          fields: verSnap.snapshot.fields || [],
          config: verSnap.snapshot.config || {},
          status: form.status,
          workspace_id: form.workspace_id
        });
      }
    }

    if (!schema) {
      schema = sanitizeFormSchema(form);
    }

    // A/B testing: attach active variants so the client can assign a
    // sticky variant per visitor and apply its field-label overrides.
    if (schema) {
      const { data: variants } = await supabase
        .from('form_variants')
        .select('id, name, is_control, traffic_weight, field_overrides')
        .eq('form_id', params.id)
        .eq('status', 'active');
      schema.variants = variants || [];
    }
  }

  const workspaceId = form?.workspace_id || null;

  return (
    <div style={{ minHeight: '100vh', background: isEmbedFrame ? 'transparent' : 'linear-gradient(180deg, #f7f9fd 0%, #eef1f8 100%)' }}>
      <PublicFormRenderer
        schema={schema}
        workspaceId={workspaceId}
        isEmbedFrame={isEmbedFrame}
        formId={params.id}
        hasError={!!finalError || !schema}
      />
    </div>
  );
}
