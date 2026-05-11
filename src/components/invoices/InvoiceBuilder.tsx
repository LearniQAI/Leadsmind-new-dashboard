'use client';

import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Trash2,
  Save,
  Send,
  Calculator,
  User,
  Calendar,
  Hash,
  FileText,
  Search,
  Package,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { saveInvoice, updateInvoice } from '@/app/actions/finance';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

const itemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1),
  unit_amount: z.number().min(0),
  product_id: z.string().optional()
});

const invoiceSchema = z.object({
  contact_id: z.string().min(1, 'Please select a contact'),
  invoice_number: z.string().min(1),
  created_at: z.string(),
  due_date: z.string(),
  items: z.array(itemSchema).min(1, 'Add at least one item'),
  notes: z.string(),
  terms: z.string(),
  status: z.string(),
  currency: z.string()
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

interface InvoiceBuilderProps {
  workspaceId: string;
  contacts: any[];
  products: any[];
  settings: any;
  initialData?: any;
}

export function InvoiceBuilder({
  workspaceId,
  contacts,
  products,
  settings,
  initialData
}: InvoiceBuilderProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormValues>({
   resolver: zodResolver(invoiceSchema),
   defaultValues: {
     contact_id: initialData?.contact_id || '',
     invoice_number: initialData?.invoice_number || `${settings?.invoice_prefix || 'INV-'}${(settings?.next_invoice_number || 1).toString().padStart(4, '0')}`,
     created_at: initialData?.created_at ? format(new Date(initialData.created_at), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
     due_date: initialData?.due_date ? format(new Date(initialData.due_date), 'yyyy-MM-dd') : '',
     items: initialData?.items || [{ description: '', quantity: 1, unit_amount: 0 }],
     notes: initialData?.notes || settings?.default_notes || '',
     terms: initialData?.terms || settings?.default_terms || '',
     status: initialData?.status || 'draft',
     currency: initialData?.currency || settings?.currency || 'USD'
   }
  });

  const { fields, append, remove } = useFieldArray({
   control,
   name: "items"
  });

  const watchItems = watch("items");
  const subtotal = watchItems.reduce((acc, item) => acc + (item.quantity * item.unit_amount), 0);
  const total = subtotal; // Simplified, can add tax later

  const onSubmit = async (data: InvoiceFormValues) => {
   setIsSubmitting(true);
   try {
     const payload = {
      ...data,
      workspace_id: workspaceId,
      subtotal,
      total_amount: total,
      amount_due: total,
      amount_paid: initialData?.amount_paid || 0
     };

     let result;
     if (initialData?.id) {
      result = await updateInvoice(initialData.id, payload);
     } else {
      result = await saveInvoice(payload);
     }

     if (result.success) {
      toast.success(initialData?.id ? 'Invoice updated' : 'Invoice created');
      router.push('/apps/invoices');
      router.refresh();
     } else {
      toast.error(result.error || 'Failed to save invoice');
     }
   } catch (error) {
     toast.error('An unexpected error occurred');
   } finally {
     setIsSubmitting(false);
   }
  };

  const handleProductSelect = (index: number, productId: string) => {
   const product = products.find(p => p.id === productId);
   if (product) {
     setValue(`items.${index}.description`, product.name);
     setValue(`items.${index}.unit_amount`, Number(product.price));
     setValue(`items.${index}.product_id`, product.id);
   }
  };

  return (
   <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in duration-700">
     <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

      {/* Left Column: Core Info */}
      <div className="xl:col-span-2 space-y-8">

        {/* Header Card */}
        <div className="card__wrapper !p-8 !mb-0 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-3xl rounded-full pointer-events-none" />

         <div className="flex flex-col md:flex-row gap-8 relative z-10">
           <div className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                 <User className="h-3 w-3 text-primary" /> Recipient / Client
               </label>
               <Select
                 onValueChange={(val) => setValue('contact_id', val)}
                 defaultValue={watch('contact_id')}
               >
                 <SelectTrigger className="h-12 bg-white/[0.02] border-white/5 rounded-xl text-sm font-bold text-white focus:ring-primary/20">
                  <SelectValue placeholder="Select a contact" />
                 </SelectTrigger>
                 <SelectContent className="bg-[#0b0b14] border-white/10 text-white">
                  {contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id} className="focus:bg-primary/20 focus:text-white">
                     {contact.first_name} {contact.last_name}
                    </SelectItem>
                  ))}
                 </SelectContent>
               </Select>
               {errors.contact_id && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.contact_id.message}</p>}
              </div>

              <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                 <Hash className="h-3 w-3 text-primary" /> Invoice Number
               </label>
               <Input
                 {...register('invoice_number')}
                 placeholder="INV-0001"
                 className="h-12 bg-white/[0.02] border-white/5 rounded-xl text-sm font-bold text-white focus:ring-primary/20"
               />
               {errors.invoice_number && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.invoice_number.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                 <Calendar className="h-3 w-3 text-primary" /> Issue Date
               </label>
               <Input
                 type="date"
                 {...register('created_at')}
                 className="h-12 bg-white/[0.02] border-white/5 rounded-xl text-sm font-bold text-white focus:ring-primary/20 [color-scheme:dark]"
               />
              </div>
              <div className="space-y-2">
               <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
                 <Clock className="h-3 w-3 text-primary" /> Due Date
               </label>
               <Input
                 type="date"
                 {...register('due_date')}
                 className="h-12 bg-white/[0.02] border-white/5 rounded-xl text-sm font-bold text-white focus:ring-primary/20 [color-scheme:dark]"
               />
              </div>
            </div>
           </div>
         </div>
        </div>

        {/* Items Card */}
        <div className="card__wrapper !p-0 !mb-0 shadow-2xl overflow-hidden group">
         <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.01]">
           <h3 className="text-sm font-black uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <Package className="h-4 w-4 text-primary" /> Service Items
           </h3>
           <Button
            type="button"
            onClick={() => append({ description: '', quantity: 1, unit_amount: 0 })}
            variant="outline"
            className="btn btn-outline-theme-border h-9 rounded-xl text-[9px] uppercase font-black px-4"
           >
            <Plus className="h-3 w-3 mr-2" /> Add Item
           </Button>
         </div>

         <div className="p-8 space-y-6">
           {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-4 items-end animate-in slide-in-from-left-2 duration-300">
              <div className="col-span-12 lg:col-span-5 space-y-2">
               <label className="text-[8px] font-black uppercase tracking-widest text-white/20">Description</label>
               <div className="flex gap-2">
                 <Select onValueChange={(val) => handleProductSelect(index, val)}>
                  <SelectTrigger className="w-10 h-11 bg-white/[0.02] border-white/5 rounded-xl flex items-center justify-center p-0">
                    <Search className="h-3 w-3 text-white/40" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b0b14] border-white/10 text-white">
                    {products.map(p => (
                     <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                 </Select>
                 <Input
                  {...register(`items.${index}.description` as const)}
                  placeholder="Enter item description..."
                  className="h-11 bg-white/[0.02] border-white/5 rounded-xl text-xs font-bold text-white"
                 />
               </div>
              </div>
              <div className="col-span-4 lg:col-span-2 space-y-2">
               <label className="text-[8px] font-black uppercase tracking-widest text-white/20">Qty</label>
               <Input
                 type="number"
                 {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                 className="h-11 bg-white/[0.02] border-white/5 rounded-xl text-xs font-bold text-white"
               />
              </div>
              <div className="col-span-5 lg:col-span-3 space-y-2">
               <label className="text-[8px] font-black uppercase tracking-widest text-white/20">Unit Price</label>
               <Input
                 type="number"
                 step="0.01"
                 {...register(`items.${index}.unit_amount` as const, { valueAsNumber: true })}
                 className="h-11 bg-white/[0.02] border-white/5 rounded-xl text-xs font-bold text-white"
               />
              </div>
              <div className="col-span-3 lg:col-span-2 flex justify-end gap-2">
               <div className="h-11 flex items-center px-4 bg-white/[0.02] border border-white/5 rounded-xl text-xs font-black text-white/40">
                 ${(watchItems[index]?.quantity * watchItems[index]?.unit_amount || 0).toLocaleString()}
               </div>
               <Button
                 type="button"
                 variant="ghost"
                 onClick={() => remove(index)}
                 className="h-11 w-11 rounded-xl text-rose-500/40 hover:text-rose-500 hover:bg-rose-500/10"
               >
                 <Trash2 className="h-4 w-4" />
               </Button>
              </div>
            </div>
           ))}
           {errors.items && <p className="text-[10px] text-rose-500 font-bold uppercase">{errors.items.message}</p>}
         </div>
        </div>
      </div>

      {/* Right Column: Summary & Actions */}
      <div className="space-y-8">

        {/* Summary Card */}
        <div className="card__wrapper !p-8 !mb-0 shadow-2xl bg-primary/5 border-primary/10 relative overflow-hidden">
         <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-primary/20 blur-3xl rounded-full" />

         <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-primary mb-8 flex items-center gap-2">
           <Calculator className="h-3 w-3" /> Billing Summary
         </h3>

         <div className="space-y-4 relative z-10">
           <div className="flex justify-between items-center text-white/40">
            <span className="text-[10px] font-black uppercase tracking-widest">Gross Amount</span>
            <span className="text-sm font-black">${subtotal.toLocaleString()}</span>
           </div>
           <div className="flex justify-between items-center text-white/40 pb-6 border-b border-white/5">
            <span className="text-[10px] font-black uppercase tracking-widest">Tax (0%)</span>
            <span className="text-sm font-black">$0.00</span>
           </div>
           <div className="pt-4 space-y-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary block">Total Balance Due</span>
            <div className="text-5xl font-black tracking-tighter text-white">
              ${total.toLocaleString()}
            </div>
           </div>
         </div>

         <div className="mt-12 space-y-3 relative z-10">
           <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary h-14 rounded-2xl text-xs uppercase font-black tracking-widest shadow-xl shadow-primary/20"
           >
            {isSubmitting ? 'Processing...' : (initialData?.id ? 'Update Record' : 'Commit Invoice')}
           </Button>
           <Button
            type="button"
            variant="outline"
            className="w-full btn btn-outline-theme-border h-12 rounded-2xl text-[10px] uppercase font-black tracking-widest"
           >
            <Send className="h-3 w-3 mr-2" /> Save & Send
           </Button>
         </div>
        </div>

        {/* Notes Card */}
        <div className="card__wrapper !p-8 !mb-0 shadow-xl space-y-6">
         <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
            <FileText className="h-3 w-3 text-primary" /> Internal Notes
           </label>
           <Textarea
            {...register('notes')}
            placeholder="Private notes for team..."
            className="min-h-[100px] bg-white/[0.02] border-white/5 rounded-xl text-xs font-medium text-white focus:ring-primary/20"
           />
         </div>
         <div className="space-y-2">
           <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 flex items-center gap-2">
            <ShieldCheck className="h-3 w-3 text-primary" /> Legal Terms
           </label>
           <Textarea
            {...register('terms')}
            placeholder="Default terms and conditions..."
            className="min-h-[100px] bg-white/[0.02] border-white/5 rounded-xl text-xs font-medium text-white focus:ring-primary/20"
           />
         </div>
        </div>

      </div>
     </div>
   </form>
  );
}
