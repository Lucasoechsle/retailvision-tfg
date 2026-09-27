"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Map, Upload } from "lucide-react";
import { ZoneEditor } from "./ZoneEditor";
import { ZoneAnalytics } from "./ZoneAnalytics";
import { toast } from "sonner";
import type { Store, Zone, FloorPlan } from "@/types";

interface ZonesViewProps {
  store: Store;
  zones: Zone[];
  floorPlan?: FloorPlan | null;
  /** HU-08: solo el administrador define zonas; el gerente de categoría ve el análisis (HU-15). */
  canEdit: boolean;
}

export function ZonesView({ store, zones: initialZones, floorPlan, canEdit }: ZonesViewProps) {
  const [zones, setZones] = useState(initialZones);
  const [uploading, setUploading] = useState(false);
  const [currentFloorPlan, setCurrentFloorPlan] = useState<FloorPlan | null>(floorPlan || null);

  const handleUploadFloorPlan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("storeId", store.id);

      const res = await fetch("/api/floor-plans", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Error subiendo plano");

      const data = await res.json();
      setCurrentFloorPlan(data.floorPlan);
      toast.success("Plano subido exitosamente");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const refreshZones = async () => {
    try {
      const res = await fetch(`/api/stores/${store.id}/zones`);
      const data = await res.json();
      setZones(data.zones || []);
    } catch {
      // silently fail
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Zonas</h1>
          <p className="mt-1 text-muted-foreground">{store.name}</p>
        </div>
        {canEdit && !currentFloorPlan && (
          <Button asChild disabled={uploading}>
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Subiendo..." : "Subir Plano"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUploadFloorPlan}
              />
            </label>
          </Button>
        )}
      </div>

      <Tabs defaultValue={canEdit ? "editor" : "analytics"}>
        {canEdit && (
          <TabsList>
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>
        )}

        {canEdit && (
          <TabsContent value="editor" className="mt-4">
            <ZoneEditor
              storeId={store.id}
              floorPlan={currentFloorPlan}
              zones={zones}
              onZoneSaved={refreshZones}
            />
          </TabsContent>
        )}

        <TabsContent value="analytics" className="mt-4">
          {zones.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Map className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">Sin zonas definidas</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {canEdit
                    ? "Define zonas en el editor para ver sus métricas."
                    : "El administrador todavía no definió zonas para esta tienda."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <ZoneAnalytics storeId={store.id} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
