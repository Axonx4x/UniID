import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const isStaff = useMemo(
    () => (user?.memberships ?? []).some((m) => ["verifier", "registry_admin", "platform_admin"].includes(m.role) && m.status === "active"),
    [user]
  );
  const memberships = useMemo(
    () => (user?.memberships ?? []).filter((membership) => membership.role === "student" && membership.status === "active"),
    [user]
  );

  // If staff/reviewer with no student role, navigate to reviewer console
  if (isStaff && !memberships.length) {
    return <Navigate to="/staff" replace />;
  }

  // A registered-but-unverified account can authenticate, but it must not get
  // the verified portal until the backend creates its student membership.
  if (!memberships.length) return <Navigate to="/pending" replace />;

  return <Navigate to="/student" replace />;
};

export default DashboardPage;
