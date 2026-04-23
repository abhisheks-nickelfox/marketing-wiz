// Shape of the PATCH /api/firms/:id request body.
// All fields are optional — only provided fields are written to the DB.
export interface UpdateFirmDto {
  name?: string;
  contact_name?: string;
  contact_email?: string;
  default_prompt_id?: string | null;
}
