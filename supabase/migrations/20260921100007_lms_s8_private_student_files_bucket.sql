-- LMS security batch 1 / S8: private bucket for student assignment / quiz-upload files. No storage
-- policies on purpose: only the service role (the upload route) writes, and downloads are served by
-- GET /api/lms/files which authorises the caller and redirects to a short-lived signed URL.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('lms-student-files', 'lms-student-files', false, 10485760, ARRAY[
  'image/png','image/jpeg','image/webp','image/gif','application/pdf',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain','text/csv','application/zip',
  'audio/mpeg','audio/wav','audio/mp4','audio/ogg','audio/webm','video/mp4'
])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
