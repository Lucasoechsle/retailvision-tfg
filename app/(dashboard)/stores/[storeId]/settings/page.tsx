import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configuración de Tienda" };

export default async function StoreSettingsPage({
  params,
}: {
  params: { storeId: string };
}) {
  const supabase = createClient();
  const { data: store } = await supabase
    .from("stores")
    .select("*")
    .eq("id", params.storeId)
    .single();

  if (!store) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          <div className="space-y-2">
            <p><strong className="text-foreground">Nombre:</strong> {store.name}</p>
            <p><strong className="text-foreground">Dirección:</strong> {store.address || "Sin dirección"}</p>
            <p><strong className="text-foreground">Horario:</strong> {store.opening_time} - {store.closing_time}</p>
            <p><strong className="text-foreground">Timezone:</strong> {store.timezone}</p>
            <p><strong className="text-foreground">ID:</strong> <code className="rounded bg-muted px-1">{store.id}</code></p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
