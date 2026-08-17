const fs = require('fs');
const path = require('path');

const supabaseDir = path.join(process.cwd(), 'src', 'supabase');
const schemaPath = path.join(supabaseDir, 'lms_schema.sql');

if (fs.existsSync(schemaPath)) {
  let schema = fs.readFileSync(schemaPath, 'utf8');
  
  // Replace the old courses table with the new expanded one from the Addendum
  const oldCoursesTable = /CREATE TABLE IF NOT EXISTS courses \([\s\S]*?\);/;
  const newCoursesTable = `CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'draft',
  language TEXT DEFAULT 'en',
  domain_path TEXT,
  font TEXT,
  seo_title TEXT,
  seo_description TEXT,
  pass_mark_default INTEGER DEFAULT 60,
  retry_count_default INTEGER,
  cover_image TEXT,
  color_theme TEXT,
  template_id UUID,
  tutor_id UUID,
  certificate_template_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  schema = schema.replace(oldCoursesTable, newCoursesTable);
  fs.writeFileSync(schemaPath, schema);
  console.log("SUCCESS! LMS Database Schema updated with Course Catalog Addendum fields.");
} else {
  console.log("Error: lms_schema.sql not found.");
}