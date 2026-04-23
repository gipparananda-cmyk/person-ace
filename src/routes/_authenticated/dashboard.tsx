import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCog, Building2, Briefcase, Loader2 } from "lucide-react";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { Employee, User, Department, Position } from "@/lib/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, hasRole } = useAuth();
  const [stats, setStats] = useState({ employees: 0, users: 0, departments: 0, positions: 0, active: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [deps, pos] = await Promise.all([
          apiFetch<Department[]>("/departments"),
          apiFetch<Position[]>("/positions"),
        ]);
        let employees: Employee[] = [];
        let users: User[] = [];
        if (hasRole(["ADMIN", "HR"])) employees = await apiFetch<Employee[]>("/employees");
        if (hasRole(["ADMIN"])) users = await apiFetch<User[]>("/users");
        setStats({
          employees: employees.length,
          users: users.length,
          departments: deps.length,
          positions: pos.length,
          active: employees.filter((e) => e.status === "ACTIVE").length,
        });
      } catch (err) {
        if (!(err instanceof ApiError && err.status === 401)) console.error(err);
      } finally {
        setLoading(false);
      }
    })();
  }, [hasRole]);

  const cards = [
    { label: "Active Employees", value: stats.active, icon: Users, show: hasRole(["ADMIN", "HR"]) },
    { label: "Total Employees", value: stats.employees, icon: Users, show: hasRole(["ADMIN", "HR"]) },
    { label: "Users", value: stats.users, icon: UserCog, show: hasRole(["ADMIN"]) },
    { label: "Departments", value: stats.departments, icon: Building2, show: true },
    { label: "Positions", value: stats.positions, icon: Briefcase, show: true },
  ].filter((c) => c.show);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground">Signed in as {user?.email} ({user?.role})</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{c.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}