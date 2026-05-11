import React from 'react';
import TasksClient from './TasksClient';
import { getTasks } from '@/app/actions/tasks';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
 const { data: tasks, error } = await getTasks();

 if (error) {
  return (
   <div className="p-6 max-w-7xl mx-auto">
    <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-medium text-sm">
     Error loading tasks: {error}
    </div>
   </div>
  );
 }

 return <TasksClient initialTasks={tasks || []} />;
}
