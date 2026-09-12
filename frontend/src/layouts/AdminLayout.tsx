import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bell,
  BookOpenCheck,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  FileText,
  History,
  Home,
  LogOut,
  Menu,
  Package,
  Settings as SettingsIcon,
  ShieldCheck,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/feedback/Toaster";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof Home;
  badge?: string;
}

interface NavGroup {
  section: string | null;
  items: NavItem[];
}

function navFor(base: "/owner" | "/staff", isOwner: boolean): NavGroup[] {
  const groups: NavGroup[] = [
    {
      section: null,
      items: [{ label: "Dashboard", to: `${base}/dashboard`, icon: Home }],
    },
    {
      section: "Operations",
      items: [
        { label: "Bookings", to: `${base}/bookings`, icon: ClipboardList },
        { label: "Payments", to: `${base}/payments`, icon: Wallet },
        { label: "Customers", to: `${base}/customers`, icon: Users },
        { label: "Technicians", to: `${base}/technicians`, icon: Wrench },
      ],
    },
    {
      section: "Workspace",
      items: [
        { label: "Inventory", to: `${base}/inventory`, icon: Package },
        { label: "Notifications", to: `${base}/notifications`, icon: Bell },
      ],
    },
  ];
  if (isOwner) {
    groups.push(
      {
        section: "Team",
        items: [
          { label: "Staff", to: `${base}/staff`, icon: ShieldCheck },
          { label: "Approvals", to: `${base}/approvals`, icon: BookOpenCheck },
        ],
      },
      {
        section: "Business",
        items: [
          { label: "Analytics", to: `${base}/analytics`, icon: BarChart3 },
          { label: "Reports", to: `${base}/reports`, icon: FileText },
        ],
      },
      {
        section: "System",
        items: [
          { label: "Payroll", to: `${base}/payroll`, icon: Wallet },
          { label: "Audit Logs", to: `${base}/audit-logs`, icon: History },
          { label: "Settings", to: `${base}/settings`, icon: SettingsIcon },
        ],
      },
    );
  } else {
    groups.push({
      section: "Business",
      items: [{ label: "Reports", to: `${base}/reports`, icon: FileText }],
    });
  }
  return groups;
}

const CRUMBS: Record<string, string> = {
  dashboard: "Dashboard",
  bookings: "Bookings",
  payments: "Payments",
  customers: "Customers",
  technicians: "Technicians",
  inventory: "Inventory",
  notifications: "Notifications",
  staff: "Staff",
  approvals: "Approvals",
  analytics: "Analytics",
  reports: "Reports",
  payroll: "Payroll",
  "audit-logs": "Audit Logs",
  settings: "Settings",
};

function Sidebar({ base, mobile }: { base: "/owner" | "/staff"; mobile?: boolean }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const location = useLocation();
  const isOwner = user?.role === "owner";
  const groups = navFor(base, isOwner);
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Office";

  return (
    <div
      className={cn(
        "flex h-full flex-col border-r border-gray-200 bg-white",
        mobile ? "w-[80%] max-w-[320px]" : collapsed ? "w-20" : "w-[280px]",
      )}
    >
      <div className="flex h-20 items-center gap-2 border-b border-gray-200 px-4">
        <img
          src="/assets/business/kjac-logo.png"
          alt=""
          aria-hidden="true"
          className="h-10 w-10 shrink-0 rounded-full"
        />
        {(!collapsed || mobile) && (
          <img
            src="/assets/business/kjac-brand-name.png"
            alt="KJAC"
            className="h-7 w-auto min-w-0"
          />
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label={isOwner ? "Owner" : "Staff"}>
        {groups.map((group) => (
          <div key={group.section ?? "top"} className="mb-2">
            {group.section && !collapsed && (
              <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                {group.section}
              </p>
            )}
            {group.items.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  aria-current={active ? "page" : undefined}
                  onClick={mobile ? () => setOpen(false) : undefined}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-semibold",
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-primary-600",
                  )}
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0" />
                  {(!collapsed || mobile) && item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-gray-200 p-3">
        {(!collapsed || mobile) && (
          <div className="mb-2 px-3">
            <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
            <div className="mt-1 flex items-center gap-1.5">
              <Badge variant={isOwner ? "default" : "secondary"}>
                {isOwner ? "Owner" : "Staff"}
              </Badge>
              {!isOwner && user?.position && (
                <span className="truncate text-xs text-gray-500">{user.position}</span>
              )}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            if (mobile) setOpen(false);
            void signOut().then(() => navigate("/admin/login", { replace: true }));
          }}
          className="flex min-h-[44px] w-full cursor-pointer items-center gap-2 rounded-lg px-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <LogOut size={18} />
          {(!collapsed || mobile) && "Sign out"}
        </button>
      </div>
    </div>
  );
}

function Breadcrumbs({ base }: { base: "/owner" | "/staff" }) {
  const { pathname } = useLocation();
  const seg = pathname.replace(base, "").split("/").filter(Boolean)[0] ?? "dashboard";
  const label = CRUMBS[seg] ?? seg;
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-sm sm:flex">
      <span className="truncate font-medium text-gray-400">{base === "/owner" ? "Owner" : "Staff"}</span>
      <ChevronRight size={14} aria-hidden="true" className="shrink-0 text-gray-300" />
      <span aria-current="page" className="truncate font-semibold text-gray-900">{label}</span>
    </nav>
  );
}

function ProfileMenu() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const isOwner = user?.role === "owner";
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Office user";
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full text-gray-500 outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-600"
      >
        <CircleUserRound size={22} aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            <span className="block truncate font-semibold text-gray-900">{name}</span>
            <span className="block truncate text-xs font-normal text-gray-500">{user?.email}</span>
            <span className="mt-1.5 flex items-center gap-1.5">
              <Badge variant={isOwner ? "default" : "secondary"}>
                {isOwner ? "Owner" : `Staff${user?.position ? ` · ${user.position}` : ""}`}
              </Badge>
            </span>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onSelect={() => {
              void signOut().then(() => navigate("/admin/login", { replace: true }));
            }}
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Role-aware office shell: sidebar-dominant, owner/staff menus + identity. */
export function AdminLayout({
  base,
  children,
}: {
  base: "/owner" | "/staff";
  children: React.ReactNode;
}) {
  const mobileOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileOpen = useUiStore((s) => s.setMobileNavOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className="sticky top-0 hidden h-screen shrink-0 md:block">
        <Sidebar base={base} />
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 animate-drawer-in">
            <Sidebar base={base} mobile />
          </div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-gray-200 bg-white px-4">
          <button
            type="button"
            onClick={() => (window.innerWidth < 768 ? setMobileOpen(true) : toggleSidebar())}
            aria-label="Toggle navigation"
            className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <Breadcrumbs base={base} />
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              aria-label="Notifications"
              className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            >
              <Bell size={20} />
            </button>
            <ProfileMenu />
          </div>
        </header>
        <main className="flex-1 p-4 sm:p-6" id="admin-content">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
