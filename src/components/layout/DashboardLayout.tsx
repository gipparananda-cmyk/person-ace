import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  Users,
  UserCog,
  UserCircle,
  LogOut,
  Building2,
  Menu,
  X,
  CalendarDays,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Role = "ADMIN" | "HR" | "EMPLOYEE";

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; roles: Role[] }[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["ADMIN", "HR", "EMPLOYEE"] },
  { to: "/users", label: "Users", icon: UserCog, roles: ["ADMIN"] },
  { to: "/employees", label: "Employees", icon: Users, roles: ["ADMIN", "HR"] },
  { to: "/my-leave", label: "My Leave", icon: CalendarDays, roles: ["EMPLOYEE"] },
  { to: "/leave-management", label: "Leave Management", icon: ClipboardList, roles: ["ADMIN", "HR"] },
  { to: "/profile", label: "Profile", icon: UserCircle, roles: ["ADMIN", "HR", "EMPLOYEE"] },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (!user) {
    navigate({ to: "/login" });
    return null;
  }

  const items = NAV.filter((i) => i.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/50 transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(false)}
      />

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r bg-card transition-transform duration-300 md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">EMS</div>
            <div className="text-xs text-muted-foreground">Dashboard</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <Button variant="ghost" className="w-full justify-start" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <div className="text-sm font-medium truncate max-w-[160px]">{user.email}</div>
              <div className="text-xs text-muted-foreground">{user.role}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
              {user.email[0]?.toUpperCase()}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}