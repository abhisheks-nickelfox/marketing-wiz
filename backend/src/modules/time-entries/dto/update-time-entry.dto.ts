export interface UpdateTimeEntryDto {
  started_at?:       string;
  ended_at?:         string;
  duration_seconds?: number;
  description?:      string;
}
