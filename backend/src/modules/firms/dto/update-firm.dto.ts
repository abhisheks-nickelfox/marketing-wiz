// Shape of the PATCH /api/firms/:id request body.
// All fields are optional — only provided fields are written to the DB.
export interface UpdateFirmDto {
  name?: string;
  location?: string;
  address?: string;
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
