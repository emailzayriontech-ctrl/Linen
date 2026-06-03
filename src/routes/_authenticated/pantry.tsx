import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, td, fd } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/pantry")({ component: PantryPage });

type Row = { id: string; record_date: string; qty: number; notes: string | null; linen_items?: { item_name: string } };

function PantryPage() {
  return (
    <CrudPage<Row>
      title="Pantry — Linen Bersih"
      description="Catat stok linen bersih yang tersedia untuk operasional."
      table="pantry_records"
      selectQuery="*, linen_items(item_name)"
      defaultValues={{ record_date: td(), linen_item_id: "", qty: 0, notes: "" }}
      fields={[
        { key: "record_date", label: "Tanggal", type: "date", required: true },
        { key: "linen_item_id", label: "Jenis Linen", type: "linen", required: true },
        { key: "qty", label: "Qty", type: "number", required: true },
        { key: "notes", label: "Catatan", type: "textarea" },
      ]}
      columns={[
        { key: "record_date", label: "Tanggal", render: (r) => fd(r.record_date) },
        { key: "linen", label: "Jenis", render: (r) => r.linen_items?.item_name ?? "-" },
        { key: "qty", label: "Qty" },
        { key: "notes", label: "Catatan" },
      ]}
    />
  );
}
