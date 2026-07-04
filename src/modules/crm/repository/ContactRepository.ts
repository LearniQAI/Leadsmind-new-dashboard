import { AppError } from '@/shared/errors/AppError';

export class ContactRepository {
  constructor(private db: any) {}

  async findById(id: string, workspaceId: string) {
    const { data, error } = await this.db
      .from('contacts')
      .select('*')
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async findActivities(contactId: string, workspaceId: string) {
    const { data, error } = await this.db
      .from('contact_activities')
      .select('*')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findNotes(contactId: string, workspaceId: string) {
    const { data, error } = await this.db
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findTasks(contactId: string, workspaceId: string) {
    const { data, error } = await this.db
      .from('contact_tasks')
      .select('*')
      .eq('contact_id', contactId)
      .eq('workspace_id', workspaceId)
      .order('due_date', { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async search(workspaceId: string, query: string, limit: number) {
    const { data, error } = await this.db
      .from('contacts')
      .select('id, first_name, last_name, email')
      .eq('workspace_id', workspaceId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async findByEmail(workspaceId: string, email: string) {
    const { data, error } = await this.db
      .from('contacts')
      .select('id, first_name, last_name')
      .eq('workspace_id', workspaceId)
      .eq('email', email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async create(workspaceId: string, payload: Record<string, unknown>) {
    const { data, error } = await this.db
      .from('contacts')
      .insert({ ...payload, workspace_id: workspaceId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async update(id: string, workspaceId: string, payload: Record<string, unknown>) {
    const { data, error } = await this.db
      .from('contacts')
      .update(payload)
      .eq('id', id)
      .eq('workspace_id', workspaceId)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ?? null;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    const { error } = await this.db
      .from('contacts')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }

  async listRegistryTags(workspaceId: string): Promise<{ name: string }[]> {
    const { data, error } = await this.db
      .from('contact_tags_registry')
      .select('name')
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async listTagsAndCounts(workspaceId: string): Promise<{ name: string; count: number }[]> {
    const { data, error } = await this.db
      .from('contacts')
      .select('tags')
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);

    const counts = new Map<string, number>();
    (data ?? []).forEach((c: { tags?: string[] }) => {
      (c.tags ?? []).forEach((t) => counts.set(t, (counts.get(t) ?? 0) + 1));
    });
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count }));
  }

  async createRegistryTag(workspaceId: string, name: string): Promise<void> {
    const { error } = await this.db
      .from('contact_tags_registry')
      .insert({ workspace_id: workspaceId, name: name.trim() });
    if (error) {
      if (error.code === '23505') throw new AppError('TAG_EXISTS', 'Tag already exists', 409);
      throw new Error(error.message);
    }
  }

  async getTags(contactId: string, workspaceId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('contacts')
      .select('tags')
      .eq('id', contactId)
      .eq('workspace_id', workspaceId)
      .single();
    if (error) throw new Error(error.message);
    return data?.tags ?? [];
  }

  async setTags(contactId: string, workspaceId: string, tags: string[]): Promise<void> {
    const { error } = await this.db
      .from('contacts')
      .update({ tags, updated_at: new Date().toISOString() })
      .eq('id', contactId)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }

  async logActivity(
    workspaceId: string,
    contactId: string,
    activity: { type: string; description: string; metadata?: Record<string, unknown> }
  ): Promise<void> {
    const { error } = await this.db.from('contact_activities').insert({
      workspace_id: workspaceId,
      contact_id: contactId,
      ...activity,
    });
    if (error) throw new Error(error.message);
  }

  async logActivitiesBulk(activities: Record<string, unknown>[]): Promise<void> {
    if (activities.length === 0) return;
    const { error } = await this.db.from('contact_activities').insert(activities);
    if (error) throw new Error(error.message);
  }

  async deleteRegistryTag(workspaceId: string, tag: string): Promise<void> {
    const { error } = await this.db
      .from('contact_tags_registry')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('name', tag);
    if (error) throw new Error(error.message);
  }

  async findByTag(workspaceId: string, tag: string): Promise<{ id: string; tags: string[] }[]> {
    const { data, error } = await this.db
      .from('contacts')
      .select('id, tags')
      .eq('workspace_id', workspaceId)
      .contains('tags', [tag]);
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async renameRegistryTag(workspaceId: string, oldTag: string, newTag: string): Promise<void> {
    const { error } = await this.db
      .from('contact_tags_registry')
      .update({ name: newTag })
      .eq('workspace_id', workspaceId)
      .eq('name', oldTag);
    if (error) throw new Error(error.message);
  }

  async createNote(workspaceId: string, contactId: string, content: string) {
    const { data, error } = await this.db
      .from('contact_notes')
      .insert({ workspace_id: workspaceId, contact_id: contactId, content })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async deleteNote(id: string, workspaceId: string): Promise<void> {
    const { error } = await this.db
      .from('contact_notes')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }

  async createTask(workspaceId: string, contactId: string, title: string) {
    const { data, error } = await this.db
      .from('contact_tasks')
      .insert({ workspace_id: workspaceId, contact_id: contactId, title, status: 'todo' })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async updateTaskStatus(id: string, workspaceId: string, status: string): Promise<void> {
    const { error } = await this.db
      .from('contact_tasks')
      .update({ status })
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }

  async deleteTask(id: string, workspaceId: string): Promise<void> {
    const { error } = await this.db
      .from('contact_tasks')
      .delete()
      .eq('id', id)
      .eq('workspace_id', workspaceId);
    if (error) throw new Error(error.message);
  }
}
