'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
 Select, 
 SelectContent, 
 SelectItem, 
 SelectTrigger, 
 SelectValue 
} from '@/components/ui/select';
import { createContact, updateContact } from '@/app/actions/contacts';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Contact } from '@/types/crm.types';

const contactSchema = z.object({
 firstName: z.string().min(1, 'First name is required'),
 lastName: z.string().min(1, 'Last name is required'),
 email: z.string().email('Invalid email').optional().or(z.literal('')),
 phone: z.string().optional(),
 source: z.string().optional(),
 ownerId: z.string().optional(),
 tags: z.string().optional(), // Will split by comma
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
 initialData?: Contact;
 members: { id: string; name: string }[];
}

export function ContactForm({ initialData, members }: ContactFormProps) {
 const router = useRouter();
 const [isPending, setIsPending] = useState(false);

 const form = useForm<ContactFormValues>({
  resolver: zodResolver(contactSchema),
  defaultValues: {
   firstName: initialData?.first_name || '',
   lastName: initialData?.last_name || '',
   email: initialData?.email || '',
   phone: initialData?.phone || '',
   source: initialData?.source || '',
   ownerId: initialData?.owner_id || '',
   tags: initialData?.tags?.join(', ') || '',
  },
 });

 async function onSubmit(values: ContactFormValues) {
  setIsPending(true);
  const tagsArray = values.tags ? values.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  
  const payload = {
    ...values,
    tags: tagsArray,
    email: values.email || undefined
  };

  try {
   let result;
   if (initialData) {
    result = await updateContact(initialData.id, payload);
   } else {
    result = await createContact(payload);
   }

   if (result.success) {
    toast.success(initialData ? 'Contact updated' : 'Contact created');
    router.push('/apps/contacts');
    router.refresh();
   } else {
    toast.error(result.error);
   }
  } catch {
   toast.error('Something went wrong');
  } finally {
   setIsPending(false);
  }
 }

 return (
  <div className="card__wrapper">
   <div className="card__title-wrap mb-[20px]">
    <h5 className="card__heading-title uppercase tracking-tighter">
     {initialData ? 'Update Contact Information' : 'Create New Contact'}
    </h5>
   </div>
   
   <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <div className="space-y-2">
      <label htmlFor="firstName" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">First Name</label>
      <input 
       id="firstName" 
       {...form.register('firstName')} 
       placeholder="e.g. John"
       className="w-full h-12 bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 rounded-xl px-4 outline-none focus:border-primary/30 transition-all font-bold"
      />
      {form.formState.errors.firstName && (
       <p className="text-[10px] text-danger font-bold uppercase mt-1 ml-1">{form.formState.errors.firstName.message}</p>
      )}
     </div>
     <div className="space-y-2">
      <label htmlFor="lastName" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Last Name</label>
      <input 
       id="lastName" 
       {...form.register('lastName')} 
       placeholder="e.g. Doe"
       className="w-full h-12 bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 rounded-xl px-4 outline-none focus:border-primary/30 transition-all font-bold"
      />
      {form.formState.errors.lastName && (
       <p className="text-[10px] text-danger font-bold uppercase mt-1 ml-1">{form.formState.errors.lastName.message}</p>
      )}
     </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <div className="space-y-2">
      <label htmlFor="email" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Email Address</label>
      <input 
       id="email" 
       type="email" 
       {...form.register('email')} 
       placeholder="john@example.com"
       className="w-full h-12 bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 rounded-xl px-4 outline-none focus:border-primary/30 transition-all font-bold"
      />
      {form.formState.errors.email && (
       <p className="text-[10px] text-danger font-bold uppercase mt-1 ml-1">{form.formState.errors.email.message}</p>
      )}
     </div>
     <div className="space-y-2">
      <label htmlFor="phone" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Phone Number</label>
      <input 
       id="phone" 
       {...form.register('phone')} 
       placeholder="+1 (555) 000-0000"
       className="w-full h-12 bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 rounded-xl px-4 outline-none focus:border-primary/30 transition-all font-bold"
      />
     </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
     <div className="space-y-2">
      <label htmlFor="source" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Traffic Source</label>
      <Controller
       name="source"
       control={form.control}
       render={({ field }) => (
        <Select 
         onValueChange={field.onChange}
         value={field.value || ""}
        >
         <SelectTrigger className="w-full h-12 bg-white/[0.03] border border-white/5 text-white rounded-xl px-4 outline-none focus:border-primary/30 transition-all font-bold">
          <SelectValue placeholder="Select source" />
         </SelectTrigger>
         <SelectContent className="bg-[#1a1a24] border-white/10 text-white">
          <SelectItem value="website">Website</SelectItem>
          <SelectItem value="referral">Referral</SelectItem>
          <SelectItem value="linkedin">LinkedIn</SelectItem>
          <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
          <SelectItem value="other">Other</SelectItem>
         </SelectContent>
        </Select>
       )}
      />
     </div>
     <div className="space-y-2">
      <label htmlFor="ownerId" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Assigned Owner</label>
      <Controller
       name="ownerId"
       control={form.control}
       render={({ field }) => (
        <Select 
         onValueChange={field.onChange}
         value={field.value || ""}
        >
         <SelectTrigger className="w-full h-12 bg-white/[0.03] border border-white/5 text-white rounded-xl px-4 outline-none focus:border-primary/30 transition-all font-bold">
          <SelectValue placeholder="Select owner" />
         </SelectTrigger>
         <SelectContent className="bg-[#1a1a24] border-white/10 text-white">
          {members.map(member => (
           <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
          ))}
         </SelectContent>
        </Select>
       )}
      />
     </div>
    </div>

    <div className="space-y-2">
     <label htmlFor="tags" className="text-[10px] uppercase font-black tracking-widest text-white/30 ml-1">Tags (comma separated)</label>
     <input 
      id="tags" 
      {...form.register('tags')} 
      placeholder="e.g. Lead, Retail, High Intensity"
      className="w-full h-12 bg-white/[0.03] border border-white/5 text-white placeholder:text-white/10 rounded-xl px-4 outline-none focus:border-primary/30 transition-all font-bold"
     />
     <p className="text-[9px] text-white/10 uppercase font-black tracking-widest ml-1">Separate multiple tags with commas</p>
    </div>

    <div className="pt-6 flex items-center gap-4">
     <button 
      type="button" 
      className="btn btn-md btn-outline-theme-border !rounded-xl text-[10px] uppercase font-black tracking-widest px-8"
      onClick={() => router.back()}
      disabled={isPending}
     >
      Cancel
     </button>
     <button 
      type="submit" 
      className="btn btn-md btn-primary !rounded-xl text-[10px] uppercase font-black tracking-widest px-10 shadow-lg shadow-primary/20"
      disabled={isPending}
     >
      {isPending ? 'Processing...' : initialData ? 'Update Record' : 'Create Contact'}
     </button>
    </div>
   </form>
  </div>
 );
}

