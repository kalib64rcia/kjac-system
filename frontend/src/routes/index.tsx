import { Navigate, createBrowserRouter } from "react-router-dom";
import { AdminLayout } from "@/layouts/AdminLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { OwnerDashboardPage, StaffDashboardPage } from "@/pages/office/Dashboards";
import { AnalyticsPage } from "@/pages/office/AnalyticsPage";
import { BookingsPage } from "@/pages/office/BookingsPage";
import { CatalogPage } from "@/pages/office/CatalogPage";
import { CustomersPage } from "@/pages/office/CustomersPage";
import { InventoryPage } from "@/pages/office/InventoryPage";
import { NotificationsPage } from "@/pages/office/NotificationsPage";
import { PaymentsPage } from "@/pages/office/PaymentsPage";
import { PayrollPage } from "@/pages/office/PayrollPage";
import { RatingsPage } from "@/pages/office/RatingsPage";
import { ReportsPage } from "@/pages/office/ReportsPage";
import { SchedulePage } from "@/pages/office/SchedulePage";
import { SettingsPage } from "@/pages/office/SettingsPage";
import { TeamManagementPage } from "@/pages/office/TeamManagementPage";
import { ProfilePage } from "@/pages/office/ProfilePage";
import { RefundsPage } from "@/pages/office/RefundsPage";
import { AuditPage } from "@/pages/owner/AuditPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { BookPage } from "@/pages/public/BookPage";
import { BookingSuccessPage } from "@/pages/public/BookingSuccessPage";
import { PrivacyPage, TermsPage, WarrantyPage } from "@/pages/public/LegalPages";
import { HomePage } from "@/pages/public/HomePage";
import { StaffAcceptPage } from "@/pages/public/StaffAcceptPage";
import { TechAcceptPage } from "@/pages/public/TechAcceptPage";
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
  { path: "profile", el: <ProfilePage /> },
  { path: "bookings", el: <BookingsPage /> },
  { path: "schedule", el: <SchedulePage /> },
  { path: "payments", el: <PaymentsPage /> },
  { path: "customers", el: <CustomersPage /> },
  { path: "team", el: <TeamManagementPage /> },
  { path: "inventory", el: <InventoryPage /> },
  { path: "notifications", el: <NotificationsPage /> },
  { path: "refunds", el: <RefundsPage /> },
  { path: "catalog", el: <CatalogPage /> },
  { path: "ratings", el: <RatingsPage /> },
  { path: "analytics", el: <AnalyticsPage /> },
  { path: "reports", el: <ReportsPage /> },
  { path: "payroll", el: <PayrollPage /> },
  { path: "audit-logs", el: <AuditPage /> },
  { path: "settings", el: <SettingsPage /> },
];

const staffRoutes = [
  { path: "dashboard", el: <StaffDashboardPage /> },
  { path: "profile", el: <ProfilePage /> },
  { path: "bookings", el: <BookingsPage /> },
  { path: "schedule", el: <SchedulePage /> },
  { path: "payments", el: <PaymentsPage /> },
  { path: "refunds", el: <RefundsPage /> },
  { path: "customers", el: <CustomersPage /> },
  { path: "team", el: <TeamManagementPage /> },
  { path: "inventory", el: <InventoryPage /> },
  { path: "notifications", el: <NotificationsPage /> },
  { path: "catalog", el: <CatalogPage /> },
  { path: "ratings", el: <RatingsPage /> },
  { path: "reports", el: <ReportsPage /> },
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
      { path: "/technician/accept", element: <TechAcceptPage /> },
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
