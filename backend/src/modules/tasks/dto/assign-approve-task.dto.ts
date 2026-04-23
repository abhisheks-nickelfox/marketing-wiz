import { TaskPriority } from '../../../types';

// Shape of the PATCH /api/tasks/:id/assign-approve request body.
export interface AssignApproveTaskDto {
  /** UUID of the team member being assigned. */
  assignee_id: string;
  priority?: TaskPriority;
  /** ISO 8601 date string, e.g. "2025-12-31". */
  deadline?: string;
  /** Optional project to link this task to at approval time. */
  project_id?: string;
}
