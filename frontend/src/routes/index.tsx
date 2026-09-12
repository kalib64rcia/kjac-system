import { Navigate, createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { OwnerDashboardPage, StaffDashboardPage } from "@/pages/office/Dashboards";
import { ModulePlaceholder } from "@/pages/office/ModulePlaceholder";
import { RefundsPage } from "@/pages/office/RefundsPage";
import { AuditPage } from "@/pages/owner/AuditPage";
import { ApprovalsPage, StaffPage } from "@/pages/owner/StaffPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { BookPage } from "@/pages/public/BookPage";
import { BookingSuccessPage } from "@/pages/public/BookingSuccessPage";
import { PrivacyPage, TermsPage, WarrantyPage } from "@/pages/public/LegalPages";
import { HomePage } from "@/pages/public/HomePage";
import { StaffAcceptPage } from "@/pages/public/StaffAcceptPage";
import { TrackPage } from "@/pages/public/TrackPage";
import {
  GuestOnlyRoute,
  ProtectedOwnerRoute,
  ProtectedStaffRoute,
  PublicRoute,
} from "./guards";

function PublicShell({ children }: { children: React.ReactNode }) {
  return <PublicLayout>{children}</PublicLayout>;
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <AuthLayout>{children}</AuthLayout>;
}

function OwnerShell({ children }: { children: React.ReactNode }) {
  return <AdminLayout base="/owner">{children}</AdminLayout>;
}

function StaffShell({ children }: { children: React.ReactNode }) {
  return <AdminLayout base="/staff">{children}</AdminLayout>;
}

const ownerRoutes = [
  { path: "dashboard", el: <OwnerDashboardPage /> },
  { path: "bookings", el: <ModulePlaceholder title="Bookings" hint="Dispatch board ships with the bookings module." /> },
  { path: "payments", el: <ModulePlaceholder title="Payments" hint="Verification queue ships with the payments module." /> },
  { path: "customers", el: <ModulePlaceholder title="Customers" /> },
  { path: "technicians", el: <ModulePlaceholder title="Technicians" /> },
  { path: "inventory", el: <ModulePlaceholder title="Inventory" /> },
  { path: "notifications", el: <ModulePlaceholder title="Notifications" /> },
  { path: "staff", el: <StaffPage /> },
  { path: "approvals", el: <ApprovalsPage /> },
  { path: "refunds", el: <RefundsPage /> },
  { path: "analytics", el: <ModulePlaceholder title="Analytics" /> },
  { path: "reports", el: <ModulePlaceholder title="Reports" /> },
  { path: "payroll", el: <ModulePlaceholder title="Payroll" hint="Owner-only salaries and payouts." /> },
  { path: "audit-logs", el: <AuditPage /> },
  { path: "settings", el: <ModulePlaceholder title="Settings" hint="Business rules, GCash numbers, backup contact." /> },
];

const staffRoutes = [
  { path: "dashboard", el: <StaffDashboardPage /> },
  { path: "bookings", el: <ModulePlaceholder title="Bookings" hint="Dispatch board ships with the bookings module." /> },
  { path: "payments", el: <ModulePlaceholder title="Payments" hint="Verification queue ships with the payments module." /> },
  { path: "refunds", el: <RefundsPage /> },
  { path: "customers", el: <ModulePlaceholder title="Customers" /> },
  { path: "technicians", el: <ModulePlaceholder title="Technicians" /> },
  { path: "inventory", el: <ModulePlaceholder title="Inventory" /> },
  { path: "notifications", el: <ModulePlaceholder title="Notifications" /> },
  { path: "reports", el: <ModulePlaceholder title="Reports" /> },
];

export const router = createBrowserRouter([
  {
    element: <PublicRoute />,
    children: [
      { path: "/", element: <PublicShell><HomePage /></PublicShell> },
      { path: "/book", element: <PublicShell><BookPage /></PublicShell> },
      { path: "/book/success", element: <PublicShell><BookingSuccessPage /></PublicShell> },
      { path: "/privacy", element: <PublicShell><PrivacyPage /></PublicShell> },
      { path: "/terms", element: <PublicShell><TermsPage /></PublicShell> },
      { path: "/warranty", element: <PublicShell><WarrantyPage /></PublicShell> },
      { path: "/track", element: <PublicShell><TrackPage /></PublicShell> },
      { path: "/staff/accept", element: <StaffAcceptPage /> },
    ],
  },
  {
    element: <GuestOnlyRoute />,
    children: [
      { path: "/admin/login", element: <AuthShell><LoginPage /></AuthShell> },
      {
        path: "/admin/forgot-password",
        element: <AuthShell><ForgotPasswordPage /></AuthShell>,
      },
      {
        path: "/admin/reset-password",
        element: <AuthShell><ResetPasswordPage /></AuthShell>,
      },
    ],
  },
  {
    element: <ProtectedOwnerRoute />,
    children: [
      { path: "/owner", element: <Navigate to="/owner/dashboard" replace /> },
      ...ownerRoutes.map((r) => ({
        path: `/owner/${r.path}`,
        element: <OwnerShell>{r.el}</OwnerShell>,
      })),
      // Back-compat: old single-admin URLs land on the owner panel.
      { path: "/admin", element: <Navigate to="/owner/dashboard" replace /> },
      { path: "/admin/dashboard", element: <Navigate to="/owner/dashboard" replace /> },
    ],
  },
  {
    element: <ProtectedStaffRoute />,
    children: [
      { path: "/staff", element: <Navigate to="/staff/dashboard" replace /> },
      ...staffRoutes.map((r) => ({
        path: `/staff/${r.path}`,
        element: <StaffShell>{r.el}</StaffShell>,
      })),
    ],
  },
  { path: "*", element: <PublicShell><NotFoundPage /></PublicShell> },
]);
