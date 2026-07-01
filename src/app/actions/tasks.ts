'use server';

import { createServerClient, createAdminClient } from '@/lib/supabase/server';
import { getCurrentWorkspaceId, getUser, getCurrentProfile, getUserRole } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
export { getUserRole };
import { revalidatePath } from 'next/cache';
import { sendEmail } from '@/lib/email';

export async function getTasks() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        due_date,
        due_time,
        contact_id,
        contacts (first_name, last_name, avatar_url),
        assignees:task_assignees(
          user_id,
          profile:users(id, first_name, last_name, avatar_url)
        )
      `)
      .eq('workspace_id', workspaceId)
      .order('priority', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data };
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return { error: error.message || 'Failed to fetch tasks' };
  }
}

export async function getTaskDetails(taskId: string) {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        contacts (first_name, last_name, avatar_url),
        assignees:task_assignees(
          user_id,
          profile:users(id, first_name, last_name, avatar_url)
        ),
        activities:task_activities(
          *,
          user:users(id, first_name, last_name, avatar_url)
        ),
        attachments:task_attachments(
          *,
          uploader:users(id, first_name, last_name, avatar_url)
        )
      `)
      .eq('id', taskId)
      .eq('workspace_id', workspaceId)
      .single();

    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function createTask(taskData: {
  title: string;
  description?: string;
  priority?: string;
  status?: string;
  due_date?: string;
  contact_id?: string;
}, assignees: string[] = []) {
  try {
    const user = await getUser();
    if (!user) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .insert({ workspace_id: workspaceId, created_by: user.id, ...taskData })
      .select()
      .single();

    if (taskError) throw taskError;

    // 1. Handle Initial Assignments
    if (assignees.length > 0) {
      const assignmentPayload = assignees.map(userId => ({
        task_id: task.id,
        user_id: userId
      }));

      const { error: assignError } = await supabase.from('task_assignees').insert(assignmentPayload);
      if (assignError) throw assignError;

      // 2. Log Assignment Activity
      await supabase.from('task_activities').insert({
        task_id: task.id,
        user_id: user.id,
        type: 'assignment',
        description: `Allocated ${assignees.length} personnel to new objective`,
        metadata: { assignee_count: assignees.length }
      });
    }

    revalidatePath('/tasks');
    return { data: task };
  } catch (error: any) {
    return { error: error.message || 'Failed to create task' };
  }
}

export async function updateTask(taskId: string, updates: any) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { error: 'Unauthorized' };

    const role = await getUserRole();
    if (role === 'viewer') return { error: 'Read-only access' };

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const supabase = await createServerClient();
    
    // Get old data for comparison
    const { data: oldTask } = await supabase.from('tasks').select('*').eq('id', taskId).single();

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .eq('workspace_id', workspaceId)
      .select()
      .single();

    if (error) throw error;

    // Log Strategic Changes
    if (oldTask) {
      if (updates.priority && oldTask.priority !== updates.priority) {
        await supabase.from('task_activities').insert({
          task_id: taskId,
          user_id: profile.id,
          type: 'status_change',
          description: `Escalated priority from ${oldTask.priority} to ${updates.priority}`,
          metadata: { from: oldTask.priority, to: updates.priority }
        });
      }
      if (updates.status && oldTask.status !== updates.status) {
        await supabase.from('task_activities').insert({
          task_id: taskId,
          user_id: profile.id,
          type: 'status_change',
          description: `Shifted objective to ${updates.status.replace('_', ' ')}`,
          metadata: { from: oldTask.status, to: updates.status }
        });
      }
      if (updates.due_date !== undefined && oldTask.due_date !== updates.due_date) {
        await supabase.from('task_activities').insert({
          task_id: taskId,
          user_id: profile.id,
          type: 'status_change',
          description: updates.due_date ? 'Recalibrated deadline' : 'Cleared objective deadline',
          metadata: { from: oldTask.due_date, to: updates.due_date }
        });
      }
    }

    revalidatePath('/tasks');
    return { data };
  } catch (error: any) {
    return { error: error.message || 'Failed to update task' };
  }
}

export async function updateTaskStatus(taskId: string, status: string, index?: number) {
  return updateTask(taskId, { status, sort_order: index });
}

export async function addTaskComment(taskId: string, content: string, mentions: string[] = []) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { error: 'Unauthorized' };

    const supabase = await createServerClient();
    
    // 1. Record Comment Activity
    const { data: comment, error: commentError } = await supabase
      .from('task_activities')
      .insert({
        task_id: taskId,
        user_id: profile.id,
        type: 'comment',
        description: content,
        metadata: { mentions }
      })
      .select()
      .single();

    if (commentError) throw commentError;

    // 2. Fetch Task Title for Notification
    const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();

    // 3. Handle @Mentions (In-App & Email)
    if (mentions.length > 0) {
      const mentionNotifications = mentions.map(userId => ({
        user_id: userId,
        title: 'Tactical Mention',
        description: `${profile.firstName} mentioned you in: ${task?.title}`,
        type: 'comment_mentioned',
        link: `/tasks?taskId=${taskId}`
      }));

      await supabase.from('inbox_notifications').insert(mentionNotifications);

      // Trigger Emails for Mentions
      const { data: profiles } = await supabase.from('users').select('email').in('id', mentions);
      if (profiles) {
        for (const targetProfile of profiles) {
          if (targetProfile.email) {
            await sendEmail({
              to: targetProfile.email,
              subject: `[MENTION] ${profile.firstName} tagged you in LeadsMind`,
              html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                  <h3 style="color: #6c47ff;">You were mentioned in a task thread</h3>
                  <p><strong>${profile.firstName} ${profile.lastName}</strong> tagged you in: <strong>${task?.title}</strong></p>
                  <blockquote style="border-left: 4px solid #6c47ff; padding-left: 15px; font-style: italic;">
                    "${content.length > 100 ? content.substring(0, 100) + '...' : content}"
                  </blockquote>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks?taskId=${taskId}" style="display: inline-block; background: #6c47ff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-top: 20px;">View Discussion</a>
                </div>
              `
            }).catch(console.error);
          }
        }
      }
    }

    revalidatePath('/tasks');
    return { data: comment };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function toggleTaskAssignee(taskId: string, userId: string) {
  try {
    const profile = await getCurrentProfile();
    if (!profile) return { error: 'Unauthorized' };

    const role = await getUserRole();
    if (role === 'viewer') return { error: 'Read-only access' };

    // Editors (members) can only self-assign
    if (role === 'member' && profile.id !== userId) {
      return { error: 'Tactical Restriction: Editors can only self-allocate' };
    }

    const supabase = await createServerClient();
    
    // Check if currently assigned
    const { data: existing } = await supabase
      .from('task_assignees')
      .select('*')
      .eq('task_id', taskId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      await supabase.from('task_assignees').delete().eq('task_id', taskId).eq('user_id', userId);
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: profile.id,
        type: 'assignment',
        description: 'Deallocated personnel from objective',
        metadata: { target_user_id: userId, action: 'removed' }
      });
    } else {
      await supabase.from('task_assignees').insert({ task_id: taskId, user_id: userId });
      await supabase.from('task_activities').insert({
        task_id: taskId,
        user_id: profile.id,
        type: 'assignment',
        description: 'Allocated new personnel to objective',
        metadata: { target_user_id: userId, action: 'added' }
      });
    }

    revalidatePath('/tasks');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function deleteTask(taskId: string) {
  try {
    const supabase = await createServerClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new UnauthorizedError();
    }

    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) {
      throw new ForbiddenError('No active workspace');
    }

    const { data: membership } = await supabase
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!membership) {
      throw new ForbiddenError('Not a member of this workspace');
    }

    const role = await getUserRole();
    if (role !== 'admin' && role !== 'manager') {
      return { error: 'Authorization Failure: Only Admins/Managers can decommission objectives' };
    }

    const { error } = await supabase.from('tasks').delete().eq('id', taskId).eq('workspace_id', workspaceId);
    if (error) throw error;
    revalidatePath('/tasks');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getAssignableMembers() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    if (!workspaceId) return { error: 'No workspace active' };

    const adminClient = await createAdminClient();
    const { data: memberships, error } = await adminClient
      .from('workspace_members')
      .select(`
        user_id,
        role,
        user:users(id, email, first_name, last_name, avatar_url)
      `)
      .eq('workspace_id', workspaceId)
      .order('role', { ascending: false });

    if (error) throw error;
    return { data: memberships };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getWorkspaceTags() {
  try {
    const workspaceId = await getCurrentWorkspaceId();
    const supabase = await createServerClient();
    const { data, error } = await supabase.from('task_tags').select('*').eq('workspace_id', workspaceId);
    if (error) throw error;
    return { data };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function uploadTaskAttachment(taskId: string, formData: FormData) {
  try {
    const role = await getUserRole();
    if (role === 'viewer') return { error: 'Read-only access' };

    const profile = await getCurrentProfile();
    if (!profile) return { error: 'Unauthorized' };

    const workspaceId = await getCurrentWorkspaceId();
    const file = formData.get('file') as File;
    if (!file || file.size > 10 * 1024 * 1024) return { error: 'Invalid file or exceeds 10MB' };

    const supabase = await createServerClient();
    const fileExt = file.name.split('.').pop();
    const filePath = `${workspaceId}/${taskId}/${Math.random().toString(36).slice(2)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage.from('task-attachments').upload(filePath, file);
    if (uploadError) throw uploadError;

    const { data: attachment, error: dbError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        workspace_id: workspaceId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: filePath,
        uploaded_by: profile.id
      })
      .select()
      .single();

    if (dbError) throw dbError;

    await supabase.from('task_activities').insert({
      task_id: taskId,
      user_id: profile.id,
      type: 'assignment',
      description: `Attached payload: ${file.name}`,
      metadata: { attachment_id: attachment.id }
    });

    revalidatePath('/tasks');
    return { data: attachment };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function sendDailyBriefing() {
  try {
    const supabase = await createAdminClient();
    
    // 1. Get all active users
    const { data: users } = await supabase.from('users').select('id, email, first_name');
    if (!users) return { error: 'No users found' };

    const today = new Date().toISOString().split('T')[0];

    for (const user of users) {
      if (!user.email) continue;

      // 2. Fetch User's Objectives (Due Today OR High Priority)
      const { data: tasks } = await supabase
        .from('tasks')
        .select(`
          id, title, priority, due_date,
          assignees:task_assignees!inner(user_id)
        `)
        .eq('assignees.user_id', user.id)
        .neq('status', 'done')
        .or(`due_date.eq.${today},priority.eq.high`);

      if (tasks && tasks.length > 0) {
        const highPriority = tasks.filter(t => t.priority === 'high');
        const dueToday = tasks.filter(t => t.due_date?.split('T')[0] === today);

        // 3. Dispatch Briefing
        await sendEmail({
          to: user.email,
          subject: `📋 MISSION BRIEFING: ${tasks.length} Objectives for Today`,
          html: `
            <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px;">
              <h2 style="color: #6c47ff; margin-bottom: 5px;">Good Morning, ${user.first_name}</h2>
              <p style="color: #666; font-size: 14px; margin-top: 0;">Here is your tactical overview for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}.</p>
              
              ${highPriority.length > 0 ? `
                <div style="margin-top: 25px; padding: 15px; background: #fff5f5; border-left: 4px solid #f43f5e; border-radius: 4px;">
                  <h4 style="color: #f43f5e; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 0.1em;">Critical Objectives</h4>
                  <ul style="margin: 0; padding-left: 20px;">
                    ${highPriority.map(t => `<li style="margin-bottom: 5px;"><strong>${t.title}</strong></li>`).join('')}
                  </ul>
                </div>
              ` : ''}

              <div style="margin-top: 25px;">
                <h4 style="color: #333; margin: 0 0 15px 0; text-transform: uppercase; letter-spacing: 0.1em; border-bottom: 1px solid #eee; padding-bottom: 5px;">Today's Schedule</h4>
                ${dueToday.length > 0 ? `
                  <ul style="margin: 0; padding-left: 20px;">
                    ${dueToday.map(t => `<li style="margin-bottom: 8px;">${t.title} <span style="color: #999; font-size: 11px;">(Due Today)</span></li>`).join('')}
                  </ul>
                ` : '<p style="color: #999; font-style: italic;">No specific deadlines for today.</p>'}
              </div>

              <div style="margin-top: 35px; text-align: center;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks" style="display: inline-block; background: #6c47ff; color: white; padding: 12px 25px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 14px;">OPEN COMMAND CENTER</a>
              </div>

              <p style="margin-top: 40px; font-size: 11px; color: #aaa; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                Strategic Intelligence by LeadsMind AI.
              </p>
            </div>
          `
        }).catch(err => console.error(`Failed to send briefing to ${user.email}:`, err));
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error('[sendDailyBriefing] Error:', error);
    return { error: error.message };
  }
}

export async function deleteTaskAttachment(attachmentId: string) {
  try {
    const role = await getUserRole();
    if (role === 'viewer') return { error: 'Read-only access' };

    const supabase = await createServerClient();
    const { data: attachment } = await supabase.from('task_attachments').select('*').eq('id', attachmentId).single();
    if (!attachment) return { error: 'Not found' };

    await supabase.storage.from('task-attachments').remove([attachment.file_path]);
    await supabase.from('task_attachments').delete().eq('id', attachmentId);

    revalidatePath('/tasks');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}

export async function getAttachmentUrl(filePath: string) {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(filePath, 60);
    if (error) throw error;
    return { url: data.signedUrl };
  } catch (error: any) {
    return { error: error.message };
  }
}
