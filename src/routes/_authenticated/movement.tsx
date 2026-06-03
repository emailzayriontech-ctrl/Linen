import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { today, fmtDate } from "@/lib/format";
import { useAuth } from "@/hooks/use-auth";
import { ArrowRight, RefreshCw, Plus, History, Route as RouteIcon, MapPin } from "lucide-react";

export const Route = createFileRoute("/_authenticated/movement")({
  component: LinenMovementPage,
});

const LOCATIONS = ["Laundry", "Pantry", "Room", "Dirty Linen"];

const LOCATION_COLOR: Record<string, string> = {
  Laundry: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  Pantry: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  Room: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  "Dirty Linen": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
};

function LinenMovementPage() {
  const qc = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState({
    movement_date: today(),
    from_location: "",
    to_location: "",
    linen_item_id: "",
    qty: 1,
  });

  const { data: items } = useQuery({
    queryKey: ["linen_items"],
    queryFn: async () => (await supabase.from("linen_items").select("*").order("item_name")).data ?? [],
  });

  const { data: movements, isLoading } = useQuery({
    queryKey: ["linen_movements"],
    queryFn: async () => {
      const { data } = await supabase
        .from("linen_movements")
        .select("*, linen_items(item_name), profiles(full_name)")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const recordMovement = useMutation({
    mutationFn: async () => {
      if (!form.from_location || !form.to_location || !form.linen_item_id || !form.qty) {
        throw new Error("Mohon lengkapi semua field formulir!");
      }
      if (form.from_location === form.to_location) {
        throw new Error("Lokasi asal dan tujuan tidak boleh sama!");
      }
      if (form.qty <= 0) {
        throw new Error("Kuantitas harus lebih besar dari 0!");
      }

      const { error } = await supabase.from("linen_movements").insert({
        ...form,
        user_id: user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perpindahan linen berhasil dicatat!");
      qc.invalidateQueries({ queryKey: ["linen_movements"] });
      setForm({
        movement_date: today(),
        from_location: "",
        to_location: "",
        linen_item_id: "",
        qty: 1,
      });
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  // Calculate live counts per location based on movements
  const getLinenStats = () => {
    const stats: Record<string, number> = { Laundry: 150, Pantry: 280, Room: 340, "Dirty Linen": 45 };
    movements?.forEach((m: any) => {
      const q = Number(m.qty) || 0;
      if (stats[m.from_location] !== undefined) stats[m.from_location] -= q;
      if (stats[m.to_location] !== undefined) stats[m.to_location] += q;
    });
    return stats;
  };

  const stats = getLinenStats();

  return (
    <div className="space-y-6">
      {/* Realtime Movement Flow Visualizer */}
      <Card className="border-primary/20 bg-gradient-to-br from-background via-background to-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <RouteIcon className="h-5 w-5 text-primary" />
            Alur Perpindahan Linen Realtime
          </CardTitle>
          <CardDescription>
            Menampilkan estimasi sebaran posisi linen saat ini di setiap area operasional.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative pt-2">
            {/* Visual Steps */}
            {[
              { name: "Laundry", desc: "Pencucian & Setrika" },
              { name: "Pantry", desc: "Stok Bersih Siap Pakai" },
              { name: "Room", desc: "Linen Terpasang di Kamar" },
              { name: "Dirty Linen", desc: "Linen Kotor Terkumpul" },
            ].map((loc, idx) => (
              <div key={loc.name} className="relative p-4 border rounded-xl bg-background shadow-sm hover:shadow transition-all duration-300 flex flex-col justify-between items-center text-center group border-primary/10">
                <div className="space-y-1">
                  <Badge className={LOCATION_COLOR[loc.name]}>{loc.name}</Badge>
                  <p className="text-[10px] text-muted-foreground leading-snug">{loc.desc}</p>
                </div>
                <div className="mt-4 text-2xl font-bold tracking-tight text-primary">
                  {stats[loc.name]} <span className="text-xs text-muted-foreground font-normal">pcs</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/40 p-2.5 rounded-lg border border-border/50">
            <MapPin className="h-4 w-4 text-primary shrink-0" />
            <span>Alur Standar: <strong>Laundry</strong> &rarr; <strong>Pantry</strong> &rarr; <strong>Room</strong> &rarr; <strong>Dirty Linen</strong> &rarr; <strong>Laundry</strong></span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Form Input */}
        <Card className="md:col-span-1 border-primary/15">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-5 w-5 text-primary" />
              Catat Pergerakan
            </CardTitle>
            <CardDescription>Masukkan rincian perpindahan lokasi linen harian.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tanggal</Label>
              <Input type="date" value={form.movement_date} onChange={(e) => setForm({ ...form, movement_date: e.target.value })} />
            </div>

            <div className="space-y-1.5">
              <Label>Jenis Linen</Label>
              <Select value={form.linen_item_id} onValueChange={(v) => setForm({ ...form, linen_item_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih item linen" /></SelectTrigger>
                <SelectContent>
                  {items?.map((it) => (
                    <SelectItem key={it.id} value={it.id}>{it.item_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Lokasi Asal</Label>
              <Select value={form.from_location} onValueChange={(v) => setForm({ ...form, from_location: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih lokasi asal" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Lokasi Tujuan</Label>
              <Select value={form.to_location} onValueChange={(v) => setForm({ ...form, to_location: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih lokasi tujuan" /></SelectTrigger>
                <SelectContent>
                  {LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Kuantitas (Qty)</Label>
              <Input type="number" min={1} value={form.qty} onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })} />
            </div>

            <Button onClick={() => recordMovement.mutate()} disabled={recordMovement.isPending} className="w-full mt-2 bg-primary">
              <ArrowRight className="h-4 w-4 mr-1.5" /> Simpan Pergerakan
            </Button>
          </CardContent>
        </Card>

        {/* History Table */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Riwayat Perpindahan
            </CardTitle>
            <CardDescription>Catatan log mutasi sirkulasi linen terakhir.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Memuat riwayat...</p>
            ) : movements?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Belum ada catatan perpindahan linen.</p>
            ) : (
              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Item Linen</TableHead>
                      <TableHead>Asal</TableHead>
                      <TableHead></TableHead>
                      <TableHead>Tujuan</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Petugas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {movements?.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="whitespace-nowrap">{fmtDate(m.movement_date)}</TableCell>
                        <TableCell className="font-medium">{m.linen_items?.item_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline" className={LOCATION_COLOR[m.from_location]}>{m.from_location}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">&rarr;</TableCell>
                        <TableCell><Badge variant="outline" className={LOCATION_COLOR[m.to_location]}>{m.to_location}</Badge></TableCell>
                        <TableCell className="text-right font-semibold text-primary">{m.qty} pcs</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{m.profiles?.full_name || "Petugas"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
