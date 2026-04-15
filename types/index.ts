export interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: "trial" | "starter" | "professional" | "enterprise";
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  organization_id: string;
  role: "owner" | "admin" | "manager" | "analyst" | "viewer";
  full_name: string | null;
  created_at: string;
  organization?: Organization;
}

export interface Store {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  timezone: string;
  opening_time: string;
  closing_time: string;
  is_active: boolean;
  created_at: string;
}

export interface Device {
  id: string;
  store_id: string;
  api_key: string;
  name: string;
  status: "online" | "offline" | "error";
  last_seen_at: string | null;
  config: Record<string, unknown>;
  created_at: string;
  store?: Store;
}

export interface FloorPlan {
  id: string;
  store_id: string;
  name: string;
  image_url: string | null;
  width_px: number | null;
  height_px: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Zone {
  id: string;
  store_id: string;
  name: string;
  zone_type: "aisle" | "checkout" | "entrance" | "promo" | "endcap" | "storage" | "other";
  polygon: { x: number; y: number }[];
  color: string;
  floor_plan_id: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DeviceZone {
  id: string;
  device_id: string;
  zone_id: string;
  camera_polygon: { x: number; y: number }[] | null;
  calibration_data: Record<string, unknown>;
}

export interface PeopleCount {
  id: number;
  device_id: string;
  store_id: string;
  timestamp: string;
  entries: number;
  exits: number;
  current_inside: number;
  period_seconds: number;
}

export interface ZoneTraffic {
  id: number;
  zone_id: string;
  store_id: string;
  device_id: string | null;
  timestamp: string;
  period_seconds: number;
  entries: number;
  exits: number;
  avg_occupancy: number;
  peak_occupancy: number;
}

export interface DwellEvent {
  id: number;
  zone_id: string;
  store_id: string;
  device_id: string | null;
  track_id: number;
  entered_at: string;
  exited_at: string | null;
  dwell_seconds: number | null;
  engagement_type: "pass" | "browse" | "engaged";
}

export interface ZoneHeatmap {
  id: number;
  device_id: string;
  store_id: string;
  timestamp: string;
  period: string;
  heatmap_data: number[][];
  resolution: string;
  metadata: Record<string, unknown>;
}

export interface Transaction {
  id: number;
  store_id: string;
  timestamp: string;
  amount: number;
  items_count: number;
  source: string;
}

export interface DailyStoreSummary {
  id: number;
  store_id: string;
  date: string;
  total_visitors: number;
  peak_hour: number | null;
  peak_occupancy: number;
  avg_dwell_seconds: number | null;
  total_transactions: number;
  total_revenue: number;
  conversion_rate: number | null;
}

export interface DailyZoneSummary {
  id: number;
  zone_id: string;
  store_id: string;
  date: string;
  total_visits: number;
  avg_dwell_seconds: number | null;
  engagement_rate: number | null;
  peak_hour: number | null;
}

export interface AlertRule {
  id: string;
  store_id: string;
  name: string;
  rule_type: "queue_length" | "occupancy" | "zone_empty" | "device_offline";
  config: Record<string, unknown>;
  notify_channels: string[];
  is_active: boolean;
  created_at: string;
}

export interface AlertEvent {
  id: number;
  rule_id: string;
  store_id: string;
  triggered_at: string;
  resolved_at: string | null;
  data: Record<string, unknown> | null;
  status: "active" | "acknowledged" | "resolved";
}

// API request/response types
export interface IngestCountsRequest {
  entries: number;
  exits: number;
  current_inside: number;
  period_seconds: number;
  timestamp?: string;
}

export interface IngestHeatmapRequest {
  period: string;
  heatmap_data: number[][];
  resolution: string;
  timestamp?: string;
}

export interface StoreWithStats extends Store {
  total_visitors_today: number;
  current_inside: number;
  devices_online: number;
  devices_total: number;
  conversion_rate: number | null;
}

export interface ZoneWithStats extends Zone {
  total_visits_today: number;
  avg_dwell_seconds: number | null;
  engagement_rate: number | null;
  current_occupancy: number;
}

export interface HourlyTraffic {
  hour: number;
  entries: number;
  exits: number;
}

export interface StoreOverview {
  store: Store;
  total_visitors_today: number;
  current_inside: number;
  avg_dwell_seconds: number | null;
  conversion_rate: number | null;
  peak_hour: number | null;
  devices_online: number;
  devices_total: number;
  hourly_traffic: HourlyTraffic[];
  top_zones: ZoneWithStats[];
  active_alerts: AlertEvent[];
}
