// Shape of the POST /api/auth/reset-password request body.
export interface ResetPasswordDto {
  /** HMAC-signed reset token from the reset-password email link. */
  token: string;
  /** Must be at least 8 characters. */
  password: string;
}
