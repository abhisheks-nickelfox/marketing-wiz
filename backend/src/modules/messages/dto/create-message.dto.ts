// Shape of the POST /api/messages request body.
export interface CreateMessageDto {
  scope: 'firm' | 'project' | 'task';
  scope_id: string;
  body: string;
  parent_id?: string;
}
