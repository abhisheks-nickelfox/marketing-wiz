export type WorkflowStatus = 'todo' | 'in_progress' | 'in_review' | 'approved' | 'completed';

export interface CreateProjectDto {
  firm_id:         string;
  name:            string;
  description?:    string;
  workflow_status?: WorkflowStatus;
  member_ids?:     string[];
}
