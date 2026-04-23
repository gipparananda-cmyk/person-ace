import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { LeaveStatus } from "@/lib/types";

const STYLES: Record<LeaveStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-200",
  APPROVED: "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900/40 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900/40 dark:text-red-200",
  CANCELLED: "bg-gray-200 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200",
};

export function LeaveStatusBadge({ status }: { status: LeaveStatus }) {
  return (
    <Badge variant="secondary" className={cn("border-transparent", STYLES[status])}>
      {status}
    </Badge>
  );
}