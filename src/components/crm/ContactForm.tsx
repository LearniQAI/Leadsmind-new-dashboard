'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { createContact, updateContact, checkDuplicateContact } from '@/app/actions/contacts';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

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
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1">First Name</label>
          <input 
            {...register('firstName')}
            className={cn(
              "w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 h-10 text-[13.5px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans",
              errors.firstName && "border-red-500/50"
            )}
            placeholder="John"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1">Last Name</label>
          <input 
            {...register('lastName')}
            className={cn(
              "w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 h-10 text-[13.5px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans",
              errors.lastName && "border-red-500/50"
            )}
            placeholder="Doe"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1">Email Address</label>
        <input 
          {...register('email')}
          className={cn(
            "w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 h-10 text-[13.5px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans",
            errors.email && "border-red-500/50"
          )}
          placeholder="lead@organization.com"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1">Phone Number</label>
        <input 
          {...register('phone')}
          className="w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 h-10 text-[13.5px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans"
          placeholder="+1 (555) 000-0000"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1">Lead Source</label>
          <input 
            {...register('source')}
            className="w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 h-10 text-[13.5px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#4a5a82] uppercase tracking-widest ml-1">Tags (Comma Separated)</label>
          <input 
            {...register('tags')}
            className="w-full bg-white/[0.03] border border-white/5 rounded-lg px-4 h-10 text-[13.5px] text-[#eef2ff] placeholder:text-[#4a5a82] focus:outline-none focus:border-[#2563eb]/40 transition-all font-dm-sans"
            placeholder="Lead, Cold, VIP..."
          />
        </div>
      </div>

      <div className="pt-4 flex gap-3">
        <button 
          type="button"
          onClick={() => router.back()}
          className="flex-1 h-10 rounded-lg bg-white/5 border border-white/5 text-[#eef2ff] hover:bg-white/10 text-[13px] font-bold font-dm-sans transition-all"
        >
          Cancel
        </button>
        <button 
          type="submit"
          disabled={isSubmitting}
          className="flex-1 h-10 rounded-lg bg-[#2563eb] text-white hover:bg-[#2563eb]/90 text-[13px] font-bold font-dm-sans transition-all shadow-lg shadow-[#2563eb]/20 disabled:opacity-50"
        >
          {isSubmitting ? (initialData ? 'Saving...' : 'Creating...') : (initialData ? 'Save Changes' : 'Create Lead')}
        </button>
      </div>
    </form>
  );
}
