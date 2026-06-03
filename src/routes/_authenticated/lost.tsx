import { createFileRoute } from "@tanstack/react-router";
import { CrudPage, td, fd } from "@/components/crud-page";

export const Route = createFileRoute("/_authenticated/lost")({ component: LostPage });

type Row = {
  id: string; record_date: string; qty: number; category: string;
  location: string | null; notes: string | null; petugas: string | null;
  linen_items?: { item_name: string };
};

function LostPage() {
  return (
    <CrudPage<Row>
      title="Lost Tracking"
      description="Catat linen yang hilang."
      table="lost_records"
      selectQuery="*, linen_items(item_name)"
      defaultValues={{ record_date: td(), linen_item_id: "", qty: 0, category: "unknown", location: "", notes: "", petugas: "" }}
      fields={[
        { key: "record_date", label: "Tanggal", type: "date", required: true },
        { key: "linen_item_id", label: "Jenis Linen", type: "linen", required: true },
        { key: "qty", label: "Qty", type: "number", required: true },
        {
          key: "category", label: "Kategori", type: "select", required: true,
          options: [
            { value: "guest_missing", label: "Guest Missing" },
            { value: "laundry_missing", label: "Laundry Missing" },
            { value: "room_missing", label: "Room Missing" },
            { value: "unknown", label: "Unknown" },
          ],
        },
        { key: "location", label: "Lokasi", type: "text" },
        { key: "petugas", label: "Petugas", type: "text" },
        { key: "notes", label: "Keterangan", type: "textarea" },
      ]}
      columns={[
        { key: "record_date", label: "Tanggal", render: (r) => fd(r.record_date) },
        { key: "linen", label: "Jenis", render: (r) => r.linen_items?.item_name ?? "-" },
        { key: "qty", label: "Qty" },
        { key: "category", label: "Kategori" },
        { key: "location", label: "Lokasi" },
        { key: "petugas", label: "Petugas" },
        { key: "notes", label: "Keterangan" },
      ]}
    />
  );
}
