// Shape of the POST /api/firms request body.
export interface CreateFirmDto {
  name: string;
  contact_name?: string;
  contact_email?: string;
  /** Optional default prompt template to use when processing transcripts for this firm. */
  default_prompt_id?: string | null;
}
