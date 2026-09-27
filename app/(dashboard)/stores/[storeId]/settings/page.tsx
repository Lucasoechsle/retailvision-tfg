import { guardStoreModule } from "@/lib/auth/guards";
import { StoreSettingsForm } from "@/components/stores/StoreSettingsForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Configuración de Tienda" };

export default async function StoreSettingsPage({
  params,
}: {
  params: { storeId: string };
}) {
  const guard = await guardStoreModule(params.storeId, "settings");
  if (guard.denied) return guard.denied;
  const { store } = guard;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
        <p className="mt-1 text-muted-foreground">{store.name}</p>
      </div>

      <StoreSettingsForm store={store} />
    </div>
  );
}
