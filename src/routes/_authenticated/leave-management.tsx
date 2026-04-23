import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { apiFetchPaginated, apiFetch, ApiError, type PaginationMeta } from "@/lib/api";
import type { LeaveRequest } from "@/lib/types";
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
import { Loader2, Search, Check, X } from "lucide-react";
import { toast } from "sonner";
import { LeaveStatusBadge } from "@/components/LeaveStatusBadge";

export const Route = createFileRoute("/_authenticated/leave-management")({
  component: LeaveManagementPage,
});

function LeaveManagementPage() {
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;
  const [meta, setMeta] = useState<PaginationMeta>({ page: 1, limit, total: 0, totalPages: 1 });
  const [rejecting, setRejecting] = useState<LeaveRequest | null>(null);

  useEffect(() => {
    if (!hasRole(["ADMIN", "HR"])) {
      toast.error("Access denied");
      navigate({ to: "/dashboard" });
    }
  }, [hasRole, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      const res = await apiFetchPaginated<LeaveRequest>(`/leave?${params}`);
      setLeaves(res.data);
      setMeta(res.meta);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setSearch(searchInput.trim()); }, 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const handleApprove = async (l: LeaveRequest) => {
    try {
      await apiFetch(`/leave/${l.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "APPROVED" }),
      });
      toast.success("Leave approved");
      load();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
        <p className="text-muted-foreground">Review and manage employee leave requests</p>
      </div>

      <Card>
        <div className="flex items-center gap-2 border-b p-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No leave requests</TableCell></TableRow>
              )}
              {leaves.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.employee?.fullName ?? "—"}</TableCell>
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
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleApprove(l)} title="Approve">
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setRejecting(l)} title="Reject">
                          <X className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t p-4 text-sm">
          <div className="text-muted-foreground">
            Page {meta.page} of {meta.totalPages} • {meta.total} total
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</Button>
            <Button size="sm" variant="outline" disabled={page >= meta.totalPages || loading} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      </Card>

      <RejectDialog
        leave={rejecting}
        onOpenChange={(v) => !v && setRejecting(null)}
        onSaved={() => { setRejecting(null); load(); }}
      />
    </div>
  );
}

function RejectDialog({
  leave, onOpenChange, onSaved,
}: {
  leave: LeaveRequest | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { if (leave) setReason(""); }, [leave]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leave) return;
    setSubmitting(true);
    try {
      await apiFetch(`/leave/${leave.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "REJECTED", rejectionReason: reason }),
      });
      toast.success("Leave rejected");
      onSaved();
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!leave} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Leave Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label>Rejection Reason</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} required />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}