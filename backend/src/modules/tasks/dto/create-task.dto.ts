import { TaskType, TaskPriority } from '../../../types';

// Shape of the POST /api/tasks request body.
export interface CreateTaskDto {
  firm_id: string;
  title: string;
  type: TaskType;
  /** UUID of the task_types catalog entry. When set, saves to tickets.task_type_id. */
  task_type_id?: string;
  priority?: TaskPriority;
  description?: string;
  project_id: string;
  assignee_id?: string;
  deadline?: string;
  estimated_hours?: number;
  /** Initial status for the task. Defaults to 'to_do' when omitted. */
  initial_status?: string;
  /** UUID of the parent task. When set, this task becomes a sub-task of the referenced parent. */
  parent_task_id?: string;
}
