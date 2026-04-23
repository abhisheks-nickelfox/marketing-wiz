// Shape of the PATCH /api/tasks/:id/time-logs/:logId request body.
// Members can only edit their own logs; admins can edit any log.
export interface UpdateTimeLogDto {
  /** Hours worked. Must be between MIN_TIME_LOG_HOURS and MAX_TIME_LOG_HOURS. */
  hours: number;
  comment?: string;
}
