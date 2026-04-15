import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CameraCalibration } from "@/components/devices/CameraCalibration";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configurar Dispositivo" };

export default async function DeviceSetupPage({
  params,
}: {
  params: { storeId: string; deviceId: string };
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: device } = await supabase
    .from("devices")
    .select("id, name, store_id, status")
    .eq("id", params.deviceId)
    .eq("store_id", params.storeId)
    .single();

  if (!device) notFound();

  const { data: store } = await supabase
    .from("stores")
    .select("name")
    .eq("id", params.storeId)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Configurar: {device.name}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {store?.name} — Calibración de cámara, línea de conteo y zonas
        </p>
      </div>
      <CameraCalibration deviceId={device.id} storeId={params.storeId} />
    </div>
  );
}
