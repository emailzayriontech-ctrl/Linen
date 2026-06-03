import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { today, fmtDate } from "@/lib/format";
import { Plus } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Field = {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "textarea" | "select" | "linen";
  options?: { value: string; label: string }[];
  required?: boolean;
};

export function CrudPage<TRow extends { id: string }>(props: {
  title: string;
  description?: string;
  table: "pantry_records" | "laundry_records" | "lost_records" | "breakage_records";
  fields: Field[];
  defaultValues: Record<string, unknown>;
  columns: { key: string; label: string; render?: (row: TRow) => React.ReactNode }[];
  selectQuery?: string;
}) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Record<string, unknown>>(props.defaultValues);

  const { data: items } = useQuery({
    queryKey: ["linen_items"],
    queryFn: async () => (await supabase.from("linen_items").select("*").order("item_name")).data ?? [],
  });

  const { data: rows } = useQuery({
    queryKey: [props.table],
    queryFn: async () => {
      const q = supabase.from(props.table).select(props.selectQuery ?? "*").order("created_at", { ascending: false }).limit(100);
      const { data } = await q;
      return (data ?? []) as unknown as TRow[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, created_by: user!.id };
      const { error } = await supabase.from(props.table).insert(payload as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Data tersimpan");
      qc.invalidateQueries({ queryKey: [props.table] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setOpen(false);
      setForm(props.defaultValues);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renderField = (f: Field) => {
    const v = form[f.key];
    if (f.type === "linen") {
      return (
        <Select value={(v as string) ?? ""} onValueChange={(val) => setForm({ ...form, [f.key]: val })}>
          <SelectTrigger><SelectValue placeholder="Pilih linen" /></SelectTrigger>
          <SelectContent>
            {items?.map((i) => <SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (f.type === "select") {
      return (
        <Select value={(v as string) ?? ""} onValueChange={(val) => setForm({ ...form, [f.key]: val })}>
          <SelectTrigger><SelectValue placeholder={`Pilih ${f.label}`} /></SelectTrigger>
          <SelectContent>
            {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (f.type === "textarea") {
      return <Textarea value={(v as string) ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} rows={2} />;
    }
    return (
      <Input
        type={f.type}
        value={(v as string | number) ?? ""}
        onChange={(e) => setForm({ ...form, [f.key]: f.type === "number" ? Number(e.target.value) : e.target.value })}
        required={f.required}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{props.title}</h2>
          {props.description && <p className="text-sm text-muted-foreground">{props.description}</p>}
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-1" />Tambah</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Tambah {props.title}</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              {props.fields.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  {renderField(f)}
                </div>
              ))}
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
                <TableRow>{props.columns.map((c) => <TableHead key={c.key}>{c.label}</TableHead>)}</TableRow>
              </TableHeader>
              <TableBody>
                {(rows ?? []).map((r) => (
                  <TableRow key={r.id}>
                    {props.columns.map((c) => (
                      <TableCell key={c.key}>
                        {c.render ? c.render(r) : String((r as unknown as Record<string, unknown>)[c.key] ?? "")}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {(rows ?? []).length === 0 && (
                  <TableRow><TableCell colSpan={props.columns.length} className="text-center text-muted-foreground py-6">Belum ada data.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const td = today;
export const fd = fmtDate;
