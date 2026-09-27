import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

interface AccessDeniedProps {
  role: Role;
}

/** Pantalla que se muestra cuando el perfil del usuario no tiene acceso a una sección. */
export function AccessDenied({ role }: AccessDeniedProps) {
  return (
    <div className="mx-auto max-w-lg pt-12">
      <Card>
        <CardContent className="py-12 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h1 className="mt-4 text-xl font-semibold">Acceso denegado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Tu perfil ({ROLE_LABELS[role]}) no tiene acceso a esta sección.
          </p>
          <Button asChild className="mt-6">
            <Link href="/dashboard">Volver al inicio</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
