// Shape of the PATCH /api/auth/profile request body.
// Currently only `name` is accepted; extend as the profile surface grows.
export interface UpdateProfileDto {
  name: string;
}
