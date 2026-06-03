import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth, type AppRole } from "@/hooks/use-auth";
import { Navigate } from "@tanstack/react-router";
import { Trash2, QrCode, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { today } from "@/lib/format";
import { createUser, deleteUser } from "@/lib/users.functions";

export const Route = createFileRoute("/_authenticated/master")({ component: MasterPage });

const ROLES: AppRole[] = ["admin", "supervisor", "room_attendant", "laundry_attendant"];

function MasterPage() {
  const { hasRole } = useAuth();
  if (!hasRole("admin")) return <Navigate to="/dashboard" />;
  return (
    <Tabs defaultValue="rooms" className="w-full">
      <TabsList className="w-full flex justify-start overflow-x-auto whitespace-nowrap h-auto p-1 bg-muted/60 gap-1 select-none">
        <TabsTrigger value="rooms" className="text-xs md:text-sm shrink-0">Kamar</TabsTrigger>
        <TabsTrigger value="items" className="text-xs md:text-sm shrink-0">Linen Items</TabsTrigger>
        <TabsTrigger value="standards" className="text-xs md:text-sm shrink-0">Standar Linen</TabsTrigger>
        <TabsTrigger value="users" className="text-xs md:text-sm shrink-0">Users & Roles</TabsTrigger>
        <TabsTrigger value="qrcodes" className="text-xs md:text-sm shrink-0">QR Code Kamar</TabsTrigger>
        <TabsTrigger value="tasks" className="text-xs md:text-sm shrink-0">Penugasan Kerja</TabsTrigger>
        <TabsTrigger value="system" className="text-xs md:text-sm shrink-0">Kelola Sistem</TabsTrigger>
      </TabsList>
      <TabsContent value="rooms"><RoomsTab /></TabsContent>
      <TabsContent value="items"><ItemsTab /></TabsContent>
      <TabsContent value="standards"><StandardsTab /></TabsContent>
      <TabsContent value="users"><UsersTab /></TabsContent>
      <TabsContent value="qrcodes"><QrCodesTab /></TabsContent>
      <TabsContent value="tasks"><TaskAssignmentTab /></TabsContent>
      <TabsContent value="system"><SystemTab /></TabsContent>
    </Tabs>
  );
}

function RoomsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["rooms"], queryFn: async () => (await supabase.from("rooms").select("*").order("room_number")).data ?? [] });
  const [f, setF] = useState({ room_number: "", room_type: "Standard", bed_type: "" });
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("rooms").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Kamar ditambahkan"); qc.invalidateQueries({ queryKey: ["rooms"] }); setF({ room_number: "", room_type: "Standard", bed_type: "" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("rooms").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rooms"] }),
  });
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Kamar</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="No. Kamar" value={f.room_number} onChange={(e) => setF({ ...f, room_number: e.target.value })} />
          <Input placeholder="Tipe (Standard/Deluxe/Suite)" value={f.room_type} onChange={(e) => setF({ ...f, room_type: e.target.value })} />
          <Input placeholder="Bed Type" value={f.bed_type} onChange={(e) => setF({ ...f, bed_type: e.target.value })} />
          <Button onClick={() => add.mutate()} disabled={add.isPending}>Tambah</Button>
        </div>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>No.</TableHead><TableHead>Tipe</TableHead><TableHead>Bed</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.room_number}</TableCell><TableCell>{r.room_type}</TableCell><TableCell>{r.bed_type}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ItemsTab() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["linen_items"], queryFn: async () => (await supabase.from("linen_items").select("*").order("item_name")).data ?? [] });
  const [f, setF] = useState({ item_name: "", category: "linen", unit: "pcs" });
  const add = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("linen_items").insert(f); if (error) throw error; },
    onSuccess: () => { toast.success("Item ditambahkan"); qc.invalidateQueries({ queryKey: ["linen_items"] }); setF({ item_name: "", category: "linen", unit: "pcs" }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("linen_items").delete().eq("id", id); if (error) throw error; },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["linen_items"] }),
  });
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Linen Items</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Nama item" value={f.item_name} onChange={(e) => setF({ ...f, item_name: e.target.value })} />
          <Input placeholder="Kategori" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
          <Input placeholder="Unit" value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} />
          <Button onClick={() => add.mutate()} disabled={add.isPending}>Tambah</Button>
        </div>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>Item</TableHead><TableHead>Kategori</TableHead><TableHead>Unit</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.item_name}</TableCell><TableCell>{r.category}</TableCell><TableCell>{r.unit}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function StandardsTab() {
  const qc = useQueryClient();
  const { data: items } = useQuery({ queryKey: ["linen_items"], queryFn: async () => (await supabase.from("linen_items").select("*").order("item_name")).data ?? [] });
  const { data: stds } = useQuery({ queryKey: ["standards"], queryFn: async () => (await supabase.from("room_linen_standards").select("*, linen_items(item_name)").order("room_type")).data ?? [] });
  const [f, setF] = useState({ room_type: "Standard", linen_item_id: "", standard_qty: 0 });
  const upsert = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("room_linen_standards").upsert(f, { onConflict: "room_type,linen_item_id" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Standar disimpan"); qc.invalidateQueries({ queryKey: ["standards"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Standar Linen per Tipe Kamar</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <Input placeholder="Tipe Kamar" value={f.room_type} onChange={(e) => setF({ ...f, room_type: e.target.value })} />
          <Select value={f.linen_item_id} onValueChange={(v) => setF({ ...f, linen_item_id: v })}>
            <SelectTrigger><SelectValue placeholder="Pilih linen" /></SelectTrigger>
            <SelectContent>{items?.map((i) => <SelectItem key={i.id} value={i.id}>{i.item_name}</SelectItem>)}</SelectContent>
          </Select>
          <Input type="number" placeholder="Qty" value={f.standard_qty} onChange={(e) => setF({ ...f, standard_qty: Number(e.target.value) })} />
          <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>Simpan</Button>
        </div>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>Tipe</TableHead><TableHead>Item</TableHead><TableHead>Qty</TableHead></TableRow></TableHeader>
            <TableBody>
              {stds?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.room_type}</TableCell>
                  <TableCell>{(r as { linen_items?: { item_name: string } }).linen_items?.item_name}</TableCell>
                  <TableCell>{r.standard_qty}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function UsersTab() {
  const qc = useQueryClient();
  const create = useServerFn(createUser);
  const del = useServerFn(deleteUser);
  const { data: profiles } = useQuery({
    queryKey: ["all_profiles"],
    queryFn: async () => (await supabase.from("profiles").select("*").order("created_at")).data ?? [],
  });
  const { data: roles } = useQuery({
    queryKey: ["all_roles"],
    queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [],
  });
  const setRole = useMutation({
    mutationFn: async (v: { user_id: string; role: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", v.user_id);
      const { error } = await supabase.from("user_roles").insert({ user_id: v.user_id, role: v.role });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Role diperbarui"); qc.invalidateQueries({ queryKey: ["all_roles"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const [nf, setNf] = useState({ email: "", password: "", full_name: "", role: "room_attendant" as AppRole });
  const addUser = useMutation({
    mutationFn: async () => create({ data: nf }),
    onSuccess: () => {
      toast.success("User dibuat");
      setNf({ email: "", password: "", full_name: "", role: "room_attendant" });
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      qc.invalidateQueries({ queryKey: ["all_roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const removeUser = useMutation({
    mutationFn: async (user_id: string) => del({ data: { user_id } }),
    onSuccess: () => {
      toast.success("User dihapus");
      qc.invalidateQueries({ queryKey: ["all_profiles"] });
      qc.invalidateQueries({ queryKey: ["all_roles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Users & Roles</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Tambah User Baru</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div className="md:col-span-1">
              <Label className="text-xs">Nama</Label>
              <Input value={nf.full_name} onChange={(e) => setNf({ ...nf, full_name: e.target.value })} />
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Email</Label>
              <Input type="email" value={nf.email} onChange={(e) => setNf({ ...nf, email: e.target.value })} />
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Password</Label>
              <Input type="text" minLength={6} value={nf.password} onChange={(e) => setNf({ ...nf, password: e.target.value })} />
            </div>
            <div className="md:col-span-1">
              <Label className="text-xs">Role</Label>
              <Select value={nf.role} onValueChange={(v) => setNf({ ...nf, role: v as AppRole })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="md:col-span-1 flex items-end">
              <Button className="w-full" onClick={() => addUser.mutate()} disabled={addUser.isPending}>Buat User</Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Password minimal 6 karakter. Sampaikan ke user untuk diganti setelah login.</p>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader><TableRow><TableHead>Nama</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead></TableHead></TableRow></TableHeader>
            <TableBody>
              {profiles?.map((p) => {
                const role = roles?.find((r) => r.user_id === p.id)?.role ?? "room_attendant";
                return (
                  <TableRow key={p.id}>
                    <TableCell>{p.full_name || "-"}</TableCell>
                    <TableCell>{p.email}</TableCell>
                    <TableCell>
                      <Select value={role} onValueChange={(v) => setRole.mutate({ user_id: p.id, role: v as AppRole })}>
                        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                        <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { if (confirm("Hapus user ini?")) removeUser.mutate(p.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemTab() {
  const [hotelName, setHotelName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("system_hotel_name") || "Zayrion Hotel";
    }
    return "Zayrion Hotel";
  });

  const saveConfig = () => {
    localStorage.setItem("system_hotel_name", hotelName);
    window.dispatchEvent(new Event("system_config_updated"));
    toast.success("Konfigurasi sistem berhasil disimpan");
  };

  const handleReset = () => {
    if (confirm("PERINGATAN: Semua riwayat room check, laundry, pantry, lost & breakage akan dihapus secara permanen. Lanjutkan?")) {
      const keys = ["rooms", "linen_items", "room_linen_standards", "pantry_records", "laundry_records", "lost_records", "breakage_records", "room_checks", "room_check_items", "profiles", "user_roles", "inventory_monthly"];
      keys.forEach((k) => localStorage.removeItem(`db_${k}`));
      toast.success("Database berhasil di-reset ke data default");
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleBackup = () => {
    const backup: Record<string, any> = {};
    const keys = ["rooms", "linen_items", "room_linen_standards", "pantry_records", "laundry_records", "lost_records", "breakage_records", "room_checks", "room_check_items", "profiles", "user_roles", "inventory_monthly"];
    keys.forEach((k) => {
      const val = localStorage.getItem(`db_${k}`);
      if (val) backup[k] = JSON.parse(val);
    });
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-linentrack-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup data berhasil diunduh");
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.entries(data).forEach(([k, v]) => {
          localStorage.setItem(`db_${k}`, JSON.stringify(v));
        });
        toast.success("Data backup berhasil dipulihkan!");
        setTimeout(() => window.location.reload(), 1000);
      } catch (err) {
        toast.error("Gagal membaca file backup");
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Kelola Sistem &amp; Database</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2 max-w-md">
          <h3 className="text-sm font-medium">Konfigurasi Umum</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs">Nama Hotel</Label>
              <Input value={hotelName} onChange={(e) => setHotelName(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={saveConfig}>Simpan</Button>
            </div>
          </div>
        </div>

        <hr className="border-border" />

        <div className="space-y-3">
          <h3 className="text-sm font-medium text-destructive">Pemeliharaan &amp; Backup</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleBackup}>Unduh Backup Data (.json)</Button>
            
            <div className="relative">
              <Button variant="outline" asChild>
                <label className="cursor-pointer">
                  Pulihkan dari Backup
                  <input type="file" accept=".json" onChange={handleRestore} className="hidden" />
                </label>
              </Button>
            </div>

            <Button variant="destructive" onClick={handleReset}>Reset Database ke Default</Button>
          </div>
          <p className="text-xs text-muted-foreground">Unduh file cadangan secara rutin sebelum melakukan reset database.</p>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskAssignmentTab() {
  const qc = useQueryClient();
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: async () => (await supabase.from("rooms").select("*").order("room_number")).data ?? [] });
  const { data: profiles } = useQuery({ queryKey: ["all_profiles"], queryFn: async () => (await supabase.from("profiles").select("*")).data ?? [] });
  const { data: roles } = useQuery({ queryKey: ["all_roles"], queryFn: async () => (await supabase.from("user_roles").select("*")).data ?? [] });
  const { data: assignments } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => (await supabase.from("room_assignments").select("*, rooms(room_number, room_type), profiles(full_name, email)").order("created_at", { ascending: false })).data ?? [],
  });

  const attendants = profiles?.filter((p) => {
    const r = roles?.find((role) => role.user_id === p.id);
    return r?.role === "room_attendant" || r?.role === "admin";
  }) ?? [];

  const [f, setF] = useState({ user_id: "", room_id: "", assign_date: today() });

  const add = useMutation({
    mutationFn: async () => {
      if (!f.user_id || !f.room_id) throw new Error("Pilih petugas dan kamar");
      const { error } = await supabase.from("room_assignments").insert({ ...f, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tugas berhasil ditugaskan");
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setF({ user_id: "", room_id: "", assign_date: today() });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("room_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tugas berhasil dihapus");
      qc.invalidateQueries({ queryKey: ["assignments"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Penugasan Kerja Attendant</CardTitle>
        <p className="text-xs text-muted-foreground">Tugaskan area kamar kerja ke Room Attendant untuk hari ini.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
          <div>
            <Label className="text-xs">Petugas</Label>
            <Select value={f.user_id} onValueChange={(v) => setF({ ...f, user_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih petugas" /></SelectTrigger>
              <SelectContent>
                {attendants.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.full_name || a.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Kamar</Label>
            <Select value={f.room_id} onValueChange={(v) => setF({ ...f, room_id: v })}>
              <SelectTrigger><SelectValue placeholder="Pilih kamar" /></SelectTrigger>
              <SelectContent>
                {rooms?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>Kamar {r.room_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tanggal Tugas</Label>
            <Input type="date" value={f.assign_date} onChange={(e) => setF({ ...f, assign_date: e.target.value })} />
          </div>
          <Button onClick={() => add.mutate()} disabled={add.isPending}>Tugaskan</Button>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Petugas</TableHead>
                <TableHead>No. Kamar</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments?.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.profiles?.full_name || a.profiles?.email || "-"}</TableCell>
                  <TableCell>Kamar {a.rooms?.room_number}</TableCell>
                  <TableCell>{a.assign_date}</TableCell>
                  <TableCell>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full font-medium",
                      a.status === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                    )}>
                      {a.status === "completed" ? "Selesai" : "Pending"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => del.mutate(a.id)} disabled={del.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function QrCodesTab() {
  const qc = useQueryClient();
  const { data: rooms } = useQuery({ queryKey: ["rooms"], queryFn: async () => (await supabase.from("rooms").select("*").order("room_number")).data ?? [] });
  const { data: qrs } = useQuery({ queryKey: ["room_qr_codes"], queryFn: async () => (await supabase.from("room_qr_codes").select("*")).data ?? [] });

  const generateAll = useMutation({
    mutationFn: async () => {
      if (!rooms) return;
      const newQrs = rooms
        .filter((r) => !qrs?.some((q) => q.room_id === r.id))
        .map((r) => ({
          room_id: r.id,
          qr_code: `ROOM-${r.room_number}`,
        }));
      if (newQrs.length > 0) {
        const { error } = await supabase.from("room_qr_codes").insert(newQrs);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("QR Code untuk semua kamar berhasil dibuat");
      qc.invalidateQueries({ queryKey: ["room_qr_codes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const printQr = (roomNo: string, qrVal: string) => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html>
        <head>
          <title>Cetak QR Code Kamar ${roomNo}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 40px; }
            .card { border: 2px solid #333; border-radius: 12px; padding: 30px; display: inline-block; }
            .qr-mock { width: 200px; height: 200px; border: 4px solid #000; margin: 20px auto; background: repeating-conic-gradient(from 45deg, #000 0 25%, #fff 0 50%) 0 0/ 20px 20px; }
            h1 { margin: 0; font-size: 28px; }
            p { font-size: 18px; color: #555; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="card">
            <p>LINEN-TRACK SYSTEM</p>
            <div class="qr-mock"></div>
            <h1>KAMAR ${roomNo}</h1>
            <p>Code: ${qrVal}</p>
          </div>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <Card className="mt-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base">QR Code Kamar</CardTitle>
          <p className="text-xs text-muted-foreground">Kelola stiker QR Code unik per kamar untuk dipindai oleh Room Attendant.</p>
        </div>
        <Button onClick={() => generateAll.mutate()} disabled={generateAll.isPending}>
          Generate Semua QR
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No. Kamar</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Kode QR</TableHead>
                <TableHead>Visual QR</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms?.map((r) => {
                const qr = qrs?.find((q) => q.room_id === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-semibold">{r.room_number}</TableCell>
                    <TableCell>{r.room_type}</TableCell>
                    <TableCell>
                      {qr ? (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{qr.qr_code}</code>
                      ) : (
                        <span className="text-xs text-muted-foreground">Belum dibuat</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {qr ? (
                        <div className="h-8 w-8 border-2 border-foreground/30 p-0.5 rounded flex items-center justify-center bg-white">
                          <QrCode className="h-6 w-6 text-foreground" />
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {qr && (
                        <Button variant="outline" size="sm" onClick={() => printQr(r.room_number, qr.qr_code)}>
                          <Printer className="h-4 w-4 mr-1" /> Cetak QR
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
