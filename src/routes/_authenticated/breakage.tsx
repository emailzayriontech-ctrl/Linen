import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, td, fd } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/breakage")({ component: BreakagePage });

type Row = {
  id: string; record_date: string; qty: number; damage_type: string;
  remark: string | null; linen_items?: { item_name: string };
};

function BreakagePage() {
  return (
    <CrudPage<Row>
      title="Breakage Tracking"
      description="Catat linen yang rusak."
      table="breakage_records"
      selectQuery="*, linen_items(item_name)"
      defaultValues={{ record_date: td(), linen_item_id: "", qty: 0, damage_type: "lainnya", remark: "" }}
      fields={[
        { key: "record_date", label: "Tanggal", type: "date", required: true },
        { key: "linen_item_id", label: "Jenis Linen", type: "linen", required: true },
        { key: "qty", label: "Qty", type: "number", required: true },
        {
          key: "damage_type", label: "Jenis Kerusakan", type: "select", required: true,
          options: [
            { value: "spot", label: "Spot" },
            { value: "sobek", label: "Sobek" },
            { value: "bolong", label: "Bolong" },
            { value: "luntur", label: "Luntur" },
            { value: "burn_mark", label: "Burn Mark" },
            { value: "lainnya", label: "Lainnya" },
          ],
        },
        { key: "remark", label: "Remark", type: "textarea" },
      ]}
      columns={[
        { key: "record_date", label: "Tanggal", render: (r) => fd(r.record_date) },
        { key: "linen", label: "Jenis", render: (r) => r.linen_items?.item_name ?? "-" },
        { key: "qty", label: "Qty" },
        { key: "damage_type", label: "Jenis Kerusakan" },
        { key: "remark", label: "Remark" },
      ]}
    />
  );
}
