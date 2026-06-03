import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import ExcelJS from "exceljs";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/reconciliation")({ component: ReconPage });

type Row = {
  item: string;
  room: number;
  pantry: number;
  laundry: number;
  lost: number;
  breakage: number;
  total: number;
};

async function buildRows(): Promise<Row[]> {
  const [items, rci, pantry, laundry, lost, breakage] = await Promise.all([
    supabase.from("linen_items").select("*").order("item_name"),
    supabase.from("room_check_items").select("linen_item_id, actual_qty"),
    supabase.from("pantry_records").select("linen_item_id, qty"),
    supabase.from("laundry_records").select("linen_item_id, qty_in"),
    supabase.from("lost_records").select("linen_item_id, qty"),
    supabase.from("breakage_records").select("linen_item_id, qty"),
  ]);

  const sum = <T extends Record<string, unknown>>(arr: T[] | null, key: keyof T, byKey: keyof T) => {
    const m = new Map<string, number>();
    (arr ?? []).forEach((r) => {
      const k = r[byKey] as string;
      m.set(k, (m.get(k) ?? 0) + ((r[key] as number) ?? 0));
    });
    return m;
  };

  const room = sum(rci.data, "actual_qty", "linen_item_id");
  const pant = sum(pantry.data, "qty", "linen_item_id");
  const laun = sum(laundry.data, "qty_in", "linen_item_id");
  const los = sum(lost.data, "qty", "linen_item_id");
  const brk = sum(breakage.data, "qty", "linen_item_id");

  return (items.data ?? []).map((i) => {
    const r = room.get(i.id) ?? 0;
    const p = pant.get(i.id) ?? 0;
    const l = laun.get(i.id) ?? 0;
    const ls = los.get(i.id) ?? 0;
    const bk = brk.get(i.id) ?? 0;
    return { item: i.item_name, room: r, pantry: p, laundry: l, lost: ls, breakage: bk, total: r + p + l + ls + bk };
  });
}

function ReconPage() {
  const { data, isLoading } = useQuery({ queryKey: ["recon"], queryFn: buildRows });

  const exportExcel = async () => {
    if (!data) return;
    const wb = new ExcelJS.Workbook();
    const sheets = [
      { name: "Linen", filter: (r: Row) => true },
      { name: "Summary", filter: () => true },
    ];
    for (const s of sheets) {
      const ws = wb.addWorksheet(s.name);
      ws.addRow(["Item", "Room", "Pantry", "Laundry", "Lost", "Breakage", "Total Inventory"]);
      ws.getRow(1).font = { bold: true };
      data.filter(s.filter).forEach((r) => ws.addRow([r.item, r.room, r.pantry, r.laundry, r.lost, r.breakage, r.total]));
      ws.columns.forEach((c) => (c.width = 18));
    }
    // Lost & Breakage sheets
    const lostWs = wb.addWorksheet("Lost");
    lostWs.addRow(["Item", "Total Lost"]).font = { bold: true };
    data.forEach((r) => lostWs.addRow([r.item, r.lost]));
    const brkWs = wb.addWorksheet("Breakage");
    brkWs.addRow(["Item", "Total Breakage"]).font = { bold: true };
    data.forEach((r) => brkWs.addRow([r.item, r.breakage]));
    const towelWs = wb.addWorksheet("Towel");
    towelWs.addRow(["Item", "Room", "Pantry", "Laundry"]).font = { bold: true };
    data.filter((r) => /towel|mat/i.test(r.item)).forEach((r) => towelWs.addRow([r.item, r.room, r.pantry, r.laundry]));

    const buf = await wb.xlsx.writeBuffer();
    const url = URL.createObjectURL(new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `linen-reconciliation-${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading || !data) return <div className="text-muted-foreground">Memuat...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Rekonsiliasi Linen</h2>
          <p className="text-sm text-muted-foreground">Total = Room + Pantry + Laundry + Lost + Breakage. Baris merah = mismatch (perlu review).</p>
        </div>
        <Button onClick={() => void exportExcel()}><Download className="h-4 w-4 mr-1" />Export Excel</Button>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Total Inventory</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Room</TableHead>
                  <TableHead className="text-right">Pantry</TableHead>
                  <TableHead className="text-right">Laundry</TableHead>
                  <TableHead className="text-right">Lost</TableHead>
                  <TableHead className="text-right">Breakage</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((r) => {
                  const mismatch = r.lost > 0 || r.breakage > 0;
                  return (
                    <TableRow key={r.item} className={cn(mismatch && "bg-destructive/5")}>
                      <TableCell className="font-medium">{r.item}</TableCell>
                      <TableCell className="text-right">{r.room}</TableCell>
                      <TableCell className="text-right">{r.pantry}</TableCell>
                      <TableCell className="text-right">{r.laundry}</TableCell>
                      <TableCell className={cn("text-right", r.lost > 0 && "text-destructive font-medium")}>{r.lost}</TableCell>
                      <TableCell className={cn("text-right", r.breakage > 0 && "text-destructive font-medium")}>{r.breakage}</TableCell>
                      <TableCell className="text-right font-semibold">{r.total}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
