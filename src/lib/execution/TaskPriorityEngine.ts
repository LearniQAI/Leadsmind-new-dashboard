export class TaskPriorityEngine {
  /**
   * Evaluates the appropriate priority for a task based on its due date and type.
   */
  public static evaluatePriority(dueDate: string | Date | null, taskType: string): 'Low' | 'Medium' | 'High' | 'Urgent' {
    if (!dueDate) return 'Medium';

    const now = new Date();
    const due = new Date(dueDate);
    const diffHours = (due.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (diffHours < 0) return 'Urgent'; // Overdue
    if (diffHours < 24) return 'High';  // Due in next 24h
    
    if (taskType === 'opportunity_review') return 'High';
    
    if (diffHours > 72) return 'Low';   // Due in > 3 days

    return 'Medium';
  }
}
