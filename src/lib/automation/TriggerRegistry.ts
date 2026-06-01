export const TRIGGER_TYPES = [
  { id: 'lead_imported', label: 'Lead Imported', description: 'Triggers when a new lead is imported from LeadsFinder.' },
  { id: 'form_submitted', label: 'Form Submitted', description: 'Triggers when a prospect submits a linked form.' },
  { id: 'contact_created', label: 'Contact Created', description: 'Triggers when a new contact is added to the CRM.' },
  { id: 'opportunity_created', label: 'Opportunity Created', description: 'Triggers when a new deal enters the pipeline.' },
  { id: 'opportunity_stage_changed', label: 'Opportunity Stage Changed', description: 'Triggers when a deal moves to a new stage.' },
  { id: 'watchlist_alert', label: 'Watchlist Alert Triggered', description: 'Triggers when a monitored market event occurs.' },
  // LMS Triggers (19-Point Matrix)
  { id: 'student_enrolled_course', label: 'Student Enrolled in Course', description: 'Triggers when a student is enrolled in a course.' },
  { id: 'student_enrolled_bundle', label: 'Student Enrolled in Bundle', description: 'Triggers when a student is enrolled in a course bundle.' },
  { id: 'course_completed', label: 'Course Completed', description: 'Triggers when a student completes all required lessons in a course.' },
  { id: 'module_completed', label: 'Module Completed', description: 'Triggers when a student completes all lessons in a module.' },
  { id: 'lesson_completed', label: 'Lesson Completed', description: 'Triggers when a student marks a lesson as completed.' },
  { id: 'quiz_passed', label: 'Quiz Passed', description: 'Triggers when a student passes a quiz.' },
  { id: 'quiz_failed', label: 'Quiz Failed', description: 'Triggers when a student fails a quiz.' },
  { id: 'quiz_limit_reached', label: 'Quiz Attempt Limit Reached', description: 'Triggers when a student reaches the maximum quiz attempts.' },
  { id: 'cert_issued', label: 'Certificate Issued', description: 'Triggers when a course certificate is issued.' },
  { id: 'cert_expiring', label: 'Certificate About to Expire', description: 'Triggers when a certificate is about to expire.' },
  { id: 'course_expiring', label: 'Course Access Expiring', description: 'Triggers when a student\'s course access is expiring.' },
  { id: 'course_revoked', label: 'Course Access Revoked', description: 'Triggers when course access is explicitly revoked.' },
  { id: 'student_inactive', label: 'Student Inactive in Course', description: 'Triggers when a student is inactive in a course.' },
  { id: 'struggle_threshold_crossed', label: 'Struggle Score Crosses Threshold', description: 'Triggers when a student\'s struggle score threshold is crossed.' },
  { id: 'assignment_submitted', label: 'Assignment Submitted', description: 'Triggers when a student submits an assignment.' },
  { id: 'assignment_graded', label: 'Assignment Graded', description: 'Triggers when a teacher grades an assignment.' },
  { id: 'live_session_booked', label: 'Live Session Booked', description: 'Triggers when a student books a live session on the calendar.' },
  { id: 'funnel_subscribed', label: 'Funnel Step Form Subscribed', description: 'Triggers when a lead submits a form on a landing page.' },
  { id: 'payfast_payment_course', label: 'PayFast Payment — Course', description: 'Triggers when a course payment is received via PayFast.' }
];

export class TriggerRegistry {
  public static getSupportedTriggers() {
    return TRIGGER_TYPES;
  }
}
