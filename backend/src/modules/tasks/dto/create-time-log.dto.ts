// Shape of the POST /api/tasks/:id/time-logs request body.
// 'revision' and 'transition' are system-only log types — members may not create them directly.
export type MemberLogType = 'estimate' | 'partial' | 'final' | 'revision';

export interface CreateTimeLogDto {
  /** Hours worked. Must be >= MIN_TIME_LOG_HOURS from constants. */
  hours: number;
  comment?: string;
  log_type: MemberLogType;
}
