"use client";

import { useRealtimeCount } from "@/lib/hooks/use-realtime";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface LiveCounterProps {
  storeId: string;
  initialCount: number;
}

export function LiveCounter({ storeId, initialCount }: LiveCounterProps) {
  const { currentInside, lastUpdated } = useRealtimeCount(storeId);
  const count = lastUpdated ? currentInside : initialCount;

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">En Tienda Ahora</p>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <Badge variant="outline" className="animate-pulse text-[10px]">
                LIVE
              </Badge>
            )}
            <Activity className="h-5 w-5 text-muted-foreground" />
          </div>
        </div>
        <div className="mt-3">
          <p className="text-3xl font-bold tracking-tight">{count}</p>
          {lastUpdated && (
            <p className="mt-1 text-xs text-muted-foreground">
              Actualizado {lastUpdated.toLocaleTimeString("es")}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
