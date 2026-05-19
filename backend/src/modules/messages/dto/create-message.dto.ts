// Shape of the POST /api/messages request body.
export interface CreateMessageDto {
  scope: 'firm' | 'project' | 'task';
  scope_id: string;
  body: string;
  parent_id?: string;
  /** When true, renders as a compact activity entry instead of a chat bubble. */
  is_system?: boolean;
}
