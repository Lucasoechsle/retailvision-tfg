import { guardSection } from "@/lib/auth/guards";
import { BenchmarkView } from "@/components/benchmark/BenchmarkView";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Benchmark" };

export default async function BenchmarkPage() {
  const guard = await guardSection("benchmark");
  if (guard.denied) return guard.denied;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Benchmark Multi-Sucursal</h1>
        <p className="mt-1 text-muted-foreground">
          Comparativa de rendimiento entre todas tus tiendas
        </p>
      </div>
      <BenchmarkView />
    </div>
  );
}
