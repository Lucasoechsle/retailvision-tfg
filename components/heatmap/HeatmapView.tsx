"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map } from "lucide-react";
import type { Store, ZoneHeatmap } from "@/types";

interface HeatmapViewProps {
  store: Store;
  heatmaps: ZoneHeatmap[];
}

export function HeatmapView({ store, heatmaps }: HeatmapViewProps) {
  const latestHeatmap = heatmaps[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mapa de Calor</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Distribución de Tráfico</CardTitle>
        </CardHeader>
        <CardContent>
          {!latestHeatmap ? (
            <div className="flex h-96 items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Map className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <h3 className="text-lg font-medium">Sin datos de heatmap</h3>
                <p className="mt-2 text-sm">
                  Sube un plano de la tienda y conecta cámaras para visualizar patrones de tráfico.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-1" style={{
                gridTemplateColumns: `repeat(${latestHeatmap.heatmap_data[0]?.length || 20}, 1fr)`,
              }}>
                {latestHeatmap.heatmap_data.flat().map((value, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-sm"
                    style={{
                      backgroundColor: `hsl(${200 + value * 160}, 80%, ${20 + value * 50}%)`,
                      opacity: 0.3 + value * 0.7,
                    }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Bajo tráfico</span>
                <div className="flex gap-1">
                  {[0.1, 0.3, 0.5, 0.7, 0.9].map((v) => (
                    <div
                      key={v}
                      className="h-3 w-6 rounded-sm"
                      style={{
                        backgroundColor: `hsl(${200 + v * 160}, 80%, ${20 + v * 50}%)`,
                      }}
                    />
                  ))}
                </div>
                <span>Alto tráfico</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
