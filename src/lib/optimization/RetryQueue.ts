/**
 * RetryQueue — schedules asynchronous operations with exponential backoff schedules,
 * retry exhaustion limits, failure logging, and dead-letter queue routing.
 */

export interface QueueTask {
  id: string;
  name: string;
  fn: () => Promise<any>;
  attempts: number;
  maxAttempts: number;
  metadata?: any;
}

export class RetryQueue {
  private deadLetterQueue: QueueTask[] = [];

  /**
   * Enqueue and execute a task with retry parameters.
   */
  async executeTask(
    name: string,
    fn: () => Promise<any>,
    maxAttempts: number = 3,
    metadata?: any
  ): Promise<any> {
    const task: QueueTask = {
      id: Math.random().toString(36).substring(7),
      name,
      fn,
      attempts: 0,
      maxAttempts,
      metadata
    };

    return this.runTask(task);
  }

  /**
   * Retrieve current dead-letter tasks.
   */
  getDeadLetterQueue(): QueueTask[] {
    return this.deadLetterQueue;
  }

  private async runTask(task: QueueTask): Promise<any> {
    try {
      task.attempts++;
      return await task.fn();
    } catch (error) {
      if (task.attempts < task.maxAttempts) {
        // Calculate backoff: 500ms, 1000ms, 2000ms...
        const delay = 500 * Math.pow(2, task.attempts);
        console.warn(`[RetryQueue] Task "${task.name}" failed (attempt ${task.attempts}/${task.maxAttempts}). Retrying in ${delay}ms...`);
        
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.runTask(task);
      } else {
        // Send to Dead Letter Queue (DLQ)
        console.error(`[RetryQueue] Task "${task.name}" failed completely after ${task.attempts} attempts. Sent to DLQ.`, error);
        this.deadLetterQueue.push(task);
        throw error;
      }
    }
  }
}
