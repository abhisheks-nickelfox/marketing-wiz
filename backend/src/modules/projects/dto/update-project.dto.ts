import type { WorkflowStatus } from './create-project.dto';

export interface UpdateProjectDto {
  name?:            string;
  description?:     string;
  status?:          'active' | 'archived';
  workflow_status?: WorkflowStatus;
  member_ids?:      string[];
  start_date?:      string | null;
  end_date?:        string | null;
  priority?:        'high' | 'medium' | 'low';
}
