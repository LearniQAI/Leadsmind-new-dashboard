'use client';

import React, { useState, useEffect } from 'react';
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
  
  // Filters
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

  useEffect(() => {
    loadTasks();

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
    const [tasksRes, roleRes] = await Promise.all([
      getTasks(),
      getUserRole()
    ]);
    if (tasksRes.data) setTasks(tasksRes.data);
    if (roleRes) setRole(roleRes);
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

  // Processing Pipeline: Filter -> Sort
  const processedTasks = React.useMemo(() => {
    let result = tasks.filter(t => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = t.title.toLowerCase().includes(query) ||
                          t.description?.toLowerCase().includes(query) ||
                          t.assignees?.some((a: any) => 
                            (a.user?.first_name || '').toLowerCase().includes(query) ||
                            (a.user?.last_name || '').toLowerCase().includes(query)
                          );
      
      const matchesMyTasks = !myTasksOnly || t.assignees?.some((a: any) => a.user_id === user?.id);
      
      const matchesAssignees = selectedAssignees.length === 0 || 
                              t.assignees?.some((a: any) => selectedAssignees.includes(a.user_id));

      const matchesDueToday = !dueTodayOnly || (
        t.due_date && new Date(t.due_date).toDateString() === new Date().toDateString()
      );

      const matchesHighPriority = !highPriorityOnly || t.priority === 'high';

      return matchesSearch && matchesMyTasks && matchesAssignees && matchesDueToday && matchesHighPriority;
    });

    // Sort
    return result.sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'priority') {
        const order: Record<string, number> = { high: 3, medium: 2, low: 1 };
        return order[b.priority] - order[a.priority];
      }
      if (sortBy === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return 0;
    });
  }, [tasks, searchQuery, myTasksOnly, selectedAssignees, dueTodayOnly, highPriorityOnly, sortBy, user]);

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
