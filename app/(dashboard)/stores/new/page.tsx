import { CreateStoreForm } from "@/components/stores/CreateStoreForm";
import { AccessDenied } from "@/components/shared/AccessDenied";
import { guardSection } from "@/lib/auth/guards";
import { can } from "@/lib/auth/roles";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva Tienda",
};

export default async function NewStorePage() {
  const guard = await guardSection("stores");
  if (guard.denied) return guard.denied;
  // HU-04: solo el administrador gestiona tiendas
  if (!can(guard.session.role, "manage_stores")) return <AccessDenied role={guard.session.role} />;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Nueva Tienda</h1>
        <p className="mt-1 text-muted-foreground">
          Agrega un nuevo punto de venta a tu organización
        </p>
      </div>
      <CreateStoreForm />
    </div>
  );
}
