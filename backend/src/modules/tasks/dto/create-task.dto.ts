import { TaskType, TaskPriority } from '../../../types';

// Shape of the POST /api/tasks request body.
export interface CreateTaskDto {
  firm_id: string;
  title: string;
  type: TaskType;
  priority?: TaskPriority;
  description?: string;
}
