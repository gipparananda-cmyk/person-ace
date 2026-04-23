import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import type { Employee, EmployeeStatus, Department, Position, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";

export const Route = createFileRoute("/_authenticated/employees")({
  component: EmployeesPage,
});

function EmployeesPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [deleting, setDeleting] = useState<Employee | null>(null);

  useEffect(() => {
    if (!hasRole(["ADMIN", "HR"])) {
      toast.error("Access denied");
      navigate({ to: "/dashboard" });
    }
  }, [hasRole, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const [emps, deps, pos] = await Promise.all([
        apiFetch<Employee[]>("/employees"),
        apiFetch<Department[]>("/departments"),
        apiFetch<Position[]>("/positions"),
      ]);
      setEmployees(emps);
      setDepartments(deps);
      setPositions(pos);
      if (hasRole(["ADMIN"])) {
        try {
          const us = await apiFetch<User[]>("/users");
          setUsers(us);
        } catch { /* HR cannot list users */ }
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await apiFetch(`/employees/${deleting.id}`, { method: "DELETE" });
      toast.success("Employee deleted");
      setDeleting(null);
      load();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Employees</h1>
          <p className="text-muted-foreground">Manage employee records</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" /> New Employee
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Full Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No employees</TableCell></TableRow>
              )}
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-sm">{e.employeeId}</TableCell>
                  <TableCell className="font-medium">{e.fullName}</TableCell>
                  <TableCell>{e.department?.name ?? "—"}</TableCell>
                  <TableCell>{e.position?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm">{new Date(e.joinDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={e.status === "ACTIVE" ? "default" : "secondary"}>{e.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(e); setOpen(true); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleting(e)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <EmployeeFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        departments={departments}
        positions={positions}
        users={users}
        onSaved={() => { setOpen(false); load(); }}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="Delete employee?"
        description={`This will soft-delete ${deleting?.fullName}.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
      />
    </div>
  );
}

function EmployeeFormDialog({
  open, onOpenChange, editing, departments, positions, users, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Employee | null;
  departments: Department[];
  positions: Position[];
  users: User[];
  onSaved: () => void;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [positionId, setPositionId] = useState("");
  const [joinDate, setJoinDate] = useState("");
  const [status, setStatus] = useState<EmployeeStatus>("ACTIVE");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setEmployeeId(editing?.employeeId ?? "");
      setUserId(editing?.user?.id ?? "");
      setFullName(editing?.fullName ?? "");
      setDepartmentId(editing?.department?.id ?? "");
      setPositionId(editing?.position?.id ?? "");
      setJoinDate(editing?.joinDate ? editing.joinDate.slice(0, 10) : "");
      setStatus(editing?.status ?? "ACTIVE");
    }
  }, [open, editing]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editing) {
        await apiFetch(`/employees/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({ fullName, departmentId, positionId, joinDate, status }),
        });
        toast.success("Employee updated");
      } else {
        await apiFetch("/employees", {
          method: "POST",
          body: JSON.stringify({ employeeId, userId, fullName, departmentId, positionId, joinDate, status }),
        });
        toast.success("Employee created");
      }
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Employee" : "New Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Employee ID</Label>
              <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} required disabled={!!editing} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as EmployeeStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="RESIGNED">RESIGNED</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label>User</Label>
              {users.length > 0 ? (
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger><SelectValue placeholder="Select a user" /></SelectTrigger>
                  <SelectContent>
                    {users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.email} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="User UUID" required />
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={positionId} onValueChange={setPositionId}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {positions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Join Date</Label>
            <Input type="date" value={joinDate} onChange={(e) => setJoinDate(e.target.value)} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}