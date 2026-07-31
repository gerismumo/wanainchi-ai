export interface DiscoveredCategory {
  id: string;
  slug: string;
  label: string;
  report_count: number;
  is_active: boolean;
  first_seen_at: Date;
  last_seen_at: Date;
}
