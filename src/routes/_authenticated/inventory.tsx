import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Download, Pencil } from "lucide-react";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { MONTHS } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/inventory")({ component: InventoryPage });

type InvRow = { id: string; linen_item_id: string; year: number; month: number; actual_qty: number; lost_qty: number; breakage_qty: number; remark: string | null };

function InventoryPage() {
  const qc = useQueryClient();
  const [year, setYear] = useState(new Date().getFullYear());
  const [editing, setEditing] = useState<{ item_id: string; item_name: string; month: number; row?: InvRow } | null>(null);
  const [form, setForm] = useState({ actual_qty: 0, lost_qty: 0, breakage_qty: 0, remark: "" });

  const { data: items } = useQuery({
    queryKey: ["linen_items"],
    queryFn: async () => (await supabase.from("linen_items").select("*").order("item_name")).data ?? [],
  });

  const { data: inv } = useQuery({
    queryKey: ["inv_monthly", year],
    queryFn: async () => (await supabase.from("inventory_monthly").select("*").eq("year", year)).data ?? [],
  });

  const findRow = (item_id: string, month: number) => inv?.find((r) => r.linen_item_id === item_id && r.month === month);

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const payload = { linen_item_id: editing.item_id, year, month: editing.month, ...form };
      if (editing.row) {
        const { error } = await supabase.from("inventory_monthly").update(payload).eq("id", editing.row.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("inventory_monthly").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Inventory tersimpan");
      qc.invalidateQueries({ queryKey: ["inv_monthly", year] });
      setEditing(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const openEdit = (item_id: string, item_name: string, month: number) => {
    const row = findRow(item_id, month);
    setEditing({ item_id, item_name, month, row });
    setForm(row ? { actual_qty: row.actual_qty, lost_qty: row.lost_qty, breakage_qty: row.breakage_qty, remark: row.remark ?? "" }
                : { actual_qty: 0, lost_qty: 0, breakage_qty: 0, remark: "" });
  };

  const exportExcel = async () => {
    if (!items || !inv) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet(`Inventory ${year}`);
    ws.addRow(["Item", "Qty Actual", ...MONTHS]).font = { bold: true };
    items.forEach((it) => {
      const total = inv.filter((r) => r.linen_item_id === it.id).reduce((a, b) => a + b.actual_qty, 0);
      const cells = MONTHS.map((_, mi) => {
        const r = findRow(it.id, mi + 1);
        return r ? `A:${r.actual_qty} L:${r.lost_qty} B:${r.breakage_qty}` : "";
      });
      ws.addRow([it.item_name, total, ...cells]);
    });
    ws.columns.forEach((c) => (c.width = 20));
    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url; a.download = `inventory-${year}.xlsx`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Inventory Bulanan</h2>
          <p className="text-sm text-muted-foreground">Klik sel bulan untuk edit Actual / Lost / Breakage / Remark.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Tahun</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[year - 1, year, year + 1].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => void exportExcel()}><Download className="h-4 w-4 mr-1" />Export</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Tabel Inventory {year}</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-background z-10">Item</TableHead>
                  {MONTHS.map((m) => <TableHead key={m} className="text-center min-w-[110px]">{m}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium sticky left-0 bg-background z-10">{it.item_name}</TableCell>
                    {MONTHS.map((_, mi) => {
                      const r = findRow(it.id, mi + 1);
                      return (
                        <TableCell key={mi} className="text-center align-top">
                          <button
                            type="button"
                            onClick={() => openEdit(it.id, it.item_name, mi + 1)}
                            className="w-full text-left rounded px-1 py-0.5 hover:bg-muted text-xs leading-tight"
                          >
                            {r ? (
                              <>
                                <div>A: <b>{r.actual_qty}</b></div>
                                <div className="text-destructive">L: {r.lost_qty}</div>
                                <div className="text-amber-600 dark:text-amber-400">B: {r.breakage_qty}</div>
                                {r.remark && <div className="text-muted-foreground truncate" title={r.remark}>{r.remark}</div>}
                              </>
                            ) : (
                              <span className="text-muted-foreground inline-flex items-center gap-1"><Pencil className="h-3 w-3" />—</span>
                            )}
                          </button>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing?.item_name} — {editing && MONTHS[editing.month - 1]} {year}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Actual Qty</Label><Input type="number" value={form.actual_qty} onChange={(e) => setForm({ ...form, actual_qty: Number(e.target.value) })} /></div>
            <div><Label>Lost</Label><Input type="number" value={form.lost_qty} onChange={(e) => setForm({ ...form, lost_qty: Number(e.target.value) })} /></div>
            <div><Label>Breakage</Label><Input type="number" value={form.breakage_qty} onChange={(e) => setForm({ ...form, breakage_qty: Number(e.target.value) })} /></div>
            <div className="col-span-2"><Label>Remark</Label><Textarea value={form.remark} onChange={(e) => setForm({ ...form, remark: e.target.value })} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
