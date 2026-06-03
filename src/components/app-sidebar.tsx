import { useState, useEffect } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, BedDouble, Package, WashingMachine, AlertTriangle,
  Hammer, Scale, CalendarRange, Settings, LogOut, Sparkles, ShieldCheck, Check, Scan, ArrowLeftRight
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type Item = { title: string; url: string; icon: any; roles: AppRole[] };

const ALL_ROLES: AppRole[] = ["admin", "supervisor", "room_attendant", "laundry_attendant"];

const operations: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, roles: ALL_ROLES },
  { title: "Scan QR", url: "/qr-scanner", icon: Scan, roles: ["admin", "supervisor", "room_attendant"] },
  { title: "Room Check", url: "/room-check", icon: BedDouble, roles: ["admin", "supervisor", "room_attendant"] },
  { title: "Pantry", url: "/pantry", icon: Package, roles: ["admin", "supervisor", "room_attendant", "laundry_attendant"] },
  { title: "Laundry", url: "/laundry", icon: WashingMachine, roles: ["admin", "supervisor", "laundry_attendant"] },
  { title: "Pergerakan Linen", url: "/movement", icon: ArrowLeftRight, roles: ALL_ROLES },
  { title: "Lost", url: "/lost", icon: AlertTriangle, roles: ["admin", "supervisor", "laundry_attendant"] },
  { title: "Breakage", url: "/breakage", icon: Hammer, roles: ["admin", "supervisor", "laundry_attendant"] },
];

const supervision: Item[] = [
  { title: "Reconciliation", url: "/reconciliation", icon: Scale, roles: ["admin", "supervisor"] },
  { title: "Inventory Bulanan", url: "/inventory", icon: CalendarRange, roles: ["admin", "supervisor"] },
];

const adminItems: Item[] = [
  { title: "Master Data", url: "/master", icon: Settings, roles: ["admin"] },
];

function UpgradeDialog({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tier, setTier] = useState<"free" | "pro">("free");
  const [hideLovable, setHideLovable] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setTier((localStorage.getItem("subscription_tier") as "free" | "pro") || "free");
      setHideLovable(localStorage.getItem("hide_lovable") !== "false");
    }
  }, [open]);

  const handleUpgrade = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("subscription_tier", "pro");
      localStorage.setItem("hide_lovable", "true");
      setTier("pro");
      setHideLovable(true);
      window.dispatchEvent(new Event("subscription_updated"));
      toast.success("Upgrade Berhasil! Akun Anda kini menjadi PRO.");
      setOpen(false);
    }, 1500);
  };

  const handleCancel = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      localStorage.setItem("subscription_tier", "free");
      localStorage.setItem("hide_lovable", "false");
      setTier("free");
      setHideLovable(false);
      window.dispatchEvent(new Event("subscription_updated"));
      toast.success("Langganan diturunkan ke Free Plan.");
      setOpen(false);
    }, 1500);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {tier === "pro" ? (
          <Button variant="outline" size="sm" className="w-full justify-start text-amber-600 border-amber-500 bg-amber-500/10 hover:bg-amber-500/20 mb-2">
            <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
            {!collapsed && <span className="ml-2 truncate">PRO Plan (Aktif)</span>}
          </Button>
        ) : (
          <Button size="sm" className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium mb-2 justify-center">
            <Sparkles className="h-4 w-4 shrink-0" />
            {!collapsed && <span className="ml-2 truncate">Upgrade ke PRO</span>}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Linen-Track Pro Plan
          </DialogTitle>
          <DialogDescription>
            Buka seluruh potensi operasional linen hotel Anda tanpa batas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {tier === "pro" ? (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <h4 className="font-semibold text-emerald-600 dark:text-emerald-400">Langganan Anda Aktif!</h4>
              <p className="text-xs text-muted-foreground mt-1">Anda memiliki akses tak terbatas ke semua fitur premium.</p>
              
              <div className="mt-4 flex items-center justify-between p-3 rounded-md bg-background border text-sm">
                <span>Watermark Lovable</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    const nextVal = !hideLovable;
                    localStorage.setItem("hide_lovable", String(nextVal));
                    setHideLovable(nextVal);
                    window.dispatchEvent(new Event("subscription_updated"));
                    toast.success(nextVal ? "Watermark disembunyikan" : "Watermark ditampilkan");
                  }}
                >
                  {hideLovable ? "Sembunyikan" : "Tampilkan"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 border rounded-lg bg-amber-500/5 border-amber-500/20">
                <div className="flex justify-between items-baseline mb-2">
                  <span className="font-semibold text-sm">PRO Membership</span>
                  <span className="text-lg font-bold text-amber-600">Rp 499.000<span className="text-xs font-normal text-muted-foreground">/bln</span></span>
                </div>
                <p className="text-xs text-muted-foreground">Hapus watermark Lovable secara mandiri, simpan data tak terbatas, dan aktifkan fitur laporan penuh.</p>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Sembunyikan / Tampilkan watermark Lovable sesuka Anda</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Multi-user &amp; Kelola User tidak terbatas</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Koneksi Supabase langsung (Bypass offline mock)</span>
                </div>
                <div className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-emerald-500 mt-0.5" />
                  <span>Laporan Harian &amp; Bulanan Lapis Premium</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 mt-2">
          {tier === "pro" ? (
            <Button variant="ghost" className="w-full text-destructive hover:bg-destructive/10" onClick={handleCancel} disabled={loading}>
              {loading ? "Memproses..." : "Batalkan Langganan"}
            </Button>
          ) : (
            <Button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium hover:from-amber-600 hover:to-orange-700" onClick={handleUpgrade} disabled={loading}>
              {loading ? "Memproses Pembayaran..." : "Upgrade Sekarang"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const { hasRole, fullName, user, signOut } = useAuth();

  const [hotelName, setHotelName] = useState("Linen-Track");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setHotelName(localStorage.getItem("system_hotel_name") || "Linen-Track");
      const updateName = () => {
        setHotelName(localStorage.getItem("system_hotel_name") || "Linen-Track");
      };
      window.addEventListener("system_config_updated", updateName);
      return () => window.removeEventListener("system_config_updated", updateName);
    }
  }, []);

  const renderGroup = (label: string, items: Item[]) => {
    const visible = items.filter((i) => hasRole(...i.roles));
    if (visible.length === 0) return null;
    return (
      <SidebarGroup>
        <SidebarGroupLabel>{label}</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => {
              const active = pathname === item.url || pathname.startsWith(item.url + "/");
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={active}>
                    <Link to={item.url} className="flex items-center gap-2" target="_self">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">L</div>
          {!collapsed && (
            <div className="leading-tight min-w-0 flex-1">
              <div className="text-sm font-semibold truncate" title={hotelName}>{hotelName}</div>
              <div className="text-xs text-muted-foreground">Housekeeping Ops</div>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        {renderGroup("Operasional", operations)}
        {renderGroup("Supervisi", supervision)}
        {renderGroup("Administrasi", adminItems)}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2">
          {!collapsed && (
            <div className="mb-2 px-1">
              <div className="text-xs font-medium truncate">{fullName || user?.email}</div>
              <div className="text-[10px] text-muted-foreground truncate">{user?.email}</div>
            </div>
          )}
          <UpgradeDialog collapsed={collapsed} />
          <Button size="sm" variant="outline" className="w-full" onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            {!collapsed && <span className="ml-2">Sign out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
