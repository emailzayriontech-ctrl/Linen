import { createFileRoute, ClientOnly, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  BedDouble, Package, WashingMachine, Scale, AlertTriangle, Hammer, TrendingUp, ClipboardCheck,
} from "lucide-react";
import { today, fmtDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend,
} from "recharts";
import type { ReactNode } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({ component: Dashboard });

type DayKey = string; // YYYY-MM-DD

function last7Days(): DayKey[] {
  const out: DayKey[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

import { useAuth } from "@/hooks/use-auth";

async function fetchDashboard(uid?: string) {
  const td = today();
  const days = last7Days();
  const from = days[0];

  const [
    rooms, items, checks, pantry, laundry, lost, breakage,
    laundry7, lost7, brk7, recentChecks,
    myAssignments, standards
  ] = await Promise.all([
    supabase.from("rooms").select("id", { count: "exact", head: true }),
    supabase.from("linen_items").select("id,item_name"),
    supabase.from("room_checks").select("id,room_id,created_at,created_by").eq("check_date", td),
    supabase.from("pantry_records").select("qty,linen_item_id").eq("record_date", td),
    supabase.from("laundry_records").select("qty_in,qty_out,linen_item_id").eq("record_date", td),
    supabase.from("lost_records").select("qty,linen_item_id").eq("record_date", td),
    supabase.from("breakage_records").select("qty,linen_item_id").eq("record_date", td),
    supabase.from("laundry_records").select("record_date,qty_in,qty_out").gte("record_date", from),
    supabase.from("lost_records").select("record_date,qty,linen_item_id").gte("record_date", from),
    supabase.from("breakage_records").select("record_date,qty,linen_item_id").gte("record_date", from),
    supabase
      .from("room_checks")
      .select("id,check_date,notes,room_id,rooms(room_number,room_type)")
      .order("created_at", { ascending: false })
      .limit(6),
    uid ? supabase.from("room_assignments").select("*, rooms(room_number, room_type)").eq("user_id", uid).eq("assign_date", td) : Promise.resolve({ data: [] }),
    supabase.from("room_linen_standards").select("*"),
  ]);

  const totalRooms = rooms.count ?? 0;
  const roomsChecked = new Set((checks.data ?? []).map((c) => c.room_id)).size;
  const pantryQty = (pantry.data ?? []).reduce((a, b) => a + (b.qty ?? 0), 0);
  const laundryIn = (laundry.data ?? []).reduce((a, b) => a + (b.qty_in ?? 0), 0);
  const laundryOut = (laundry.data ?? []).reduce((a, b) => a + (b.qty_out ?? 0), 0);
  const lostQty = (lost.data ?? []).reduce((a, b) => a + (b.qty ?? 0), 0);
  const breakageQty = (breakage.data ?? []).reduce((a, b) => a + (b.qty ?? 0), 0);
  const selisih = (laundry.data ?? []).reduce((a, b) => a + Math.abs((b.qty_in ?? 0) - (b.qty_out ?? 0)), 0);

  // 7-day trend
  const trend = days.map((d) => {
    const lIn = (laundry7.data ?? []).filter((r) => r.record_date === d).reduce((a, b) => a + (b.qty_in ?? 0), 0);
    const lOut = (laundry7.data ?? []).filter((r) => r.record_date === d).reduce((a, b) => a + (b.qty_out ?? 0), 0);
    const ls = (lost7.data ?? []).filter((r) => r.record_date === d).reduce((a, b) => a + (b.qty ?? 0), 0);
    const bk = (brk7.data ?? []).filter((r) => r.record_date === d).reduce((a, b) => a + (b.qty ?? 0), 0);
    return {
      date: d.slice(5),
      "Laundry Masuk": lIn,
      "Laundry Selesai": lOut,
      Lost: ls,
      Breakage: bk,
    };
  });

  // Top lost+breakage by item
  const itemName = new Map((items.data ?? []).map((i) => [i.id, i.item_name]));
  const lossMap = new Map<string, { item: string; lost: number; breakage: number }>();
  (lost7.data ?? []).forEach((r) => {
    const name = itemName.get(r.linen_item_id) ?? "Unknown";
    const cur = lossMap.get(name) ?? { item: name, lost: 0, breakage: 0 };
    cur.lost += r.qty ?? 0;
    lossMap.set(name, cur);
  });
  (brk7.data ?? []).forEach((r) => {
    const name = itemName.get(r.linen_item_id) ?? "Unknown";
    const cur = lossMap.get(name) ?? { item: name, lost: 0, breakage: 0 };
    cur.breakage += r.qty ?? 0;
    lossMap.set(name, cur);
  });
  const topLoss = Array.from(lossMap.values())
    .sort((a, b) => b.lost + b.breakage - (a.lost + a.breakage))
    .slice(0, 5);

  return {
    totalRooms, roomsChecked, pantryQty, laundryIn, laundryOut, lostQty, breakageQty, selisih,
    trend, topLoss, recentChecks: recentChecks.data ?? [],
    myAssignments: myAssignments.data ?? [],
    todayChecks: checks.data ?? [],
    standards: standards.data ?? [],
    items: items.data ?? [],
  };
}

function StatCard({
  title, value, hint, icon, danger, accent,
}: { title: string; value: ReactNode; hint?: string; icon: ReactNode; danger?: boolean; accent?: boolean }) {
  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      danger && "border-destructive/40 bg-destructive/5",
      accent && !danger && "border-primary/30 bg-primary/5",
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{title}</CardTitle>
        <div className={cn(
          "h-9 w-9 rounded-lg grid place-items-center",
          danger ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary",
        )}>
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className={cn("text-2xl font-bold tracking-tight", danger && "text-destructive")}>{value}</div>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function getActiveShiftText() {
  const hr = new Date().getHours();
  if (hr >= 6 && hr < 14) return "Pagi (Morning)";
  if (hr >= 14 && hr < 22) return "Sore (Evening)";
  return "Malam (Night)";
}

function Dashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", user?.id],
    queryFn: () => fetchDashboard(user?.id),
  });

  const undoMutation = useMutation({
    mutationFn: async (checkId: string) => {
      const check = data?.todayChecks?.find((c: any) => c.id === checkId);
      if (!check) return;
      const { error: e1 } = await supabase.from("room_checks").delete().eq("id", checkId);
      if (e1) throw e1;
      await supabase
        .from("room_assignments")
        .update({ status: "pending" })
        .eq("room_id", check.room_id)
        .eq("assign_date", today());
    },
    onSuccess: () => {
      toast.success("Inspeksi dibatalkan (Undo)");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const instantSubmit = useMutation({
    mutationFn: async ({ roomId, roomType }: { roomId: string; roomType: string }) => {
      const td = today();
      // Double submit prevention
      const { data: existing } = await supabase
        .from("room_checks")
        .select("id")
        .eq("room_id", roomId)
        .eq("check_date", td);
      if (existing && existing.length > 0) {
        throw new Error("Kamar ini sudah diperiksa pada tanggal ini!");
      }

      // 1. Create Room Check
      const { data: rc, error: e1 } = await supabase
        .from("room_checks")
        .insert({
          room_id: roomId,
          check_date: td,
          extra_bed: false,
          notes: "Auto Inspection - Standard Match",
          created_by: user!.id,
          inspection_method: "standard",
          inspection_duration: 5,
        })
        .select()
        .single();
      if (e1) throw e1;

      // 2. Create Room Check Items
      const lines = data.items.map((it: any) => {
        const std = data.standards.find((s: any) => s.room_type === roomType && s.linen_item_id === it.id);
        const qty = std?.standard_qty ?? 0;
        return {
          room_check_id: rc.id,
          linen_item_id: it.id,
          actual_qty: qty,
          standard_qty: qty,
          status: "match" as const,
        };
      });

      const { error: e2 } = await supabase.from("room_check_items").insert(lines);
      if (e2) throw e2;

      // 3. Update room assignment status
      await supabase
        .from("room_assignments")
        .update({ status: "completed_standard" })
        .eq("room_id", roomId)
        .eq("assign_date", td);
    },
    onSuccess: () => {
      toast.success("Inspeksi Instan Berhasil Disimpan!");
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) return <div className="text-muted-foreground">Memuat dashboard...</div>;

  const checkPct = data.totalRooms > 0 ? Math.round((data.roomsChecked / data.totalRooms) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Ringkasan Operasional</h2>
          <p className="text-sm text-muted-foreground">Snapshot status linen housekeeping &amp; laundry — {fmtDate(today())} · Shift Aktif: <span className="font-semibold text-foreground">{getActiveShiftText()}</span></p>
        </div>
        <Badge variant="outline" className="w-fit gap-1">
          <TrendingUp className="h-3 w-3" /> 7 hari terakhir
        </Badge>
      </div>

      {/* Tugas Kamar Saya Hari Ini (Jika ada assignment) */}
      {data.myAssignments && data.myAssignments.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ClipboardCheck className="h-5 w-5" /> Penugasan Area Kamar Saya Hari Ini
            </CardTitle>
            <CardDescription>
              Selesaikan checklist kamar yang ditugaskan kepada Anda hari ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data.myAssignments.map((a: any) => {
                const rCheck = data.todayChecks.find((c: any) => c.room_id === a.room_id);
                const isCompleted = a.status === "completed" || a.status === "completed_standard";
                const isRecentlyChecked = rCheck && (Date.now() - new Date(rCheck.created_at).getTime()) / 1000 / 60 < 5;

                return (
                  <div key={a.id} className="p-3 border rounded-lg bg-background flex flex-col gap-3 justify-between shadow-sm">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">Kamar {a.rooms?.room_number}</div>
                      <div className="text-xs text-muted-foreground">{a.rooms?.room_type}</div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 mt-1 sm:border-0 sm:pt-0 sm:mt-0">
                      {isCompleted ? (
                        <>
                          <Badge variant="outline" className={cn(
                            "border-emerald-200",
                            a.status === "completed_standard" ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-blue-100 text-blue-700 border-blue-200"
                          )}>
                            {a.status === "completed_standard" ? "Selesai (Standard)" : "Selesai (Manual)"}
                          </Badge>
                          {isRecentlyChecked && (
                            <Button size="sm" variant="destructive" className="h-7 px-2 text-[10px]" onClick={() => undoMutation.mutate(rCheck.id)} disabled={undoMutation.isPending}>
                              Undo
                            </Button>
                          )}
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs" asChild>
                              <Link to="/room-check" search={{ roomId: a.room_id }}>Mulai</Link>
                            </Button>
                            <Button size="sm" className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => instantSubmit.mutate({ roomId: a.room_id, roomType: a.rooms?.room_type })} disabled={instantSubmit.isPending}>
                              Instan
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Kamar Sudah Dicek"
          value={`${data.roomsChecked} / ${data.totalRooms}`}
          hint={`${checkPct}% kamar diperiksa hari ini`}
          icon={<BedDouble className="h-4 w-4" />}
          accent
        />
        <StatCard title="Linen Pantry" value={`${data.pantryQty} pcs`} hint="Stok bersih hari ini" icon={<Package className="h-4 w-4" />} />
        <StatCard
          title="Laundry Hari Ini"
          value={`${data.laundryIn} pcs`}
          hint={`${data.laundryOut} pcs sudah selesai`}
          icon={<WashingMachine className="h-4 w-4" />}
        />
        <StatCard
          title="Selisih Laundry"
          value={`${data.selisih} pcs`}
          hint="Selisih masuk vs selesai"
          icon={<Scale className="h-4 w-4" />}
          danger={data.selisih > 0}
        />
        <StatCard title="Lost Hari Ini" value={`${data.lostQty} pcs`} icon={<AlertTriangle className="h-4 w-4" />} danger={data.lostQty > 0} />
        <StatCard title="Breakage Hari Ini" value={`${data.breakageQty} pcs`} icon={<Hammer className="h-4 w-4" />} danger={data.breakageQty > 0} />
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Progress Room Check</CardTitle>
            <CardDescription>{data.roomsChecked} dari {data.totalRooms} kamar telah diperiksa</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Progress value={checkPct} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span><span className="font-medium text-foreground">{checkPct}%</span><span>100%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tren Laundry (7 hari)</CardTitle>
            <CardDescription>Volume linen masuk dan selesai laundry</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded-md bg-muted" />}>
                <ResponsiveContainer>
                  <AreaChart data={data.trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Area type="monotone" dataKey="Laundry Masuk" stroke="hsl(var(--primary))" fill="url(#gIn)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Laundry Selesai" stroke="hsl(var(--muted-foreground))" fill="url(#gOut)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lost &amp; Breakage (7 hari)</CardTitle>
            <CardDescription>Jumlah linen hilang dan rusak per hari</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ClientOnly fallback={<div className="h-full w-full animate-pulse rounded-md bg-muted" />}>
                <ResponsiveContainer>
                  <BarChart data={data.trend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="Lost" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Breakage" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ClientOnly>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Lost &amp; Breakage</CardTitle>
            <CardDescription>Item dengan kerugian tertinggi (7 hari)</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topLoss.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Tidak ada data kehilangan minggu ini 🎉</p>
            ) : (
              <ul className="space-y-3">
                {data.topLoss.map((r) => {
                  const total = r.lost + r.breakage;
                  const max = data.topLoss[0].lost + data.topLoss[0].breakage;
                  const pct = max > 0 ? (total / max) * 100 : 0;
                  return (
                    <li key={r.item} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{r.item}</span>
                        <span className="text-muted-foreground">
                          <span className="text-destructive font-medium">{r.lost}</span> lost · <span className="font-medium">{r.breakage}</span> rusak
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><ClipboardCheck className="h-4 w-4" /> Aktivitas Room Check Terbaru</CardTitle>
            <CardDescription>6 pengecekan kamar terakhir</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentChecks.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Belum ada pengecekan kamar.</p>
            ) : (
              <ul className="divide-y">
                {data.recentChecks.map((c: any) => (
                  <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        Kamar {c.rooms?.room_number ?? "—"}
                        <span className="ml-2 text-xs text-muted-foreground">{c.rooms?.room_type ?? ""}</span>
                      </div>
                      {c.notes && <div className="text-xs text-muted-foreground truncate">{c.notes}</div>}
                    </div>
                    <Badge variant="secondary" className="shrink-0">{fmtDate(c.check_date)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
