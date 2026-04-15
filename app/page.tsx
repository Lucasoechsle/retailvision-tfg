import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Eye, BarChart3, Camera, Zap, Shield, Globe } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Eye className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">RetailVision</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Iniciar Sesión</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Comenzar Gratis</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Analytics inteligente para{" "}
            <span className="text-primary">retail físico</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Entiende el comportamiento de tus clientes con visión por computadora.
            Mide tráfico, dwell time, zonas calientes y conversión en tiempo real.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/register">Comenzar Gratis</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">Ver Demo</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-border bg-card py-24">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="text-center text-3xl font-bold">
            Todo lo que necesitas para optimizar tu tienda
          </h2>
          <div className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: Camera,
                title: "Visión por Computadora",
                description:
                  "Cámaras con IA detectan y trackean personas automáticamente. Sin datos biométricos, 100% anónimo.",
              },
              {
                icon: BarChart3,
                title: "Analytics de Zonas",
                description:
                  "Define zonas en tu plano y mide tráfico, dwell time y engagement por góndola, pasillo o área.",
              },
              {
                icon: Zap,
                title: "Tiempo Real",
                description:
                  "Dashboard live con alertas configurables. Sabe al instante si se acumula gente en caja.",
              },
              {
                icon: Globe,
                title: "Multi-Tienda",
                description:
                  "Compara rendimiento entre sucursales. Identifica best practices y replica lo que funciona.",
              },
              {
                icon: Shield,
                title: "Privacidad First",
                description:
                  "Solo procesamos metadata anónima. No almacenamos video ni imágenes de personas.",
              },
              {
                icon: Eye,
                title: "Heatmaps Visuales",
                description:
                  "Visualiza patrones de tráfico sobre el plano real de tu tienda. Por hora, día o semana.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-border bg-background p-6"
              >
                <feature.icon className="h-10 w-10 text-primary" />
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-7xl px-6 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} RetailVision. Todos los derechos reservados.
        </div>
      </footer>
    </div>
  );
}
