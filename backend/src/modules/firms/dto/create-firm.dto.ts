// Shape of the POST /api/firms request body.
export interface CreateFirmDto {
  name: string;
  location?: string;
  website?: string;
  logo_url?: string | null;
  description?: string;
  contact_name?: string;
  contact_email?: string;
  contact_role?: string;
  contact_phone?: string;
  account_manager_id?: string | null;
  /** Optional default prompt template to use when processing transcripts for this firm. */
  default_prompt_id?: string | null;
}
