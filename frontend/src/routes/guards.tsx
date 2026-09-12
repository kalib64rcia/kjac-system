import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth.store";

/** Public pages — everyone. */
export function PublicRoute() {
  return <Outlet />;
}

function AuthLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status">
      <p className="text-sm text-gray-500">Loading…</p>
    </div>
  );
}

/** Auth pages — bounce fully-verified office users to their panel home. */
export function GuestOnlyRoute() {
  const { user, ticket, twoFa, needsProfile, initialized } = useAuthStore();
  const location = useLocation();
  if (!initialized) return <AuthLoading />;
  if (user && ticket) {
    const home = user.role === "staff" ? "/staff/dashboard" : "/owner/dashboard";
    return <Navigate to={home} replace state={{ from: location }} />;
  }
  // Mid-flow users (2FA code or first-run profile) stay on login to finish.
  if ((twoFa || needsProfile) && location.pathname !== "/admin/login") {
    return <Navigate to="/admin/login" replace />;
  }
  return <Outlet />;
}

/** Admin pages — require a signed-in office user WITH a valid 2FA ticket. */
export function ProtectedAdminRoute() {
  const { user, ticket, initialized } = useAuthStore();
  const location = useLocation();
  if (!initialized) return <AuthLoading />;
  if (!user || (user.role !== "owner" && user.role !== "staff") || !ticket) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Owner panel — owner role + 2FA ticket. Staff are bounced to their panel. */
export function ProtectedOwnerRoute() {
  const { user, ticket, initialized } = useAuthStore();
  const location = useLocation();
  if (!initialized) return <AuthLoading />;
  if (!user || !ticket) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  if (user.role === "staff") {
    return <Navigate to="/staff/dashboard" replace />;
  }
  if (user.role !== "owner") {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}

/** Staff panel — any office role + 2FA ticket (owners may look in too). */
export function ProtectedStaffRoute() {
  const { user, ticket, initialized } = useAuthStore();
  const location = useLocation();
  if (!initialized) return <AuthLoading />;
  if (!user || !ticket) {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  if (user.role !== "owner" && user.role !== "staff") {
    return <Navigate to="/admin/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
