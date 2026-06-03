import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Camera, QrCode, Scan, AlertCircle, ShieldAlert, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { today } from "@/lib/format";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/qr-scanner")({ component: QrScannerPage });

function QrScannerPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  
  const [selectedQr, setSelectedQr] = useState("");
  const [isScanning, setIsScanning] = useState(true);
  const [matchedRoom, setMatchedRoom] = useState<any>(null);
  const [assignedUserName, setAssignedUserName] = useState("Tidak ada penugasan");
  const [extraBed, setExtraBed] = useState(false);
  const [showOverridePrompt, setShowOverridePrompt] = useState(false);
  const [recentCheckId, setRecentCheckId] = useState<string | null>(null);
  const [submittedTime, setSubmittedTime] = useState<number | null>(null);

  const { data: qrCodes } = useQuery({
    queryKey: ["room_qr_codes"],
    queryFn: async () => (await supabase.from("room_qr_codes").select("*, rooms(room_number, room_type)")).data ?? [],
  });

  const { data: standards } = useQuery({
    queryKey: ["standards"],
    queryFn: async () => (await supabase.from("room_linen_standards").select("*")).data ?? [],
  });

  const { data: items } = useQuery({
    queryKey: ["linen_items"],
    queryFn: async () => (await supabase.from("linen_items").select("*")).data ?? [],
  });

  const handleSimulateScan = async (qrValue: string) => {
    if (!qrValue) return;
    setIsScanning(false);
    
    const qrMatch = qrCodes?.find((q) => q.qr_code === qrValue);
    if (!qrMatch) {
      toast.error("Kode QR tidak terdaftar untuk kamar mana pun.");
      setIsScanning(true);
      return;
    }

    toast.success(`QR Code terdeteksi: ${qrValue}`);
    const td = today();

    // Check assignment and fetch profiles
    const { data: assignments } = await supabase
      .from("room_assignments")
      .select("*, profiles(full_name)")
      .eq("room_id", qrMatch.room_id)
      .eq("assign_date", td);

    const hasAssignments = assignments && assignments.length > 0;
    const isAssignedToMe = assignments?.some((a: any) => a.user_id === user?.id);
    const assignedUser = assignments?.[0]?.profiles?.full_name || "Tidak ada penugasan";
    setAssignedUserName(assignedUser);

    if (hasAssignments && !isAssignedToMe) {
      setMatchedRoom(qrMatch);
      setShowOverridePrompt(true);
    } else {
      setMatchedRoom(qrMatch);
    }
  };

  const handleConfirmOverride = () => {
    setShowOverridePrompt(false);
    toast.success("Melanjutkan dengan Izin Supervisor");
  };

  const handleCancelOverride = () => {
    setShowOverridePrompt(false);
    setMatchedRoom(null);
    setIsScanning(true);
  };

  const instantSubmit = useMutation({
    mutationFn: async () => {
      if (!matchedRoom) return;
      const roomId = matchedRoom.room_id;
      const selectedRoom = matchedRoom.rooms;
      if (!selectedRoom || !items || !standards) throw new Error("Data kamar tidak lengkap");

      const td = today();

      // Double submit prevention
      const { data: existing } = await supabase
        .from("room_checks")
        .select("id")
        .eq("room_id", roomId)
        .eq("check_date", td);
      if (existing && existing.length > 0) {
        throw new Error("Kamar ini sudah diperiksa pada tanggal ini!");
      }

      // 1. Create Room Check
      const { data: rc, error: e1 } = await supabase
        .from("room_checks")
        .insert({
          room_id: roomId,
          check_date: td,
          extra_bed: extraBed,
          notes: "Auto Inspection - Standard Match",
          created_by: user!.id,
          inspection_method: "standard",
          inspection_duration: 5,
        })
        .select()
        .single();
      if (e1) throw e1;

      // 2. Create Room Check Items
      const lines = items.map((it: any) => {
        const std = standards.find((s) => s.room_type === selectedRoom.room_type && s.linen_item_id === it.id);
        let qty = std?.standard_qty ?? 0;
        if (extraBed && (it.item_name === "Sprei" || it.item_name === "Pillow Case" || it.item_name === "Bath Towel")) {
          qty += 1;
        }
        return {
          room_check_id: rc.id,
          linen_item_id: it.id,
          actual_qty: qty,
          standard_qty: qty,
          status: "match" as const,
        };
      });

      const { error: e2 } = await supabase.from("room_check_items").insert(lines);
      if (e2) throw e2;

      // 3. Update room assignment status
      await supabase
        .from("room_assignments")
        .update({ status: "completed_standard" })
        .eq("room_id", roomId)
        .eq("assign_date", td);

      return rc.id;
    },
    onSuccess: (checkId) => {
      toast.success("Inspeksi Instan Berhasil Disimpan!");
      qc.invalidateQueries({ queryKey: ["room_checks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setRecentCheckId(checkId || null);
      setSubmittedTime(Date.now());
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setIsScanning(true);
      setMatchedRoom(null);
    },
  });

  const undoMutation = useMutation({
    mutationFn: async (checkId: string) => {
      if (!checkId || !matchedRoom) return;
      const roomId = matchedRoom.room_id;
      const { error: e1 } = await supabase.from("room_checks").delete().eq("id", checkId);
      if (e1) throw e1;
      await supabase
        .from("room_assignments")
        .update({ status: "pending" })
        .eq("room_id", roomId)
        .eq("assign_date", today());
    },
    onSuccess: () => {
      toast.success("Inspeksi instan dibatalkan!");
      qc.invalidateQueries({ queryKey: ["room_checks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setRecentCheckId(null);
      setSubmittedTime(null);
      setMatchedRoom(null);
      setExtraBed(false);
      setIsScanning(true);
    },
    onError: (e: Error) => {
      toast.error(e.message);
    },
  });

  return (
    <div className="max-w-md mx-auto space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Scan className="h-5 w-5 text-primary" />
            Pindai QR Code Kamar
          </CardTitle>
          <CardDescription>
            Posisikan kode QR kamar di dalam area kotak bidik kamera untuk memulai inspeksi otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Simulated Scanner Viewport / Selection Screen */}
          <div className="relative aspect-square w-full rounded-xl bg-slate-950 overflow-hidden border-2 border-primary/20 flex flex-col items-center justify-center text-white p-6">
            {isScanning ? (
              <>
                {/* Laser scan line anim */}
                <div className="absolute inset-x-0 h-0.5 bg-red-500 shadow-[0_0_8px_#f43f5e] animate-bounce top-0 bottom-0 my-auto z-10" />
                
                {/* Square target box */}
                <div className="border-2 border-emerald-500 w-48 h-48 rounded-lg relative flex items-center justify-center bg-emerald-500/5">
                  <Camera className="h-10 w-10 text-emerald-500 opacity-60 animate-pulse" />
                  
                  {/* Corner marks */}
                  <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-emerald-500 -mt-0.5 -ml-0.5" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-emerald-500 -mt-0.5 -mr-0.5" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-emerald-500 -mb-0.5 -ml-0.5" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-emerald-500 -mb-0.5 -mr-0.5" />
                </div>
                <span className="text-xs text-muted-foreground mt-4 animate-pulse">Menunggu kode QR...</span>
              </>
            ) : recentCheckId ? (
              <div className="w-full text-center space-y-4">
                <div className="space-y-1 animate-in fade-in zoom-in-95 duration-200">
                  <div className="h-16 w-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-pulse">
                    <Check className="h-10 w-10" />
                  </div>
                  <h4 className="font-bold text-emerald-500 text-lg">Inspeksi Berhasil!</h4>
                  <p className="text-xs text-slate-300">Kamar {matchedRoom?.rooms?.room_number} selesai diperiksa.</p>
                </div>

                <div className="grid gap-2 w-full pt-2">
                  {submittedTime && (Date.now() - submittedTime) / 1000 / 60 < 5 && (
                    <Button onClick={() => undoMutation.mutate(recentCheckId)} disabled={undoMutation.isPending} variant="destructive" className="w-full">
                      Undo (Batal Inspeksi)
                    </Button>
                  )}
                  <Button onClick={() => {
                    setRecentCheckId(null);
                    setSubmittedTime(null);
                    setMatchedRoom(null);
                    setExtraBed(false);
                    setIsScanning(true);
                  }} variant="secondary" className="w-full">
                    Scan Kamar Lain
                  </Button>
                </div>
              </div>
            ) : matchedRoom && !showOverridePrompt ? (
              <div className="w-full text-center space-y-3">
                <div className="space-y-1">
                  <QrCode className="h-10 w-10 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-emerald-500 text-base">Kamar Terdeteksi!</h4>
                </div>

                {/* Details View */}
                <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-3 text-left space-y-2 text-xs">
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Nomor Kamar:</span>
                    <span className="font-semibold text-white">{matchedRoom.rooms?.room_number}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Tipe Kamar:</span>
                    <span className="font-semibold text-white">{matchedRoom.rooms?.room_type}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-1.5">
                    <span className="text-slate-400">Petugas Tugasan:</span>
                    <span className="font-semibold text-amber-400">{assignedUserName}</span>
                  </div>
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-slate-400">Extra Bed Status:</span>
                    <div className="flex items-center gap-2">
                      <Switch id="extra-bed" checked={extraBed} onCheckedChange={setExtraBed} />
                      {extraBed && <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-medium">+1 Linen</span>}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 w-full pt-1">
                  <Button onClick={() => instantSubmit.mutate()} disabled={instantSubmit.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white w-full gap-1">
                    <Check className="h-4 w-4" /> Inspeksi Instan (Semua Standar)
                  </Button>
                  <Button onClick={() => {
                    void navigate({
                      to: "/room-check",
                      search: { roomId: matchedRoom.room_id },
                    });
                  }} variant="secondary" className="w-full">
                    Inspeksi Manual (Buka Form)
                  </Button>
                  <Button onClick={() => {
                    setMatchedRoom(null);
                    setExtraBed(false);
                    setIsScanning(true);
                  }} variant="ghost" size="sm" className="text-slate-400 hover:text-white h-8">
                    Batal Scan
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-2">
                <span className="text-xs text-muted-foreground">Menunggu validasi data...</span>
              </div>
            )}
          </div>

          {/* Simulator Controls */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <AlertCircle className="h-3 w-3" /> Simulator Kode QR (Uji Coba HP)
            </h4>
            <div className="flex gap-2">
              <Select value={selectedQr} onValueChange={setSelectedQr}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih simulasi kode QR" />
                </SelectTrigger>
                <SelectContent>
                  {qrCodes?.map((q) => (
                    <SelectItem key={q.id} value={q.qr_code}>
                      {q.qr_code} (Kamar {q.rooms?.room_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => handleSimulateScan(selectedQr)} disabled={!selectedQr || !isScanning}>
                Scan QR
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Di lingkungan HP tim sesungguhnya, kamera akan langsung aktif memindai stiker QR Code yang tertempel di pintu/kamar.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Supervisor Permission Dialog */}
      <Dialog open={showOverridePrompt} onOpenChange={(v) => { if (!v) handleCancelOverride(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <ShieldAlert className="h-5 w-5" /> Penugasan Tidak Sesuai
            </DialogTitle>
            <DialogDescription className="pt-2">
              Kamar {matchedRoom?.rooms?.room_number} tidak ditugaskan untuk Anda hari ini.
              Apakah Anda ingin melanjutkan inspeksi dengan izin supervisor?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2 sm:justify-end">
            <Button variant="outline" onClick={handleCancelOverride}>Batal</Button>
            <Button onClick={handleConfirmOverride}>Lanjutkan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
