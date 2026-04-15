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
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface User {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface SettingsUsersProps {
  users: User[];
  currentUserRole: string;
}

const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  manager: "Gerente",
  analyst: "Analista",
  viewer: "Visor",
};

export function SettingsUsers({ users: initialUsers, currentUserRole }: SettingsUsersProps) {
  const [users, setUsers] = useState(initialUsers);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("viewer");
  const [loading, setLoading] = useState(false);

  const canInvite = ["admin", "owner"].includes(currentUserRole);

  const handleInvite = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, full_name: name || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message);
      setUsers((prev) => [...prev, { id: data.user.id, full_name: name || email, role, created_at: new Date().toISOString() }]);
      setOpen(false);
      setEmail("");
      setName("");
      setRole("viewer");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>{users.length} miembros en la organización</CardDescription>
        </div>
        {canInvite && (
          <Dialog open={open} onOpenChange={setOpen}>
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
                  El usuario recibirá un email para configurar su contraseña.
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
                <div className="space-y-2">
                  <Label>Rol</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="manager">Gerente</SelectItem>
                      <SelectItem value="analyst">Analista</SelectItem>
                      <SelectItem value="viewer">Visor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleInvite} disabled={!email || loading}>
                  {loading ? "Enviando..." : "Enviar Invitación"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Miembro desde</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.full_name || "Sin nombre"}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="capitalize">
                    {roleLabels[u.role] || u.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString("es")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
