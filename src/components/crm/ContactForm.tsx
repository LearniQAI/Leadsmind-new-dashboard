'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createContact, updateContact, checkDuplicateContact } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { DashFormField, DashInput } from '@/components/dashboard-ui/FormField';
import { DashButton } from '@/components/dashboard-ui/Button';

const contactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  tags: z.string().optional(), // Will be split into array
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialData?: any;
  members?: { id: string; name: string }[];
}

export function ContactForm({ initialData, members }: ContactFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { 
      firstName: initialData?.first_name || '',
      lastName: initialData?.last_name || '',
      email: initialData?.email || '',
      phone: initialData?.phone || '',
      source: initialData?.source || 'Direct Entry',
      tags: initialData?.tags?.join(', ') || ''
    }
  });

  const email = watch('email');

  const onSubmit = async (values: ContactFormValues) => {
    setIsSubmitting(true);
    
    // Only check for duplicate if it's a NEW contact and email is provided
    if (!initialData && values.email) {
      const dup = await checkDuplicateContact(values.email);
      if (dup.success && dup.exists) {
        toast.error(`Contact already exists: ${dup.contact.first_name} ${dup.contact.last_name}`, {
          description: "Click to view profile",
          action: {
            label: "View",
            onClick: () => router.push(`/contacts/${dup.contact.id}`)
          },
          duration: 6000,
        });
        setIsSubmitting(false);
        return;
      }
    }

    const payload = {
      ...values,
      tags: values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : []
    };

    const res = initialData 
      ? await updateContact(initialData.id, payload)
      : await createContact(payload);

    if (res.success) {
      toast.success(initialData ? 'Contact updated successfully' : 'Contact created successfully');
      router.push(initialData ? `/contacts/${initialData.id}` : '/contacts');
      router.refresh();
    } else {
      toast.error(res.error || 'Failed to process contact');
    }
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <DashFormField label="First name" error={errors.firstName?.message}>
          <DashInput {...register('firstName')} invalid={!!errors.firstName} placeholder="John" />
        </DashFormField>
        <DashFormField label="Last name" error={errors.lastName?.message}>
          <DashInput {...register('lastName')} invalid={!!errors.lastName} placeholder="Doe" />
        </DashFormField>
      </div>

      <DashFormField label="Email address" error={errors.email?.message}>
        <DashInput {...register('email')} invalid={!!errors.email} placeholder="lead@organization.com" />
      </DashFormField>

      <DashFormField label="Phone number">
        <DashInput {...register('phone')} placeholder="+1 (555) 000-0000" />
      </DashFormField>

      <div className="grid grid-cols-2 gap-4">
        <DashFormField label="Lead source">
          <DashInput {...register('source')} />
        </DashFormField>
        <DashFormField label="Tags (comma separated)">
          <DashInput {...register('tags')} placeholder="Lead, Cold, VIP..." />
        </DashFormField>
      </div>

      <div className="pt-4 flex gap-3">
        <DashButton type="button" variant="secondary" className="flex-1" onClick={() => router.back()}>
          Cancel
        </DashButton>
        <DashButton type="submit" variant="primary" className="flex-1" disabled={isSubmitting}>
          {isSubmitting ? (initialData ? 'Saving…' : 'Creating…') : (initialData ? 'Save changes' : 'Create lead')}
        </DashButton>
      </div>
    </form>
  );
}
