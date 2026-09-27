"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Evento que emite la pantalla de alertas al cambiar el estado de una alerta. */
export const ALERTS_CHANGED_EVENT = "alerts:changed";

const POLL_MS = 60_000;

/**
 * HU-12: campana del encabezado con las alertas activas. Consulta cada 60 segundos
 * y muestra una notificación en pantalla cuando se genera una alerta nueva.
 */
export function AlertBell() {
  const router = useRouter();
  const [count, setCount] = useState(0);
  // Id de la alerta más nueva ya vista; undefined hasta la primera consulta
  const newestSeen = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/alerts/active");
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setCount(data.count);

        const latest = data.latest;
        if (latest && newestSeen.current !== undefined && latest.id > newestSeen.current) {
          toast.warning(`Nueva alerta: ${latest.name}`, {
            description: latest.store,
            action: { label: "Ver", onClick: () => router.push("/alerts") },
          });
        }
        newestSeen.current = Math.max(newestSeen.current ?? 0, latest?.id ?? 0);
      } catch {
        // sin conexión: se reintenta en la próxima consulta
      }
    };

    poll();
    const interval = setInterval(poll, POLL_MS);
    window.addEventListener(ALERTS_CHANGED_EVENT, poll);
    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener(ALERTS_CHANGED_EVENT, poll);
    };
  }, [router]);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      aria-label={count > 0 ? `${count} alertas activas` : "Alertas"}
      onClick={() => router.push("/alerts")}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Button>
  );
}
