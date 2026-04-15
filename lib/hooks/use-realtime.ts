"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function useRealtimeCount(storeId: string) {
  const [currentInside, setCurrentInside] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel: RealtimeChannel = supabase
      .channel(`people_counts:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "people_counts",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          const data = payload.new as any;
          setCurrentInside(data.current_inside || 0);
          setLastUpdated(new Date());
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, supabase]);

  return { currentInside, lastUpdated };
}

export function useRealtimeDeviceStatus(storeId?: string) {
  const [devices, setDevices] = useState<Record<string, string>>({});
  const supabase = createClient();

  useEffect(() => {
    const filter = storeId ? `store_id=eq.${storeId}` : undefined;

    const channel = supabase
      .channel(`devices:${storeId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "devices",
          ...(filter ? { filter } : {}),
        },
        (payload) => {
          const data = payload.new as any;
          setDevices((prev) => ({ ...prev, [data.id]: data.status }));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, supabase]);

  return devices;
}

export function useRealtimeAlerts(storeId: string) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`alerts:${storeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "alert_events",
          filter: `store_id=eq.${storeId}`,
        },
        (payload) => {
          setAlerts((prev) => [payload.new, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, supabase]);

  const dismiss = useCallback(
    async (alertId: number) => {
      await supabase
        .from("alert_events")
        .update({ status: "acknowledged" })
        .eq("id", alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    },
    [supabase]
  );

  return { alerts, dismiss };
}
