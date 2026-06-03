import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, td, fd } from "@/components/crud-page";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/laundry")({ component: LaundryPage });

type Row = {
  id: string; record_date: string; qty_in: number; qty_out: number;
  notes: string | null; linen_items?: { item_name: string };
};

function LaundryPage() {
  return (
    <CrudPage<Row>
      title="Laundry"
      description="Catat linen masuk dan selesai laundry. Jika qty selesai < masuk, catat selisih sebagai Lost atau Breakage."
      table="laundry_records"
      selectQuery="*, linen_items(item_name)"
      defaultValues={{ record_date: td(), linen_item_id: "", qty_in: 0, qty_out: 0, notes: "" }}
      fields={[
        { key: "record_date", label: "Tanggal", type: "date", required: true },
        { key: "linen_item_id", label: "Jenis Linen", type: "linen", required: true },
        { key: "qty_in", label: "Qty Masuk", type: "number", required: true },
        { key: "qty_out", label: "Qty Selesai", type: "number" },
        { key: "notes", label: "Catatan", type: "textarea" },
      ]}
      columns={[
        { key: "record_date", label: "Tanggal", render: (r) => fd(r.record_date) },
        { key: "linen", label: "Jenis", render: (r) => r.linen_items?.item_name ?? "-" },
        { key: "qty_in", label: "Masuk" },
        { key: "qty_out", label: "Selesai" },
        {
          key: "selisih", label: "Selisih",
          render: (r) => {
            const d = (r.qty_in ?? 0) - (r.qty_out ?? 0);
            return d > 0
              ? <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">{d} pcs</Badge>
              : <Badge variant="outline" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">OK</Badge>;
          },
        },
        { key: "notes", label: "Catatan" },
      ]}
    />
  );
}
