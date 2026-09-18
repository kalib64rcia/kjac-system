import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  BanknoteArrowDown,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronRight,
  ClipboardClock,
  FileText,
  HandCoins,
  History,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Menu,
  Package,
  Settings as SettingsIcon,
  CircleUser,
  Star,
  Users,
  Wallet,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth.store";
import { useUiStore } from "@/stores/ui.store";
import { useUnreadCount } from "@/hooks/useOffice";
import { getInitials } from "@/utils/format";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetCloseButton,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { ConfirmDialog } from "@/components/feedback/ConfirmDialog";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
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
      items: [{ label: "Dashboard", to: `${base}/dashboard`, icon: LayoutDashboard }],
    },
    {
      section: "Operations",
      items: [
        { label: "Bookings", to: `${base}/bookings`, icon: ClipboardClock },
        { label: "Schedule", to: `${base}/schedule`, icon: CalendarDays },
        { label: "Payments", to: `${base}/payments`, icon: Wallet },
        { label: "Refunds", to: `${base}/refunds`, icon: BanknoteArrowDown },
        { label: "Inventory", to: `${base}/inventory`, icon: Package },
        { label: "Customers", to: `${base}/customers`, icon: Users },
        { label: "Notifications", to: `${base}/notifications`, icon: Bell },
      ],
    },
    {
      section: "Team",
      items: [
        { label: "Team", to: `${base}/team`, icon: Users },
      ],
    },
  ];
  if (isOwner) {
    groups.push(
      {
        section: "Business",
        items: [
          { label: "Catalog", to: `${base}/catalog`, icon: LayoutGrid },
          { label: "Ratings", to: `${base}/ratings`, icon: Star },
          { label: "Analytics", to: `${base}/analytics`, icon: BarChart3 },
          { label: "Reports", to: `${base}/reports`, icon: FileText },
        ],
      },
      {
        section: "System",
        items: [
          { label: "Payroll", to: `${base}/payroll`, icon: HandCoins },
          { label: "Audit Logs", to: `${base}/audit-logs`, icon: History },
          { label: "Settings", to: `${base}/settings`, icon: SettingsIcon },
        ],
      },
    );
  } else {
    groups.push({
      section: "Business",
      items: [
        { label: "Catalog", to: `${base}/catalog`, icon: LayoutGrid },
        { label: "Ratings", to: `${base}/ratings`, icon: Star },
        { label: "Reports", to: `${base}/reports`, icon: FileText },
      ],
    });
  }
  return groups;
}

const CRUMBS: Record<string, string> = {
  dashboard: "Dashboard",
  profile: "My profile",
  bookings: "Bookings",
  schedule: "Schedule",
  payments: "Payments",
  customers: "Customers",
  team: "Team",
  refunds: "Refunds",
  inventory: "Inventory",
  notifications: "Notifications",
  catalog: "Catalog",
  ratings: "Ratings",
  analytics: "Analytics",
  reports: "Reports",
  payroll: "Payroll",
  "audit-logs": "Audit Logs",
  settings: "Settings",
};

function Sidebar({ base, mobile, onCloseDrawer }: {
  base: "/owner" | "/staff";
  mobile?: boolean;
  onCloseDrawer?: () => void;
}) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const setOpen = useUiStore((s) => s.setMobileNavOpen);
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmOut, setConfirmOut] = useState(false);
  const isOwner = user?.role === "owner";
  const groups = navFor(base, isOwner);
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || user?.email || "Office";
  // Icon-only collapsed desktop rail (mobile drawer always shows full labels).
  const rail = !mobile && collapsed;

  return (
      <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-white drop-shadow-md transition-[width] duration-200 ease-out motion-reduce:transition-none",
        // Drawer context: the Sheet owns w-86%/360 — fill it exactly once.
        mobile ? "w-full" : collapsed ? "w-[65px]" : "w-[280px]",
      )}
      >
        <div
          className={cn(
            "flex h-20 shrink-0 items-center border-b border-gray-200 shadow-sm transition-[padding,gap] duration-200 ease-out motion-reduce:transition-none",
            rail ? "justify-center gap-0 px-3" : "justify-start gap-2 px-3",
          )}
        >
          <a
            href={`${base}/dashboard`}
            aria-label="Go to dashboard"
            onClick={mobile ? () => setOpen(false) : undefined}
            className={cn(
              "flex min-w-0 cursor-pointer items-center rounded-md outline-none transition-[gap] duration-200 ease-out focus-visible:ring-2 focus-visible:ring-primary-600 motion-reduce:transition-none",
              rail ? "gap-0" : "gap-2",
            )}
          >
            <img
              src="/assets/business/kjac-logo.png"
              alt=""
              aria-hidden="true"
              className="h-10 w-10 shrink-0 rounded-full"
            />
            <span
              className={cn(
                "overflow-hidden transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none",
                rail ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
              )}
            >
              <img
                src="/assets/business/kjac-brand-name.png"
                alt="KJAC"
                aria-hidden={rail}
                className="h-7 w-auto max-w-[150px] shrink-0"
              />
            </span>
          </a>
          {onCloseDrawer && (
            <SheetCloseButton onClose={onCloseDrawer} />
          )}
        </div>
      <ScrollArea className="min-h-0 flex-1">
        <nav
          aria-label={isOwner ? "Owner" : "Staff"}
          className={cn(
            "transition-[padding] duration-200 ease-out motion-reduce:transition-none",
            // Rail: 12px left / 13px right feeds the 1px right border, so every
            // pill lands exactly 40px wide and dead-center (no odd-pixel drift).
            rail ? "py-3 pl-3 pr-[13px]" : "p-3",
          )}
        >
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
                  title={rail ? item.label : undefined}
                  onClick={mobile ? () => setOpen(false) : undefined}
                  className={cn(
                    "flex min-h-[44px] cursor-pointer items-center overflow-hidden rounded-lg px-[11px] text-sm font-semibold transition-[gap,padding] duration-200 ease-out motion-reduce:transition-none",
                    rail ? "gap-0" : "gap-2.5",
                    active
                      ? "bg-primary-50 text-primary-700"
                      : "text-gray-700 hover:bg-gray-50 hover:text-primary-600",
                  )}
                >
                  <Icon size={18} aria-hidden="true" className="shrink-0" />
                  <span
                    className={cn(
                      "whitespace-nowrap overflow-hidden transition-[max-width,opacity] duration-200 ease-out motion-reduce:transition-none",
                      rail ? "max-w-0 opacity-0" : "max-w-[200px] opacity-100",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        ))}
        </nav>
      </ScrollArea>
      <div
        className={cn(
          "border-t border-gray-200 transition-[padding] duration-200 ease-out motion-reduce:transition-none",
          // Rail: same 12/13 border compensation as the nav above.
          rail ? "py-3 pl-3 pr-[13px]" : "p-3",
        )}
      >
        {rail ? (
          <div className="flex flex-col items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(`${base}/profile`)}
              title="My profile"
              aria-label="Open my profile"
              className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-lg transition-colors hover:bg-gray-50"
            >
              <Avatar className="size-8">
                <AvatarFallback className="text-xs">
                  {getInitials(user?.first_name, user?.last_name, user?.email)}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate(`${base}/profile`)}
              aria-label="Open my profile"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-1 py-2 text-left transition-colors hover:bg-gray-50"
            >
              <Avatar className="size-8">
                <AvatarFallback>
                  {getInitials(user?.first_name, user?.last_name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{name}</span>
                <span className="block truncate text-xs text-gray-500">
                  {isOwner ? "Owner" : user?.position ? `Staff · ${user.position}` : "Staff"}
                </span>
              </span>
            </button>
            <button
              type="button"
              title="Log out"
              aria-label="Log out"
              onClick={() => setConfirmOut(true)}
              className="flex min-h-[44px] min-w-[44px] shrink-0 cursor-pointer items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-gray-100"
            >
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <ConfirmDialog
          spec={
            confirmOut
              ? {
                  title: "Log out?",
                  body: "You will be logged out of the office panel on this device. You can log back in anytime.",
                  confirmLabel: "Log out",
                  destructive: true,
                  icon: <LogOut size={20} aria-hidden="true" className="shrink-0 text-error-500" />,
                  onConfirm: async () => {
                    if (mobile) setOpen(false);
                    await signOut();
                    navigate("/admin/login", { replace: true });
                  },
                }
              : null
          }
          onClose={() => setConfirmOut(false)}
        />
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

function ProfileMenu({ base }: { base: "/owner" | "/staff" }) {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();
  const [confirmOut, setConfirmOut] = useState(false);
  const isOwner = user?.role === "owner";
  const name = [user?.first_name, user?.last_name].filter(Boolean).join(" ") || "Office user";
  const goSignOut = async () => {
    await signOut();
    navigate("/admin/login", { replace: true });
  };
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full outline-none hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-primary-600"
        >
          <Avatar className="size-9">
            <AvatarFallback>
              {getInitials(user?.first_name, user?.last_name, user?.email)}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <span className="block truncate font-semibold text-gray-900">{name}</span>
              <span className="block truncate text-xs font-normal text-gray-500">{user?.email}</span>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-gray-100" />
          <DropdownMenuGroup>
            <DropdownMenuItem onSelect={() => navigate(`${base}/profile`)}>
              <CircleUser size={16} aria-hidden="true" />
              My profile
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => navigate(`${base}/notifications`)}>
              <Bell size={16} aria-hidden="true" />
              Notifications
            </DropdownMenuItem>
            {isOwner && (
              <DropdownMenuItem onSelect={() => navigate(`${base}/settings`)}>
                <SettingsIcon size={16} aria-hidden="true" />
                Settings
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator className="bg-gray-100" />
          <DropdownMenuGroup>
            <DropdownMenuItem
              onSelect={() => setConfirmOut(true)}
              className="text-error-600 focus:bg-error-50 focus:text-error-700"
            >
              <LogOut size={16} aria-hidden="true" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        spec={
          confirmOut
            ? {
                title: "Log out?",
                body: "You will be logged out of the office panel on this device. You can log back in anytime.",
                confirmLabel: "Log out",
                destructive: true,
                icon: <LogOut size={20} aria-hidden="true" className="shrink-0 text-error-500" />,
                onConfirm: goSignOut,
              }
            : null
        }
        onClose={() => setConfirmOut(false)}
      />
    </>
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
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const unread = useUnreadCount(!!user);
  const unreadCount = unread.data?.unread_count ?? 0;
  return (
    <div className="flex h-dvh overflow-hidden bg-gray-50">
      <aside className="hidden h-full shrink-0 md:block">
        <Sidebar base={base} />
      </aside>
      {mobileOpen && (
        <Sheet open={mobileOpen} onOpenChange={(open) => { if (!open) setMobileOpen(false); }}>
          <SheetContent
            label={user?.role === "owner" ? "Owner menu" : "Staff menu"}
            onClose={() => setMobileOpen(false)}
            className="w-[280px] max-w-[280px] p-0"
          >
            <SheetTitle className="sr-only">
              {user?.role === "owner" ? "Owner menu" : "Staff menu"}
            </SheetTitle>
            <Sidebar base={base} mobile onCloseDrawer={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      )}
      <div className="flex min-w-0 min-h-0 flex-1 flex-col">
        <header className="z-30 flex h-20 shrink-0 items-center gap-2 border-b border-gray-200 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05),0_1px_2px_rgba(0,0,0,0.05)] px-4 sm:px-6">
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
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              onClick={() => navigate(`${base}/notifications`)}
              className="relative flex min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-md text-gray-500 hover:bg-gray-100"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span aria-hidden="true" className="absolute right-1 top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1 font-technical text-[11px] font-semibold tabular-nums text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>
            <ProfileMenu base={base} />
          </div>
        </header>
        <ScrollArea className="min-h-0 flex-1" viewportId="office-scroll">
          <main className="scroll-mt-4 overflow-x-clip p-4 contain-inline-size sm:p-6" id="admin-content">{children}</main>
        </ScrollArea>
      </div>
      <Toaster />
    </div>
  );
}
