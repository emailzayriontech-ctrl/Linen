import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated")({ component: AuthLayout });

function AuthLayout() {
  const { loading } = useAuth();
  const pathname = useRouterState({ select: (r) => r.location.pathname });

  if (loading) return <div className="grid min-h-screen place-items-center text-muted-foreground">Memuat...</div>;

  const titleMap: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/room-check": "Room Check",
    "/pantry": "Pantry",
    "/laundry": "Laundry",
    "/movement": "Pergerakan Linen",
    "/lost": "Lost Tracking",
    "/breakage": "Breakage Tracking",
    "/reconciliation": "Rekonsiliasi",
    "/inventory": "Inventory Bulanan",
    "/master": "Master Data",
  };
  const title = Object.entries(titleMap).find(([k]) => pathname.startsWith(k))?.[1] ?? "Linen-Track";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-background px-3 sticky top-0 z-30">
            <SidebarTrigger />
            <h1 className="text-base font-semibold">{title}</h1>
          </header>
          <main className="flex-1 p-4 md:p-6"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}
