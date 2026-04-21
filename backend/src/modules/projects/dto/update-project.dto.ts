import type { WorkflowStatus } from './create-project.dto';

export interface UpdateProjectDto {
  name?:            string;
  description?:     string;
  status?:          'active' | 'archived';
  workflow_status?: WorkflowStatus;
  member_ids?:      string[];
}
