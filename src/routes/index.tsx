import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/contexts/AuthContext";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    navigate({ to: isAuthenticated ? "/dashboard" : "/login" });
  }, [isAuthenticated, loading, navigate]);
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground">Loading…</div>
    </div>
  );
}
