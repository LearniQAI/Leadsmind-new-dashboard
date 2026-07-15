'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Video, Globe, Users, Loader2, Check, Settings2, Link as LinkIcon, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const calendarSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  calendar_type: z.enum(['personal', 'round_robin', 'collective', 'class_booking', 'service_menu', 'event']),
  meeting_mode: z.enum(['google_meet', 'zoom', 'phone', 'in_person', 'custom_link', 'client_choice', 'internal_meet']),
  location: z.string(),
  description: z.string(),
  price: z.coerce.number().min(0),
});

interface CalendarFormValues {
  name: string;
  calendar_type: 'personal' | 'round_robin' | 'collective' | 'class_booking' | 'service_menu' | 'event';
  meeting_mode: 'google_meet' | 'zoom' | 'phone' | 'in_person' | 'custom_link' | 'client_choice' | 'internal_meet';
  location: string;
  description: string;
  price: number;
}

interface CalendarSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  calendar?: any; // If provided, we are in Edit mode
  onSave: (data: any) => Promise<void>;
}

export default function CalendarSettingsModal({
  isOpen,
  onClose,
  calendar,
  onSave
}: CalendarSettingsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CalendarFormValues>({
    resolver: zodResolver(calendarSchema) as any,
    defaultValues: {
      name: '',
      calendar_type: 'personal',
      meeting_mode: 'internal_meet',
      location: '',
      description: '',
      price: 0,
    },
  });

  useEffect(() => {
    if (isOpen) {
      if (calendar) {
        form.reset({
          name: calendar.name || '',
          calendar_type: calendar.calendar_type || 'personal',
          meeting_mode: (calendar.meeting_mode as any) || 'internal_meet',
          location: calendar.location || '',
          description: calendar.description || '',
          price: calendar.price || 0,
        });
      } else {
        form.reset({
          name: '',
          calendar_type: 'personal',
          meeting_mode: 'internal_meet',
          location: '',
          description: '',
          price: 0,
        });
      }
    }
  }, [isOpen, calendar, form]);

  const handleSubmit = async (values: CalendarFormValues) => {
    setIsSubmitting(true);
    try {
      await onSave(values);
      onClose();
    } catch (error: any) {
      toast.error(error.message || 'Failed to save engine settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  const meetingMode = form.watch('meeting_mode');

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] z-[1002] bg-white border-dash-border !text-dash-text">
        <DialogHeader>
          <DialogTitle className="text-[22px] font-bold !text-dash-text flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-dash-accent/10 flex items-center justify-center text-dash-accent">
              <Settings2 size={22} />
            </div>
            {calendar ? 'Engine Settings' : 'New Scheduling Engine'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit as any)} className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold !text-dash-textMuted">Engine Name</FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white border-dash-border !text-dash-text h-11" placeholder="e.g. Sales Discovery" />
                    </FormControl>
                    <FormMessage className="text-red text-[10px]" />
                  </FormItem>
                )}
              />

              {/* Type */}
              <FormField
                control={form.control}
                name="calendar_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold !text-dash-textMuted">Engine Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white border-dash-border !text-dash-text h-11">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white border-dash-border z-[1100]">
                        <SelectItem value="personal">Personal Booking</SelectItem>
                        <SelectItem value="round_robin">Round Robin (Team)</SelectItem>
                        <SelectItem value="collective">Collective Booking</SelectItem>
                        <SelectItem value="class_booking">Class/Group</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>

            {/* Meeting Mode */}
            <FormField
              control={form.control}
              name="meeting_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold !text-dash-textMuted">Meeting Mode</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white border-dash-border !text-dash-text h-11">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="bg-white border-dash-border z-[1100]">
                      <SelectItem value="internal_meet" className="focus:bg-dash-accent/10">
                        <div className="flex items-center gap-2">
                           <Sparkles size={14} className="text-dash-accent" /> LeadsMind Video (Internal)
                        </div>
                      </SelectItem>
                      <SelectItem value="google_meet">
                        <div className="flex items-center gap-2">
                           <Video size={14} className="text-blue-500" /> Google Meet (Auto-Generate)
                        </div>
                      </SelectItem>
                      <SelectItem value="zoom">
                        <div className="flex items-center gap-2">
                           <Video size={14} className="text-blue-500" /> Zoom (Auto-Generate)
                        </div>
                      </SelectItem>
                      <SelectItem value="custom_link">
                        <div className="flex items-center gap-2">
                           <LinkIcon size={14} className="!text-dash-textMuted" /> Custom Static Link
                        </div>
                      </SelectItem>
                      <SelectItem value="in_person">
                        <div className="flex items-center gap-2">
                           <Globe size={14} className="text-orange-500" /> In-Person Meeting
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription className="text-[10px] !text-dash-textMuted">
                    {meetingMode === 'internal_meet'
                      ? 'Uses the built-in LeadsMind branded meeting experience.'
                      : 'Choose how you want to connect with your clients.'}
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Location / Static Link */}
            {(meetingMode === 'custom_link' || meetingMode === 'in_person') && (
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[11px] font-bold !text-dash-textMuted">
                      {meetingMode === 'custom_link' ? 'Meeting Link' : 'Address'}
                    </FormLabel>
                    <FormControl>
                      <Input {...field} className="bg-white border-dash-accent/30 !text-dash-text h-11" placeholder={meetingMode === 'custom_link' ? 'https://meet.jit.si/my-room' : '123 Business Way, Suite 100'} />
                    </FormControl>
                    <FormMessage className="text-red text-[10px]" />
                  </FormItem>
                )}
              />
            )}

            {/* Price (If applicable) */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[11px] font-bold !text-dash-textMuted">Booking Fee ($)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} className="bg-white border-dash-border !text-dash-text h-11" placeholder="0.00" />
                  </FormControl>
                  <FormDescription className="text-[10px] !text-dash-textMuted">Set to 0 if the booking is free.</FormDescription>
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="border-t border-dash-border pt-4 mt-2">
          <Button variant="ghost" onClick={onClose} className="!text-dash-textMuted hover:!text-dash-text font-bold text-[11px]">
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(handleSubmit)}
            disabled={isSubmitting}
            className="bg-dash-accent hover:bg-dash-accent/90 text-white font-bold text-[11px] px-8 h-11 rounded-lg transition-all motion-reduce:transition-none"
          >
            {isSubmitting ? <Loader2 className="animate-spin motion-reduce:animate-none mr-2" size={16} /> : <Check className="mr-2" size={16} />}
            {calendar ? 'Update Engine' : 'Create Engine'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
