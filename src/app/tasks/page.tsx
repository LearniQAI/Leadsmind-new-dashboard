import React from 'react';
import TasksClient from './TasksClient';
import { getTasks } from '@/app/actions/tasks';

export default async function TasksPage() {
  const { data: tasks, error } = await getTasks();

  return (
    <div className="p-6 max-w-7xl mx-auto font-body min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-black uppercase tracking-tighter text-white">Tasks <span className="text-primary">Manager</span></h1>
        <p className="text-white/40 text-sm font-medium">Organize your workflow and crush your goals.</p>
      </div>

      {error ? (
        <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger">
          {error}
        </div>
      ) : (
        <TasksClient initialTasks={tasks || []} />
      )}
    </div>
  );
}
