# PRODUCT REQUIREMENTS DOCUMENT (PRD)

# Linen-Track Operational System

## Sistem Operasional Linen Housekeeping & Laundry Hotel

Version: 3.0

---

# 1. PROJECT OVERVIEW

Linen-Track adalah sistem operasional Housekeeping yang digunakan untuk:

* Monitoring linen kamar
* Monitoring linen pantry
* Monitoring linen laundry
* Mencatat linen hilang (Lost)
* Mencatat linen rusak (Breakage)
* Rekonsiliasi stok linen
* Menggantikan proses pencatatan Excel manual

Target pengguna:

* Room Attendant
* Laundry Attendant
* Linen Controller
* Housekeeping Supervisor

---

# 2. OBJECTIVE

Mengurangi pencatatan manual.

Mempercepat proses pengecekan linen.

Mempermudah proses laundry.

Mengurangi kehilangan linen.

Menyediakan laporan harian dan bulanan untuk Housekeeping.

Menyediakan histori inventory linen seperti file Excel existing.

---

# 3. TECH STACK

Frontend

* Next.js 14
* TypeScript
* Tailwind CSS
* Shadcn UI

Backend

* Supabase
* PostgreSQL
* Drizzle ORM

Authentication

* Supabase Auth

Realtime

* Supabase Realtime

Hosting

* Vercel

Export

* ExcelJS

PWA

* Installable Mobile App

---

# 4. USER ROLES

## Administrator

Akses:

* Kelola User
* Kelola Kamar
* Kelola Linen Master
* Kelola Standar Linen
* Kelola Sistem

---

## Housekeeping Supervisor

Akses:

* Dashboard
* Rekonsiliasi
* Lost & Breakage
* Inventory Bulanan
* Export Report

---

## Room Attendant

Akses:

* Room Check
* Input Linen Kamar
* Update Kondisi Linen

---

## Laundry Attendant

Akses:

* Linen Masuk
* Linen Diproses
* Linen Selesai
* Lost Laundry
* Breakage Laundry

---

# 5. DASHBOARD

## Summary Cards

### Kamar Sudah Dicek

125 / 140

---

### Linen Pantry

280 pcs

---

### Linen Laundry

320 pcs

---

### Total Selisih Hari Ini

8 pcs

Jika selisih > 0

Card otomatis merah.

---

### Lost Hari Ini

3 pcs

---

### Breakage Hari Ini

2 pcs

---

# 6. ROOM CHECK MODULE

Digunakan oleh Room Attendant.

---

## Form Room Check

Field:

Tanggal

Nomor Kamar

Room Type

Extra Bed

Catatan

---

Daftar Linen

Contoh:

Sprei

Pillow Case

Bath Towel

Hand Towel

Duvet Cover

Pillow Protector

---

Tombol:

[Sesuai Standar]

Jika ditekan:

Sistem otomatis mengisi jumlah standar linen berdasarkan tipe kamar.

---

Status Linen:

Match

Kurang

Hilang

Rusak

Noda

---

Upload Foto (Opsional)

---

# 7. PANTRY MODULE

Digunakan untuk mencatat stok linen bersih.

Field:

Tanggal

Jenis Linen

Qty

Catatan

---

Fungsi:

Mengetahui jumlah linen bersih yang tersedia untuk operasional.

---

# 8. LAUNDRY MODULE

Digunakan oleh Laundry Attendant.

---

## Linen Masuk Laundry

Field:

Tanggal

Jenis Linen

Qty Masuk

Catatan

---

## Linen Selesai Laundry

Field:

Tanggal

Jenis Linen

Qty Selesai

Catatan

---

Jika Qty Selesai < Qty Masuk

Muncul:

Lost

atau

Breakage

---

# 9. LOST TRACKING

Digunakan Supervisor HK.

Field:

Tanggal

Jenis Linen

Qty

Lokasi

Keterangan

Petugas

---

Kategori:

Guest Missing

Laundry Missing

Room Missing

Unknown

---

# 10. BREAKAGE TRACKING

Digunakan Supervisor HK.

Field:

Tanggal

Jenis Linen

Qty

Jenis Kerusakan

Remark

Foto

---

Kategori:

Spot

Sobek

Bolong

Luntur

Burn Mark

Lainnya

---

# 11. RECONCILIATION MODULE

Perhitungan otomatis.

Formula:

Total Inventory

=

Room Linen

*

Pantry Linen

*

Laundry Linen

*

Lost

*

Breakage

---

Jika terjadi perbedaan:

Status:

Mismatch

Baris berwarna merah.

---

# 12. INVENTORY MONTHLY

Modul pengganti file Excel existing.

---

Tampilan tabel bulanan.

Kolom:

Item Linen

Qty Last Year

Qty Actual

Jan

Feb

Mar

Apr

Mei

Jun

Jul

Agu

Sep

Okt

Nov

Des

---

Detail setiap bulan:

Actual Qty

Lost

Breakage

Remark

---

Contoh:

Pillow Case

Jan

Actual: 106

Lost: 16

Breakage: 4

Remark: Spot

---

# 13. REPORTS

Daily Linen Report

Room Check Report

Laundry Report

Lost Report

Breakage Report

Monthly Inventory Report

Reconciliation Report

---

# 14. EXPORT EXCEL

Format export harus menyerupai format Excel yang saat ini digunakan operasional hotel.

Sheet:

Linen

Towel

Lost

Breakage

Summary

---

# 15. DATABASE SCHEMA

rooms

* id
* room_number
* room_type
* bed_type

linen_items

* id
* item_name
* category
* unit

room_linen_standards

* id
* room_type
* linen_item_id
* standard_qty

room_checks

* id
* room_id
* linen_item_id
* actual_qty
* standard_qty
* status
* notes
* created_at

pantry_records

* id
* linen_item_id
* qty
* record_date

laundry_records

* id
* linen_item_id
* qty_in
* qty_out
* record_date

lost_records

* id
* linen_item_id
* qty
* category
* notes

breakage_records

* id
* linen_item_id
* qty
* damage_type
* notes

inventory_monthly

* id
* linen_item_id
* month
* actual_qty
* lost_qty
* breakage_qty
* remark

users

* id
* email
* role

---

# 16. PWA REQUIREMENTS

Install ke Home Screen.

Mobile First.

Offline Form Input.

Auto Sync Saat Online.

Fast Loading.

Tablet Friendly.

---

# 17. MVP DEVELOPMENT PHASE

Hari 1–2

Setup Project

Auth

Database

---

Hari 3–4

Master Data

Room Standard

---

Hari 5–6

Room Check Module

---

Hari 7

Laundry Module

Pantry Module

---

Hari 8

Dashboard

Reconciliation

---

Hari 9

Inventory Monthly

Export Excel

---

Hari 10

Testing

Deployment

Training User
