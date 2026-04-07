export interface CalendarMonth {
  year: number;
  month: number;
  posts: import('./post-library').LibraryPost[];
}

export interface CalendarWeekSummary {
  total: number;
  draft: number;
  ready: number;
  published: number;
}