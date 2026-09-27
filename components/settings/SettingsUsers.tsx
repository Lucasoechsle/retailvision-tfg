"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  isStoreScoped,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  ROLES,
  type Role,
} from "@/lib/auth/roles";
import type { OrganizationUser } from "@/lib/data/users";
import type { Store } from "@/types";

interface SettingsUsersProps {
  users: OrganizationUser[];
  stores: Store[];
  currentUserId: string;
}

/** Selector de perfil y, para el gerente de tienda, de las tiendas a su cargo. */
function RoleFields({
  role,
  onRoleChange,
  storeIds,
  onStoreIdsChange,
  stores,
}: {
  role: Role;
  onRoleChange: (role: Role) => void;
  storeIds: string[];
  onStoreIdsChange: (ids: string[]) => void;
  stores: Store[];
}) {
  const toggleStore = (id: string) =>
    onStoreIdsChange(storeIds.includes(id) ? storeIds.filter((s) => s !== id) : [...storeIds, id]);

  return (
    <>
      <div className="space-y-2">
        <Label>Perfil</Label>
        <Select value={role} onValueChange={(v) => onRoleChange(v as Role)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
      </div>
      {isStoreScoped(role) && stores.length > 0 && (
        <div className="space-y-2">
          <Label>Tiendas a cargo</Label>
          <div className="space-y-1.5 rounded-md border border-border p-3">
            {stores.map((store) => (
              <label key={store.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--primary))]"
                  checked={storeIds.includes(store.id)}
                  onChange={() => toggleStore(store.id)}
                />
                {store.name}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">Sin selección, ve todas las tiendas.</p>
        </div>
      )}
    </>
  );
}

export function SettingsUsers({ users: initialUsers, stores, currentUserId }: SettingsUsersProps) {
  const [users, setUsers] = useState(initialUsers);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("store_manager");
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState<OrganizationUser | null>(null);
  const [editRole, setEditRole] = useState<Role>("store_manager");
  const [editStoreIds, setEditStoreIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const storeNames = (ids: string[] | null) =>
    ids && ids.length > 0
      ? ids.map((id) => stores.find((s) => s.id === id)?.name).filter(Boolean).join(", ")
      : "Todas";

  const handleInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, full_name: name || undefined, store_ids: storeIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      setUsers((prev) => [...prev, data.user]);
      setInviteOpen(false);
      setEmail("");
      setName("");
      setRole("store_manager");
      setStoreIds([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (user: OrganizationUser) => {
    setEditing(user);
    setEditRole(user.role);
    setEditStoreIds(user.store_ids || []);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole, store_ids: editStoreIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success("Perfil actualizado");
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editing.id ? { ...u, role: data.user.role, store_ids: data.user.store_ids } : u
        )
      );
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>{users.length} miembros en la organización</CardDescription>
        </div>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Invitar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar Usuario</DialogTitle>
              <DialogDescription>
                Para ingresar, el usuario define su contraseña desde «¿Olvidaste tu contraseña?»
                en la pantalla de inicio de sesión.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Nombre (opcional)</Label>
                <Input
                  placeholder="Nombre completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <RoleFields
                role={role}
                onRoleChange={setRole}
                storeIds={storeIds}
                onStoreIdsChange={setStoreIds}
                stores={stores}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancelar</Button>
              <Button onClick={handleInvite} disabled={!email || loading}>
                {loading ? "Agregando..." : "Agregar usuario"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Perfil</TableHead>
              <TableHead>Tiendas</TableHead>
              <TableHead>Miembro desde</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell>
                  <p className="font-medium">{u.full_name || "Sin nombre"}</p>
                  {u.email && <p className="text-xs text-muted-foreground">{u.email}</p>}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{ROLE_LABELS[u.role]}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {isStoreScoped(u.role) ? storeNames(u.store_ids) : "Todas"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("es")}
                </TableCell>
                <TableCell>
                  {u.id !== currentUserId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={`Editar perfil de ${u.full_name || u.email}`}
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar perfil</DialogTitle>
              <DialogDescription>{editing?.full_name || editing?.email}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <RoleFields
                role={editRole}
                onRoleChange={setEditRole}
                storeIds={editStoreIds}
                onStoreIdsChange={setEditStoreIds}
                stores={stores}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
              <Button onClick={handleSaveEdit} disabled={saving}>
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
