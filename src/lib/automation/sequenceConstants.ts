// Plain (non-"use server") module -- a "use server" file may only export
// async functions, so these shared constants live here and are imported by
// both email_sequences.ts (the server actions) and the client editor.
export const SEQUENCE_SOURCE = 'email_sequence';

// Curated subset of TRIGGER_GROUPS in WorkflowEditorClient.tsx -- only the
// triggers that make sense as the start of a marketing drip sequence.
export const SEQUENCE_TRIGGERS: { value: string; label: string }[] = [
  { value: 'contact_created', label: 'New contact created' },
  { value: 'tag_added', label: 'Tag added' },
  { value: 'funnel_subscribed', label: 'Funnel form subscribed' },
  { value: 'student_enrolled_course', label: 'Student enrolled in course' },
  { value: 'course_completed', label: 'Course completed' },
  { value: 'appointment_booked', label: 'Appointment booked' },
];
