import { z } from "zod";

export const ingestCountsSchema = z.object({
  entries: z.number().int().min(0),
  exits: z.number().int().min(0),
  current_inside: z.number().int().min(0),
  period_seconds: z.number().int().min(1).default(300),
  timestamp: z.string().datetime().optional(),
});

export const ingestHeatmapSchema = z.object({
  period: z.enum(["5min", "15min", "hourly", "daily"]),
  heatmap_data: z.array(z.array(z.number())),
  resolution: z.string().regex(/^\d+x\d+$/),
  timestamp: z.string().datetime().optional(),
});

export const ingestZoneDataSchema = z.object({
  zones: z.array(
    z.object({
      zone_id: z.string().uuid(),
      entries: z.number().int().min(0),
      exits: z.number().int().min(0),
      avg_occupancy: z.number().min(0),
      peak_occupancy: z.number().int().min(0),
      dwell_events: z
        .array(
          z.object({
            track_id: z.number().int(),
            entered_at: z.string().datetime(),
            exited_at: z.string().datetime().optional(),
            dwell_seconds: z.number().min(0).optional(),
          })
        )
        .optional()
        .default([]),
    })
  ),
  period_seconds: z.number().int().min(1).default(300),
  timestamp: z.string().datetime().optional(),
});

export const heartbeatSchema = z.object({
  uptime_seconds: z.number().min(0),
  cameras_active: z.number().int().min(0),
  cameras_total: z.number().int().min(0),
  cpu_usage: z.number().min(0).max(100).optional(),
  memory_usage: z.number().min(0).max(100).optional(),
  fps: z.number().min(0).optional(),
  errors: z.array(z.string()).optional().default([]),
  local_ip: z.string().optional(),
  frame_server_port: z.number().int().optional(),
});

export const ingestJourneysSchema = z.object({
  journeys: z.array(
    z.object({
      track_id: z.string(),
      started_at: z.string(),
      ended_at: z.string(),
      total_zones_visited: z.number().int().min(0),
      total_dwell_seconds: z.number().min(0),
      journey_data: z.array(
        z.object({
          zone_id: z.string().uuid(),
          entered_at: z.string(),
          exited_at: z.string(),
          dwell_seconds: z.number().min(0),
        })
      ),
    })
  ),
  transitions: z.array(
    z.object({
      from_zone_id: z.string().uuid(),
      to_zone_id: z.string().uuid(),
      count: z.number().int().min(1),
    })
  ).optional().default([]),
  timestamp: z.string().datetime().optional(),
});

export const ingestQueuesSchema = z.object({
  queues: z.array(
    z.object({
      zone_id: z.string().uuid(),
      people_in_queue: z.number().int().min(0),
      estimated_wait_seconds: z.number().min(0),
      peak_in_period: z.number().int().min(0).optional(),
      avg_in_period: z.number().min(0).optional(),
      is_open: z.boolean().optional().default(true),
    })
  ),
  timestamp: z.string().datetime().optional(),
});

export type IngestCountsInput = z.infer<typeof ingestCountsSchema>;
export type IngestHeatmapInput = z.infer<typeof ingestHeatmapSchema>;
export type IngestZoneDataInput = z.infer<typeof ingestZoneDataSchema>;
export type HeartbeatInput = z.infer<typeof heartbeatSchema>;
export type IngestJourneysInput = z.infer<typeof ingestJourneysSchema>;
export type IngestQueuesInput = z.infer<typeof ingestQueuesSchema>;
