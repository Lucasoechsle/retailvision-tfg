import { CreateStoreForm } from "@/components/stores/CreateStoreForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Nueva Tienda",
};

export default function NewStorePage() {
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
