"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Store as StoreIcon, Plus, Search, MapPin, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { Store } from "@/types";

interface StoresListProps {
  stores: Store[];
  userRole: string;
}

export function StoresList({ stores, userRole }: StoresListProps) {
  const [search, setSearch] = useState("");
  const canCreate = ["admin", "manager", "owner"].includes(userRole);

  const filtered = stores.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.address?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tiendas</h1>
          <p className="mt-1 text-muted-foreground">
            Gestiona tus puntos de venta
          </p>
        </div>
        {canCreate && (
          <Button asChild>
            <Link href="/stores/new">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Tienda
            </Link>
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar tiendas..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <StoreIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium">
              {stores.length === 0 ? "Sin tiendas" : "Sin resultados"}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {stores.length === 0
                ? "Crea tu primera tienda para comenzar."
                : "Intenta con otro término de búsqueda."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((store) => (
            <Link key={store.id} href={`/stores/${store.id}`}>
              <Card className="h-full transition-colors hover:bg-accent/50 cursor-pointer">
                <CardHeader className="flex flex-row items-start justify-between pb-3">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{store.name}</CardTitle>
                    {store.address && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {store.address}
                      </div>
                    )}
                  </div>
                  <Badge variant={store.is_active ? "default" : "secondary"}>
                    {store.is_active ? "Activa" : "Inactiva"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {store.opening_time} - {store.closing_time}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
