import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetch, ApiError } from "@/lib/api";
import type { Employee, LeaveRequest } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { LeaveStatusBadge } from "@/components/LeaveStatusBadge";

export const Route = createFileRoute("/_authenticated/my-leave")({
  component: MyLeavePage,
});

function MyLeavePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [resolving, setResolving] = useState(true);
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [cancelling, setCancelling] = useState<LeaveRequest | null>(null);

  // Resolve employeeId from logged-in user
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setResolving(true);
    apiFetch<Employee>(`/employees/by-user/${user.id}`)
      .then((emp) => { if (!cancelled) setEmployeeId(emp.id); })
      .catch(async () => {
        // Fallback: search employees list for matching user id
        try {
          const list = await apiFetch<Employee[] | { data: Employee[] }>(`/employees?limit=1000`);
          const arr = Array.isArray(list) ? list : (list as { data: Employee[] }).data;
          const mine = arr?.find((e) => e.user?.id === user.id);
          if (!cancelled) {
            if (mine) setEmployeeId(mine.id);
            else toast.error("No employee record linked to your account");
          }
        } catch (err) {
          if (err instanceof ApiError) toast.error(err.message);
        }
      })
      .finally(() => { if (!cancelled) setResolving(false); });
    return () => { cancelled = true; };
  }, [user]);

  const load = async (eid: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<LeaveRequest[]>(`/leave/my?employeeId=${eid}`);
      setLeaves(Array.isArray(data) ? data : []);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (employeeId) load(employeeId); }, [employeeId]);

  const handleCancel = async () => {
    if (!cancelling) return;
    try {
      await apiFetch(`/leave/${cancelling.id}/cancel`, { method: "PATCH" });
      toast.success("Leave cancelled");
      setCancelling(null);
      if (employeeId) load(employeeId);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  if (resolving) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Leave</h1>
          <p className="text-muted-foreground">View and request time off</p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!employeeId}>
          <Plus className="mr-2 h-4 w-4" /> Apply Leave
        </Button>
      </div>

      <Card>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>
              )}
              {leaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-sm">{new Date(l.startDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-sm">{new Date(l.endDate).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-xs truncate" title={l.reason}>{l.reason}</TableCell>
                  <TableCell>
                    <LeaveStatusBadge status={l.status} />
                    {l.status === "REJECTED" && l.rejectionReason && (
                      <div className="text-xs text-muted-foreground mt-1">{l.rejectionReason}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === "PENDING" && (
                      <Button size="sm" variant="ghost" onClick={() => setCancelling(l)}>Cancel</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ApplyLeaveDialog
        open={open}
        onOpenChange={setOpen}
        employeeId={employeeId}
        onSaved={() => { setOpen(false); if (employeeId) load(employeeId); }}
      />

      <ConfirmDialog
        open={!!cancelling}
        onOpenChange={(v) => !v && setCancelling(null)}
        title="Cancel leave request?"
        description="This action cannot be undone."
        confirmLabel="Cancel Leave"
        onConfirm={handleCancel}
      />
    </div>
  );
}

function ApplyLeaveDialog({
  open, onOpenChange, employeeId, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employeeId: string | null;
  onSaved: () => void;
}) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setStartDate(""); setEndDate(""); setReason(""); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setSubmitting(true);
    try {
      await apiFetch("/leave", {
        method: "POST",
        body: JSON.stringify({ employeeId, startDate, endDate, reason }),
      });
      toast.success("Leave request submitted");
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
          <DialogTitle>Apply Leave</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}