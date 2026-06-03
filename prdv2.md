# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# Linen-Track System V2

## Operational Enhancement for Housekeeping & Laundry

Version: 2.0

---

# 1. OVERVIEW

Versi 2.0 berfokus pada peningkatan efisiensi operasional Housekeeping dan Laundry.

Tujuan utama:

* Mengurangi waktu input petugas
* Mempermudah monitoring supervisor
* Melacak pergerakan linen secara lebih akurat
* Mengurangi kehilangan linen
* Mempermudah investigasi selisih
* Mengoptimalkan distribusi linen antar area operasional

---

# 2. NEW FEATURES

## FEATURE 1 — QR ROOM CHECK

### Objective

Mempercepat proses pengecekan kamar.

### Workflow

Scan QR Room

↓

Room Form Open

↓

Room Inspection

↓

Submit

### Requirement

Setiap kamar memiliki QR Code unik.

Contoh:

ROOM-101

ROOM-102

ROOM-103

### Benefit

Mengurangi pencarian kamar secara manual.

Mempercepat proses input.

---

## FEATURE 2 — ONE CLICK ROOM INSPECTION

### Objective

Meminimalkan input manual Room Attendant.

### Workflow

Room Attendant membuka kamar

↓

Klik "Sesuai Standar"

↓

Sistem otomatis mengisi seluruh linen sesuai standar kamar

↓

Submit

### Exception Handling

Jika terdapat masalah:

* Kurang
* Hilang
* Rusak
* Noda

Petugas dapat mengubah item tertentu.

---

## FEATURE 3 — DAILY TASK ASSIGNMENT

### Objective

Supervisor dapat membagi area kerja.

### Workflow

Supervisor membuat tugas.

Assign:

Room Attendant A

Room 101–110

Room Attendant B

Room 111–120

### Dashboard Petugas

Menampilkan:

Assigned Rooms

Completed Rooms

Remaining Rooms

---

## FEATURE 4 — SHIFT MANAGEMENT

### Objective

Memisahkan aktivitas berdasarkan shift.

### Shift Type

Morning

Evening

Night

### Tracking

Setiap transaksi menyimpan:

Shift

User

Timestamp

---

## FEATURE 5 — LINEN MOVEMENT TRACKING

### Objective

Melacak perpindahan linen.

### Movement Flow

Laundry

↓

Pantry

↓

Room

↓

Dirty Linen

↓

Laundry

### Movement Record

Tanggal

Lokasi Asal

Lokasi Tujuan

Jenis Linen

Qty

Petugas

### Benefit

Mengetahui posisi linen secara realtime.

---

## FEATURE 6 — MISSING LINEN INVESTIGATION

### Objective

Mempermudah investigasi selisih.

### Workflow

Supervisor klik:

Investigate

↓

Sistem menampilkan histori terakhir.

### Example

Item:

Bath Towel

Last Location:

Room 205

Last User:

Andi

Last Activity:

02 Juni 2026

### Benefit

Mengurangi waktu pencarian linen hilang.

---

## FEATURE 7 — LOST APPROVAL

### Objective

Menghindari manipulasi data kehilangan.

### Workflow

Laundry Input Lost

↓

Status Pending

↓

Supervisor Review

↓

Approve / Reject

### Status

Pending

Approved

Rejected

---

## FEATURE 8 — BREAKAGE APPROVAL

### Objective

Validasi linen rusak.

### Workflow

Laundry Input Breakage

↓

Upload Photo

↓

Supervisor Approve

### Status

Pending

Approved

Rejected

---

## FEATURE 9 — DAMAGE CATEGORY

### Damage Types

Spot

Sobek

Bolong

Luntur

Burn Mark

Missing Label

Stain Permanent

Other

### Benefit

Analisis penyebab kerusakan linen.

---

## FEATURE 10 — PANTRY REFILL RECOMMENDATION

### Objective

Membantu supervisor menentukan kebutuhan pantry.

### Configuration

Minimum Stock

Maximum Stock

### Example

Pantry Floor 2

Current:

22 pcs

Minimum:

50 pcs

Recommendation:

Refill 28 pcs

---

## FEATURE 11 — SMART ALERT SYSTEM

### Alert Conditions

Lost > Threshold

Breakage > Threshold

Laundry Delay

Room Check Incomplete

Pantry Stock Low

### Alert Type

Dashboard Alert

Push Notification

Email Notification

---

## FEATURE 12 — PERFORMANCE DASHBOARD

### Supervisor Dashboard

Rooms Assigned

Rooms Completed

Rooms Pending

Laundry Progress

Lost Today

Breakage Today

### Metrics

Room Completion Rate

Laundry Completion Rate

Inventory Accuracy

---

# 3. NEW DATABASE TABLES

## room_assignments

id

user_id

room_id

assign_date

status

created_at

---

## linen_movements

id

linen_item_id

from_location

to_location

qty

user_id

movement_date

created_at

---

## lost_approvals

id

lost_record_id

approval_status

approved_by

approved_at

remarks

---

## breakage_approvals

id

breakage_record_id

approval_status

approved_by

approved_at

remarks

---

## room_qr_codes

id

room_id

qr_code

created_at

---

# 4. MOBILE REQUIREMENTS

Large Button Interface

One-Hand Operation

Tablet Friendly

Fast Form Entry

Offline Support

Auto Sync

PWA Compatible

---

# 5. SUCCESS METRICS

Room Inspection Time

Target:

< 30 seconds per room

---

Laundry Recording Time

Target:

< 15 seconds per transaction

---

Inventory Accuracy

Target:

> 98%

---

Lost Reduction

Target:

20% reduction within 6 months

---

# 6. IMPLEMENTATION PHASE

Phase 1

QR Room Check

One Click Inspection

Task Assignment

Shift Management

---

Phase 2

Linen Movement Tracking

Lost Approval

Breakage Approval

Damage Categories

---

Phase 3

Investigation Module

Smart Alert System

Pantry Recommendation

Performance Dashboard

Estimated Duration:

2–3 Weeks
