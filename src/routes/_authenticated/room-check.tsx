import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { today, fmtDate } from "@/lib/format";
import { Plus, CheckCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

import { z } from "zod";

export const Route = createFileRoute("/_authenticated/room-check")({
  validateSearch: (search) => z.object({
    roomId: z.string().optional(),
  }).parse(search),
  component: RoomCheckPage,
});

type LinenStatus = "match" | "kurang" | "hilang" | "rusak" | "noda";
type LineItem = { linen_item_id: string; item_name: string; standard_qty: number; actual_qty: number; status: LinenStatus };

const STATUS_COLOR: Record<LinenStatus, string> = {
  match: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  kurang: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  hilang: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  rusak: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  noda: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
};

function RoomCheckPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const search = Route.useSearch();
  const targetRoomId = search.roomId;
  const [open, setOpen] = useState(false);

  const { data: rooms } = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => (await supabase.from("rooms").select("*").order("room_number")).data ?? [],
  });

  const { data: items } = useQuery({
    queryKey: ["linen_items"],
    queryFn: async () => (await supabase.from("linen_items").select("*").order("item_name")).data ?? [],
  });

  const { data: standards } = useQuery({
    queryKey: ["standards"],
    queryFn: async () => (await supabase.from("room_linen_standards").select("*")).data ?? [],
  });

  const { data: checks } = useQuery({
    queryKey: ["room_checks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("room_checks")
        .select("*, rooms(room_number, room_type), room_check_items(*, linen_items(item_name))")
        .order("created_at", { ascending: false })
        .limit(50);
      return data ?? [];
    },
  });

  const [form, setForm] = useState({
    room_id: "",
    check_date: today(),
    extra_bed: false,
    notes: "",
  });
  const [lines, setLines] = useState<LineItem[]>([]);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setStartTime(Date.now());
    } else {
      setStartTime(null);
    }
  }, [open]);

  useEffect(() => {
    if (targetRoomId && rooms && items && standards) {
      const selectedRoom = rooms.find((r) => r.id === targetRoomId);
      if (selectedRoom) {
        setForm((prev) => ({ ...prev, room_id: targetRoomId }));
        const newLines: LineItem[] = items.map((it) => {
          const std = standards.find((s) => s.room_type === selectedRoom.room_type && s.linen_item_id === it.id);
          let qty = std?.standard_qty ?? 0;
          if (form.extra_bed && (it.item_name === "Sprei" || it.item_name === "Pillow Case" || it.item_name === "Bath Towel")) {
            qty += 1;
          }
          return { linen_item_id: it.id, item_name: it.item_name, standard_qty: qty, actual_qty: qty, status: "match" };
        });
        setLines(newLines);
        setOpen(true);
      }
    }
  }, [targetRoomId, rooms, items, standards]);

  const room = rooms?.find((r) => r.id === form.room_id);

  const fillStandard = () => {
    if (!room || !items || !standards) {
      toast.error("Pilih kamar terlebih dahulu");
      return;
    }
    const newLines: LineItem[] = items.map((it) => {
      const std = standards.find((s) => s.room_type === room.room_type && s.linen_item_id === it.id);
      let qty = std?.standard_qty ?? 0;
      if (form.extra_bed && (it.item_name === "Sprei" || it.item_name === "Pillow Case" || it.item_name === "Bath Towel")) {
        qty += 1;
      }
      return { linen_item_id: it.id, item_name: it.item_name, standard_qty: qty, actual_qty: qty, status: "match" };
    });
    setLines(newLines);
    toast.success("Diisi sesuai standar");
  };

  const setLine = (i: number, patch: Partial<LineItem>) => {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!form.room_id) throw new Error("Pilih kamar");
      if (lines.length === 0) throw new Error("Tambahkan linen (klik 'Sesuai Standar')");

      // Double submit prevention
      const { data: existing } = await supabase
        .from("room_checks")
        .select("id")
        .eq("room_id", form.room_id)
        .eq("check_date", form.check_date);
      if (existing && existing.length > 0) {
        throw new Error("Kamar ini sudah diperiksa pada tanggal ini!");
      }

      const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0;
      const isAllStandard = lines.every((l) => l.status === "match" && l.actual_qty === l.standard_qty);
      const method = isAllStandard ? "standard" : "manual";
      const assignmentStatus = isAllStandard ? "completed_standard" : "completed";

      const { data: rc, error: e1 } = await supabase
        .from("room_checks")
        .insert({
          ...form,
          created_by: user!.id,
          inspection_method: method,
          inspection_duration: duration,
        })
        .select()
        .single();
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("room_check_items").insert(
        lines.map((l) => ({
          room_check_id: rc.id,
          linen_item_id: l.linen_item_id,
          actual_qty: l.actual_qty,
          standard_qty: l.standard_qty,
          status: l.status,
        })),
      );
      if (e2) throw e2;
      
      // Update room assignment status
      await supabase
        .from("room_assignments")
        .update({ status: assignmentStatus })
        .eq("room_id", form.room_id)
        .eq("assign_date", form.check_date);
    },
    onSuccess: () => {
      toast.success("Room check tersimpan");
      qc.invalidateQueries({ queryKey: ["room_checks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm({ room_id: "", check_date: today(), extra_bed: false, notes: "" });
      setLines([]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const undoMutation = useMutation({
    mutationFn: async (check: any) => {
      const { error: e1 } = await supabase.from("room_checks").delete().eq("id", check.id);
      if (e1) throw e1;
      await supabase
        .from("room_assignments")
        .update({ status: "pending" })
        .eq("room_id", check.room_id)
        .eq("assign_date", check.check_date);
    },
    onSuccess: () => {
      toast.success("Room check dibatalkan (Undo)");
      qc.invalidateQueries({ queryKey: ["room_checks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canUndo = (createdAtStr: string) => {
    const diffMs = Date.now() - new Date(createdAtStr).getTime();
    const diffMins = diffMs / 1000 / 60;
    return diffMins < 5;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Daftar Room Check</h2>
          <p className="text-sm text-muted-foreground">50 catatan terbaru.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Room Check Baru</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Form Room Check</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Tanggal</Label>
                  <Input type="date" value={form.check_date} onChange={(e) => setForm({ ...form, check_date: e.target.value })} />
                </div>
                <div>
                  <Label>Kamar</Label>
                  <Select value={form.room_id} onValueChange={(v) => setForm({ ...form, room_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pilih kamar" /></SelectTrigger>
                    <SelectContent>
                      {rooms?.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.room_number} — {r.room_type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.extra_bed} onCheckedChange={(v) => {
                  setForm({ ...form, extra_bed: v });
                  if (lines.length > 0 && room && items && standards) {
                    setLines((prev) => prev.map((l) => {
                      const it = items.find((item) => item.id === l.linen_item_id);
                      const std = standards.find((s) => s.room_type === room.room_type && s.linen_item_id === l.linen_item_id);
                      let qty = std?.standard_qty ?? 0;
                      if (v && it && (it.item_name === "Sprei" || it.item_name === "Pillow Case" || it.item_name === "Bath Towel")) {
                        qty += 1;
                      }
                      return { ...l, standard_qty: qty, actual_qty: qty, status: "match" };
                    }));
                  }
                }} />
                <Label>Extra Bed</Label>
              </div>
              <div>
                <Label>Catatan</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
              </div>

              <div className="flex items-center justify-between pt-2">
                <h3 className="font-medium">Daftar Linen</h3>
                <Button type="button" variant="outline" size="sm" onClick={fillStandard}>
                  <CheckCheck className="h-4 w-4 mr-1" />Sesuai Standar
                </Button>
              </div>
              {lines.length === 0 ? (
                <p className="text-sm text-muted-foreground">Klik "Sesuai Standar" untuk mengisi otomatis berdasarkan tipe kamar.</p>
              ) : (
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-20">Std</TableHead>
                        <TableHead className="w-24">Actual</TableHead>
                        <TableHead className="w-36">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l, i) => (
                        <TableRow key={l.linen_item_id}>
                          <TableCell>{l.item_name}</TableCell>
                          <TableCell>{l.standard_qty}</TableCell>
                          <TableCell>
                            <Input type="number" min={0} value={l.actual_qty}
                              onChange={(e) => setLine(i, { actual_qty: Number(e.target.value), status: Number(e.target.value) < l.standard_qty ? "kurang" : "match" })} />
                          </TableCell>
                          <TableCell>
                            <Select value={l.status} onValueChange={(v) => setLine(i, { status: v as LinenStatus })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(["match","kurang","hilang","rusak","noda"] as LinenStatus[]).map((s) => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={() => save.mutate()} disabled={save.isPending}>Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Riwayat</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Kamar</TableHead>
                  <TableHead>Tipe</TableHead>
                  <TableHead>Extra Bed</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Catatan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(checks ?? []).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="whitespace-nowrap">{fmtDate(c.check_date)}</TableCell>
                    <TableCell>{c.rooms?.room_number}</TableCell>
                    <TableCell>{c.rooms?.room_type}</TableCell>
                    <TableCell>{c.extra_bed ? "Ya" : "Tidak"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {c.room_check_items?.map((ci: { id: string; linen_items?: { item_name: string }; status: LinenStatus; actual_qty: number; standard_qty: number }) => (
                          <Badge key={ci.id} variant="outline" className={STATUS_COLOR[ci.status]}>
                            {ci.linen_items?.item_name}: {ci.actual_qty}/{ci.standard_qty}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">{c.notes}</TableCell>
                    <TableCell>
                      {canUndo(c.created_at) && (
                        <Button size="sm" variant="destructive" onClick={() => undoMutation.mutate(c)} disabled={undoMutation.isPending}>
                          Undo
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(checks ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Belum ada room check.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
