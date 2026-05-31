'use server';

import { createServerClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId } from '@/lib/auth';

export async function getCourses() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('courses')
   .select('*, modules:course_modules(count)')
   .eq('workspace_id', workspaceId)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function getCourse(courseId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('courses')
   .select('*')
   .eq('id', courseId)
   .eq('workspace_id', workspaceId)
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function createCourse(title: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('courses')
   .insert({
    workspace_id: workspaceId,
    title,
    status: 'draft'
   })
   .select()
   .single();

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function getForumPosts() {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  const { data, error } = await supabase
   .from('forum_posts')
   .select('*, author:auth.users(email)')
   .eq('workspace_id', workspaceId)
   .is('parent_id', null)
   .order('created_at', { ascending: false });

  if (error) throw error;
  return { data };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function enrollStudent(courseId: string, contactId: string) {
 try {
  const supabase = await createServerClient();
  const { error } = await supabase
   .from('enrollments')
   .upsert({ course_id: courseId, contact_id: contactId, status: 'active' });

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateProgress(contactId: string, lessonId: string, completed: boolean, progress: number) {
 try {
  // Progress tracking logic
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function getModules(courseId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();
  
  // Verify course belongs to workspace
  const { data: course, error: courseErr } = await supabase
   .from('courses')
   .select('id')
   .eq('id', courseId)
   .eq('workspace_id', workspaceId)
   .single();

  if (courseErr || !course) return { error: 'Unauthorized or course not found' };

  // Fetch modules
  const { data: modules, error: modulesErr } = await supabase
   .from('modules')
   .select('*, lessons:lessons(id, title, order_index, is_free:is_preview, video_url, content)')
   .eq('course_id', courseId)
   .order('order_index', { ascending: true });

  if (modulesErr) throw modulesErr;
  return { data: modules };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function createModule(
 courseId: string,
 name: string,
 description: string,
 iconEmoji: string | null,
 publishStatus: 'Draft' | 'Published' | 'Coming Soon',
 nqfLevel: string,
 isRequiredForCompletion: boolean
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!name || name.trim() === '') {
   return { error: 'Module name is required' };
  }

  const supabase = await createServerClient();
  
  // Verify course ownership
  const { data: course, error: courseErr } = await supabase
   .from('courses')
   .select('id')
   .eq('id', courseId)
   .eq('workspace_id', workspaceId)
   .single();

  if (courseErr || !course) return { error: 'Unauthorized or course not found' };

  // Calculate order_index
  const { count } = await supabase
   .from('modules')
   .select('id', { count: 'exact', head: true })
   .eq('course_id', courseId);

  const nextOrderIndex = (count || 0) + 1;

  const { data: module, error } = await supabase
   .from('modules')
   .insert({
    course_id: courseId,
    name,
    description,
    icon_emoji: iconEmoji,
    publish_status: publishStatus,
    nqf_level: nqfLevel,
    is_required_for_completion: isRequiredForCompletion,
    order_index: nextOrderIndex
   })
   .select()
   .single();

  if (error) throw error;
  return { data: module };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateModule(
 moduleId: string,
 name: string,
 description: string,
 iconEmoji: string | null,
 publishStatus: 'Draft' | 'Published' | 'Coming Soon',
 nqfLevel: string,
 isRequiredForCompletion: boolean
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!name || name.trim() === '') {
   return { error: 'Module name is required' };
  }

  const supabase = await createServerClient();

  // Verify workspace owns the module via course
  const { data: moduleObj, error: moduleErr } = await supabase
   .from('modules')
   .select('id, course_id, courses!inner(workspace_id)')
   .eq('id', moduleId)
   .single();

  if (moduleErr || !moduleObj) return { error: 'Module not found' };
  
  const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const { data: updatedModule, error } = await supabase
   .from('modules')
   .update({
    name,
    description,
    icon_emoji: iconEmoji,
    publish_status: publishStatus,
    nqf_level: nqfLevel,
    is_required_for_completion: isRequiredForCompletion
   })
   .eq('id', moduleId)
   .select()
   .single();

  if (error) throw error;
  return { data: updatedModule };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteModule(moduleId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();

  // Verify workspace owns the module via course
  const { data: moduleObj, error: moduleErr } = await supabase
   .from('modules')
   .select('id, course_id, courses!inner(workspace_id)')
   .eq('id', moduleId)
   .single();

  if (moduleErr || !moduleObj) return { error: 'Module not found' };
  
  const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const { error } = await supabase
   .from('modules')
   .delete()
   .eq('id', moduleId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function createLesson(
 moduleId: string,
 title: string,
 content: string,
 videoUrl: string,
 isFree: boolean,
 type: string = 'Text',
 metadata: any = {}
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!title || title.trim() === '') {
   return { error: 'Lesson title is required' };
  }

  const supabase = await createServerClient();

  // Verify workspace owns the module via course
  const { data: moduleObj, error: moduleErr } = await supabase
   .from('modules')
   .select('id, course_id, courses!inner(workspace_id)')
   .eq('id', moduleId)
   .single();

  if (moduleErr || !moduleObj) return { error: 'Module not found' };
  
  const courseWorkspaceId = (moduleObj.courses as any)?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  // Calculate order_index for lesson
  const { count } = await supabase
   .from('lessons')
   .select('id', { count: 'exact', head: true })
   .eq('module_id', moduleId);

  const nextOrderIndex = (count || 0) + 1;

  const { data: lesson, error } = await supabase
   .from('lessons')
   .insert({
    module_id: moduleId,
    title,
    content,
    video_url: videoUrl,
    is_preview: isFree,
    type,
    metadata,
    order_index: nextOrderIndex
   })
   .select()
   .single();

  if (error) throw error;
  return { data: lesson };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function updateLesson(
 lessonId: string,
 title: string,
 content: string,
 videoUrl: string,
 isFree: boolean,
 type?: string,
 metadata?: any
) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  if (!title || title.trim() === '') {
   return { error: 'Lesson title is required' };
  }

  const supabase = await createServerClient();

  // Verify workspace owns the lesson via module -> course
  const { data: lessonObj, error: lessonErr } = await supabase
   .from('lessons')
   .select('id, module_id, modules!inner(course_id, courses!inner(workspace_id))')
   .eq('id', lessonId)
   .single();

  if (lessonErr || !lessonObj) return { error: 'Lesson not found' };
  
  const courseWorkspaceId = (lessonObj.modules as any)?.courses?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const updatePayload: any = {
   title,
   content,
   video_url: videoUrl,
   is_preview: isFree
  };
  if (type !== undefined) updatePayload.type = type;
  if (metadata !== undefined) updatePayload.metadata = metadata;

  const { data: updatedLesson, error } = await supabase
   .from('lessons')
   .update(updatePayload)
   .eq('id', lessonId)
   .select()
   .single();

  if (error) throw error;
  return { data: updatedLesson };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function deleteLesson(lessonId: string) {
 try {
  const workspaceId = await getCurrentWorkspaceId();
  if (!workspaceId) return { error: 'No workspace active' };

  const supabase = await createServerClient();

  // Verify workspace owns the lesson
  const { data: lessonObj, error: lessonErr } = await supabase
   .from('lessons')
   .select('id, module_id, modules!inner(course_id, courses!inner(workspace_id))')
   .eq('id', lessonId)
   .single();

  if (lessonErr || !lessonObj) return { error: 'Lesson not found' };
  
  const courseWorkspaceId = (lessonObj.modules as any)?.courses?.workspace_id;
  if (courseWorkspaceId !== workspaceId) {
   return { error: 'Unauthorized workspace access' };
  }

  const { error } = await supabase
   .from('lessons')
   .delete()
   .eq('id', lessonId);

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function getStudentCourseProgress(courseId: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get student contact record
  const { data: contact } = await supabase
   .from('contacts')
   .select('id')
   .eq('email', user.email)
   .single();

  if (!contact) return { data: [] };

  // Fetch progress list
  const { data, error } = await supabase
   .from('lesson_progress')
   .select('lesson_id, completed, completed_at')
   .eq('contact_id', contact.id);

  if (error) throw error;
  return { data: data || [] };
 } catch (error: any) {
  return { error: error.message };
 }
}

export async function completeLessonAction(lessonId: string) {
 try {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Get or auto-create student contact record if missing
  let { data: contact } = await supabase
   .from('contacts')
   .select('id')
   .eq('email', user.email)
   .single();

  if (!contact) {
   // Fallback: Create contact matching user profile
   const { data: newContact, error: contactErr } = await supabase
    .from('contacts')
    .insert({
     email: user.email,
     first_name: user.email?.split('@')[0] || 'Student',
     last_name: ''
    })
    .select('id')
    .single();

   if (contactErr) throw contactErr;
   contact = newContact;
  }

  const { error } = await supabase
   .from('lesson_progress')
   .upsert({
    contact_id: contact.id,
    lesson_id: lessonId,
    completed: true,
    completed_at: new Date().toISOString()
   }, { onConflict: 'contact_id,lesson_id' });

  if (error) throw error;
  return { success: true };
 } catch (error: any) {
  return { error: error.message };
 }
}
