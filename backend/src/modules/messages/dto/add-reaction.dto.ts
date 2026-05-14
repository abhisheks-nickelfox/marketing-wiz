// Shape of the POST /api/messages/:id/reactions request body.
export interface AddReactionDto {
  /** A single emoji character or short sequence — max 8 chars. */
  emoji: string;
}
