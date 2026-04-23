import { TaskType, TaskPriority } from '../../../types';

// Shape of the PATCH /api/tasks/:id request body.
// Admin fields: title, description, type, priority, change_note.
// Member-only field: estimated_hours (assignee only).
export interface UpdateTaskDto {
  title?: string;
  description?: string;
  type?: TaskType;
  priority?: TaskPriority;
  change_note?: string;
  estimated_hours?: number;
}
