'use client';

import React, { useState, useEffect } from 'react';
import { useDebounce } from 'react-use';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { KanbanColumn } from './KanbanColumn';
import { TasksToolbar } from './TasksToolbar';
import { TasksListView } from './TasksListView';
import { TasksCalendarView } from './TasksCalendarView';
import { TaskDetailDrawer } from './TaskDetailDrawer';
import { CreateTaskModal } from './CreateTaskModal';
import { getTasks, updateTaskStatus, getUserRole } from '@/app/actions/tasks';
import { toast } from 'sonner';
import { useDashboardContext } from '@/components/layouts/DashboardProvider';
import { TasksBoardSkeleton } from './skeletons/TasksBoardSkeleton';

const COLUMNS = [
  { id: 'todo', title: 'To Do' },
  { id: 'in_progress', title: 'In Progress' },
  { id: 'in_review', title: 'In Review' },
  { id: 'done', title: 'Done' },
];

export function TasksBoard() {
  const { user } = useDashboardContext();
  const [role, setRole] = useState<string | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'kanban' | 'list' | 'calendar'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Filters — applied server-side in getTasks() (real .eq()/.ilike() query
  // filters, not a client-side .filter() over an already-fetched list), so
  // every filter combination here re-queries instead of re-slicing local
  // state.
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [dueTodayOnly, setDueTodayOnly] = useState(false);
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);

  const [sortBy, setSortBy] = useState<'newest' | 'priority' | 'due_date'>('newest');

  // Drawer & Modal State
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialStatus, setCreateInitialStatus] = useState('todo');
  const [createInitialDate, setCreateInitialDate] = useState<Date | undefined>();

  useDebounce(() => setDebouncedSearch(searchQuery), 300, [searchQuery]);

  const effectiveAssigneeIds = React.useMemo(() => {
    if (myTasksOnly && user?.id) return Array.from(new Set([...selectedAssignees, user.id]));
    return selectedAssignees;
  }, [myTasksOnly, selectedAssignees, user?.id]);

  useEffect(() => {
    loadTasks();
  }, [debouncedSearch, effectiveAssigneeIds, dueTodayOnly, highPriorityOnly, sortBy]);

  useEffect(() => {
    getUserRole().then((r) => { if (r) setRole(r); });

    // Subscribe to Realtime changes
    const supabase = (require('@/lib/supabase/client')).createClient();
    const channel = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => loadTasks()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_comments' },
        () => loadTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadTasks() {
    setLoading(true);
    const res = await getTasks({
      search: debouncedSearch || undefined,
      assigneeIds: effectiveAssigneeIds.length > 0 ? effectiveAssigneeIds : undefined,
      dueToday: dueTodayOnly || undefined,
      highPriorityOnly: highPriorityOnly || undefined,
      sortBy,
    });
    if (res.data) setTasks(res.data);
    setLoading(false);
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) return;

    // Optimistic Update
    const newTasks = [...tasks];
    const taskIndex = newTasks.findIndex(t => t.id === draggableId);
    if (taskIndex !== -1) {
      newTasks[taskIndex] = { ...newTasks[taskIndex], status: destination.droppableId };
      setTasks(newTasks);
    }

    const res = await updateTaskStatus(draggableId, destination.droppableId as any, destination.index);
    if (res.error) {
      toast.error(res.error);
      loadTasks();
    } else {
      loadTasks();
    }
  };

  const handleCardClick = (taskId: string) => {
    setSelectedTaskId(taskId);
    setDrawerOpen(true);
  };

  const handleOpenCreateModal = (status: string = 'todo', date?: Date) => {
    setCreateInitialStatus(status);
    setCreateInitialDate(date);
    setCreateModalOpen(true);
  };

  const toggleAssigneeFilter = (userId: string) => {
    setSelectedAssignees(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  // tasks is already filtered/sorted server-side by getTasks(); views below
  // read it directly (Kanban still splits by status locally, but over this
  // already-correct, bounded result set — not an unbounded raw list).
  const processedTasks = tasks;

  if (loading && tasks.length === 0) {
    return <TasksBoardSkeleton />;
  }

  return (
    <div className="flex flex-col w-full">
      <TasksToolbar 
        view={view}
        onViewChange={setView}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        sortBy={sortBy}
        onSortChange={setSortBy}
        onMyTasksToggle={setMyTasksOnly}
        selectedAssignees={selectedAssignees}
        onAssigneeToggle={toggleAssigneeFilter}
        onInitializeTask={role === 'viewer' ? undefined : () => handleOpenCreateModal('todo')}
        dueTodayOnly={dueTodayOnly}
        onDueTodayToggle={setDueTodayOnly}
        highPriorityOnly={highPriorityOnly}
        onHighPriorityToggle={setHighPriorityOnly}
      />

      <div className="w-full">
        {view === 'kanban' && (
          <div className="px-6 pb-40">
            <DragDropContext onDragEnd={role === 'viewer' ? () => {} : onDragEnd}>
              <div className="flex flex-col gap-6 w-full">
                {COLUMNS.map(column => (
                  <KanbanColumn
                    key={column.id}
                    id={column.id}
                    title={column.title}
                    tasks={processedTasks.filter(t => t.status === column.id)}
                    onCardClick={handleCardClick}
                    onAddTask={() => handleOpenCreateModal(column.id)}
                  />
                ))}
              </div>
            </DragDropContext>
          </div>
        )}

        {view === 'list' && (
          <TasksListView 
            tasks={processedTasks} 
            onTaskClick={handleCardClick} 
          />
        )}

        {view === 'calendar' && (
          <TasksCalendarView 
            tasks={processedTasks} 
            onTaskClick={handleCardClick} 
            onDateClick={(date) => handleOpenCreateModal('todo', date)}
          />
        )}
      </div>

      <TaskDetailDrawer 
        taskId={selectedTaskId}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onTaskUpdated={loadTasks}
      />

      <CreateTaskModal 
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        onTaskCreated={loadTasks}
        initialStatus={createInitialStatus}
        initialDate={createInitialDate}
      />
    </div>
  );
}
