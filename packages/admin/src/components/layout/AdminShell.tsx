import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  Coins,
  CreditCard,
  FileText,
  Globe,
  Images,
  LayoutDashboard,
  Layers,
  LogOut,
  MapPin,
  Megaphone,
  Moon,
  Package,
  PanelTop,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Star,
  Sun,
  Truck,
  Users,
  Store,
  Warehouse,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { AccessProvider, useAccess } from "@/contexts/AccessContext";
import { collections, globals } from "@/lib/schema";
import type { NormCollection, NormGlobal } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Spinner } from "@/components/ui/spinner";

function useTheme() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle("dark", next);
    setDark(next);
  };
  return { dark, toggle };
}

type IconType = typeof LayoutDashboard;

const COLLECTION_ICONS: Record<string, IconType> = {
  users: Users,
  media: Images,
  pages: FileText,
  categories: Boxes,
  brands: Layers,
  products: Package,
  "product-variants": Layers,
  orders: ShoppingCart,
  "order-items": Receipt,
  "sub-orders": Receipt,
  carts: ShoppingBag,
  "wishlist-items": Star,
  "stock-locations": MapPin,
  "stock-levels": Warehouse,
  "shipping-zones": Truck,
  "shipping-methods": Truck,
  transactions: CreditCard,
  coupons: Coins,
  "product-reviews": Star,
  "vendor-reviews": Star,
  tenants: Store,
  "vendor-profiles": Store,
  "vendor-settings": Settings,
  "vendor-applications": FileText,
  "commission-rules": Coins,
  payouts: CreditCard,
  "payout-items": Receipt,
  "geo-countries": Globe,
  "geo-subdivisions": MapPin,
  "geo-localities": MapPin,
  "verification-codes": Megaphone,
  addresses: MapPin,
  attributes: Layers,
  classes: Layers,
  "order-status-history": Receipt,
  "stock-location-service-areas": MapPin,
};

const GLOBAL_ICONS: Record<string, IconType> = {
  header: PanelTop,
  footer: PanelTop,
  "platform-settings": Settings,
};

interface NavItem {
  title: string;
  to: string;
  icon: IconType;
  end?: boolean;
}

function NavLinks({ items }: { items: NavItem[] }) {
  const { pathname } = useLocation();
  return (
    <>
      {items.map((item) => {
        const active = item.end
          ? pathname === item.to
          : pathname.startsWith(item.to);
        return (
          <SidebarMenuItem key={item.to}>
            <SidebarMenuButton
              tooltip={item.title}
              isActive={active}
              render={<NavLink to={item.to} />}
            >
              <item.icon />
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </>
  );
}

function navForCollection(c: NormCollection): NavItem {
  return {
    title: c.label,
    to: `/collections/${c.slug}`,
    icon: COLLECTION_ICONS[c.slug] ?? Boxes,
  };
}

function navForGlobal(g: NormGlobal): NavItem {
  return {
    title: g.label,
    to: `/globals/${g.slug}`,
    icon: GLOBAL_ICONS[g.slug] ?? Settings,
  };
}

function SidebarBody() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();
  const { canReadCollection, loading } = useAccess();

  // Intersect generated schemas with what the live backend exposes to this user.
  const visibleCollections = useMemo(
    () => collections.filter((c) => canReadCollection(c.slug)),
    [canReadCollection],
  );
  const visibleGlobals = useMemo(
    () => globals.filter((g) => canReadCollection(g.slug)),
    [canReadCollection],
  );

  const groups = useMemo(() => {
    const map = new Map<string, NavItem[]>();
    for (const c of visibleCollections) {
      const key = c.group ?? "Collections";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(navForCollection(c));
    }
    for (const g of visibleGlobals) {
      const key = g.group ?? "Globals";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(navForGlobal(g));
    }
    return Array.from(map.entries());
  }, [visibleCollections, visibleGlobals]);

  const displayName =
    user?.displayName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    "Account";

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-1.5">
            <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              BS
            </div>
            <span className="text-sm font-semibold group-data-[collapsible=icon]:hidden">
              BS-Commerce
            </span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavLinks
                  items={[
                    {
                      title: "Dashboard",
                      to: "/",
                      icon: LayoutDashboard,
                      end: true,
                    },
                    { title: "Reports", to: "/reports", icon: BarChart3 },
                  ]}
                />
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {loading ? (
            <div className="flex justify-center py-6">
              <Spinner className="size-5" />
            </div>
          ) : (
            groups.map(([groupLabel, items]) => (
              <SidebarGroup key={groupLabel}>
                <SidebarGroupLabel>{groupLabel}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <NavLinks items={items} />
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))
          )}
        </SidebarContent>
        <SidebarFooter />
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">Admin</span>
          <div className="ml-auto flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              aria-label="Toggle theme"
            >
              {dark ? <Sun /> : <Moon />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button variant="ghost" className="px-2">
                    <span className="max-w-32 truncate text-sm">
                      {displayName}
                    </span>
                  </Button>
                }
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="truncate">
                  {user?.email || user?.username}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>
                  <LogOut />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:p-6">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

export function AdminShell() {
  return (
    <AccessProvider>
      <SidebarBody />
    </AccessProvider>
  );
}
