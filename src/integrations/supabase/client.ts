import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const isBrowser = typeof window !== 'undefined';

// Seed initial data generator
function getSeededData(table: string): any[] {
  const now = new Date().toISOString();
  const dateStr = now.slice(0, 10);

  if (table === 'rooms') {
    return [
      { id: 'r1', room_number: '101', room_type: 'Deluxe', bed_type: 'King', created_at: now },
      { id: 'r2', room_number: '102', room_type: 'Deluxe', bed_type: 'Twin', created_at: now },
      { id: 'r3', room_number: '103', room_type: 'Suite', bed_type: 'King', created_at: now },
      { id: 'r4', room_number: '104', room_type: 'Standard', bed_type: 'Single', created_at: now },
      { id: 'r5', room_number: '105', room_type: 'Standard', bed_type: 'Twin', created_at: now },
    ];
  }

  if (table === 'linen_items') {
    return [
      { id: 'l1', item_name: 'Sprei', category: 'Bedding', unit: 'Pcs', created_at: now },
      { id: 'l2', item_name: 'Pillow Case', category: 'Bedding', unit: 'Pcs', created_at: now },
      { id: 'l3', item_name: 'Bath Towel', category: 'Towel', unit: 'Pcs', created_at: now },
      { id: 'l4', item_name: 'Hand Towel', category: 'Towel', unit: 'Pcs', created_at: now },
      { id: 'l5', item_name: 'Duvet Cover', category: 'Bedding', unit: 'Pcs', created_at: now },
      { id: 'l6', item_name: 'Pillow Protector', category: 'Bedding', unit: 'Pcs', created_at: now },
    ];
  }

  if (table === 'room_linen_standards') {
    return [
      // Deluxe
      { id: 's1', room_type: 'Deluxe', linen_item_id: 'l1', standard_qty: 2, created_at: now },
      { id: 's2', room_type: 'Deluxe', linen_item_id: 'l2', standard_qty: 2, created_at: now },
      { id: 's3', room_type: 'Deluxe', linen_item_id: 'l3', standard_qty: 2, created_at: now },
      { id: 's4', room_type: 'Deluxe', linen_item_id: 'l4', standard_qty: 2, created_at: now },
      { id: 's5', room_type: 'Deluxe', linen_item_id: 'l5', standard_qty: 1, created_at: now },
      { id: 's6', room_type: 'Deluxe', linen_item_id: 'l6', standard_qty: 2, created_at: now },
      // Suite
      { id: 's7', room_type: 'Suite', linen_item_id: 'l1', standard_qty: 2, created_at: now },
      { id: 's8', room_type: 'Suite', linen_item_id: 'l2', standard_qty: 4, created_at: now },
      { id: 's9', room_type: 'Suite', linen_item_id: 'l3', standard_qty: 4, created_at: now },
      { id: 's10', room_type: 'Suite', linen_item_id: 'l4', standard_qty: 4, created_at: now },
      { id: 's11', room_type: 'Suite', linen_item_id: 'l5', standard_qty: 2, created_at: now },
      { id: 's12', room_type: 'Suite', linen_item_id: 'l6', standard_qty: 4, created_at: now },
      // Standard
      { id: 's13', room_type: 'Standard', linen_item_id: 'l1', standard_qty: 1, created_at: now },
      { id: 's14', room_type: 'Standard', linen_item_id: 'l2', standard_qty: 1, created_at: now },
      { id: 's15', room_type: 'Standard', linen_item_id: 'l3', standard_qty: 1, created_at: now },
      { id: 's16', room_type: 'Standard', linen_item_id: 'l4', standard_qty: 1, created_at: now },
      { id: 's17', room_type: 'Standard', linen_item_id: 'l5', standard_qty: 1, created_at: now },
      { id: 's18', room_type: 'Standard', linen_item_id: 'l6', standard_qty: 1, created_at: now },
    ];
  }

  if (table === 'profiles') {
    return [
      { id: 'user1', full_name: 'John Admin', email: 'admin@hotel.com', created_at: now },
      { id: 'user2', full_name: 'Room Attendant Ani', email: 'ani@hotel.com', created_at: now },
    ];
  }

  if (table === 'user_roles') {
    return [
      { id: 'ur1', user_id: 'user1', role: 'admin', created_at: now },
      { id: 'ur2', user_id: 'user2', role: 'room_attendant', created_at: now },
    ];
  }

  if (table === 'pantry_records') {
    return [
      { id: 'pr1', linen_item_id: 'l1', qty: 50, record_date: dateStr, created_at: now },
      { id: 'pr2', linen_item_id: 'l2', qty: 60, record_date: dateStr, created_at: now },
      { id: 'pr3', linen_item_id: 'l3', qty: 80, record_date: dateStr, created_at: now },
      { id: 'pr4', linen_item_id: 'l4', qty: 90, record_date: dateStr, created_at: now },
    ];
  }

  if (table === 'laundry_records') {
    return [
      { id: 'lr1', linen_item_id: 'l1', qty_in: 30, qty_out: 28, record_date: dateStr, created_at: now },
      { id: 'lr2', linen_item_id: 'l2', qty_in: 40, qty_out: 40, record_date: dateStr, created_at: now },
      { id: 'lr3', linen_item_id: 'l3', qty_in: 50, qty_out: 47, record_date: dateStr, created_at: now },
    ];
  }

  if (table === 'lost_records') {
    return [
      { id: 'lo1', linen_item_id: 'l1', qty: 2, category: 'Laundry Missing', notes: 'Hilang di laundry', record_date: dateStr, created_at: now },
      { id: 'lo2', linen_item_id: 'l3', qty: 1, category: 'Guest Missing', notes: 'Dibawa tamu', record_date: dateStr, created_at: now },
    ];
  }

  if (table === 'breakage_records') {
    return [
      { id: 'br1', linen_item_id: 'l3', qty: 2, damage_type: 'Sobek', notes: 'Sobek saat dicuci', record_date: dateStr, created_at: now },
    ];
  }

  if (table === 'inventory_monthly') {
    const itemsList = ['l1', 'l2', 'l3', 'l4', 'l5', 'l6'];
    const out: any[] = [];
    itemsList.forEach((li) => {
      out.push({
        id: `inv_${li}_2026`,
        linen_item_id: li,
        year: 2026,
        jan_qty: 100, jan_lost: 2, jan_breakage: 1, jan_remark: 'Spot',
        feb_qty: 98, feb_lost: 1, feb_breakage: 0, feb_remark: '',
        mar_qty: 97, mar_lost: 0, mar_breakage: 0, mar_remark: '',
        apr_qty: 97, apr_lost: 0, apr_breakage: 0, apr_remark: '',
        mei_qty: 97, mei_lost: 0, mei_breakage: 0, mei_remark: '',
        jun_qty: 97, jun_lost: 0, jun_breakage: 0, jun_remark: '',
        jul_qty: 97, jul_lost: 0, jul_breakage: 0, jul_remark: '',
        agu_qty: 97, agu_lost: 0, agu_breakage: 0, agu_remark: '',
        sep_qty: 97, sep_lost: 0, sep_breakage: 0, sep_remark: '',
        okt_qty: 97, okt_lost: 0, okt_breakage: 0, okt_remark: '',
        nov_qty: 97, nov_lost: 0, nov_breakage: 0, nov_remark: '',
        des_qty: 97, des_lost: 0, des_breakage: 0, des_remark: ''
      });
    });
    return out;
  }

  if (table === 'room_assignments') {
    return [
      { id: 'ra1', user_id: 'user2', room_id: 'r1', assign_date: dateStr, status: 'pending', created_at: now },
      { id: 'ra2', user_id: 'user2', room_id: 'r2', assign_date: dateStr, status: 'pending', created_at: now },
      { id: 'ra3', user_id: 'user2', room_id: 'r3', assign_date: dateStr, status: 'pending', created_at: now },
    ];
  }

  if (table === 'room_qr_codes') {
    return [
      { id: 'qr1', room_id: 'r1', qr_code: 'ROOM-101', created_at: now },
      { id: 'qr2', room_id: 'r2', qr_code: 'ROOM-102', created_at: now },
      { id: 'qr3', room_id: 'r3', qr_code: 'ROOM-103', created_at: now },
      { id: 'qr4', room_id: 'r4', qr_code: 'ROOM-104', created_at: now },
      { id: 'qr5', room_id: 'r5', qr_code: 'ROOM-105', created_at: now },
    ];
  }

  if (table === 'linen_movements') {
    return [
      { id: 'm1', linen_item_id: 'l1', from_location: 'Laundry', to_location: 'Pantry', qty: 25, user_id: 'user2', movement_date: dateStr, created_at: now },
      { id: 'm2', linen_item_id: 'l3', from_location: 'Pantry', to_location: 'Room', qty: 15, user_id: 'user2', movement_date: dateStr, created_at: now },
      { id: 'm3', linen_item_id: 'l2', from_location: 'Room', to_location: 'Dirty Linen', qty: 10, user_id: 'user2', movement_date: dateStr, created_at: now },
    ];
  }

  return [];
}

function getMockTable(table: string): any[] {
  if (isBrowser) {
    const val = localStorage.getItem(`db_${table}`);
    if (val) {
      const parsed = JSON.parse(val);
      let changed = false;
      if (table === 'user_roles') {
        const user1Role = parsed.find((r: any) => r.user_id === 'user1');
        if (user1Role && user1Role.role !== 'admin') {
          user1Role.role = 'admin';
          changed = true;
        }
      }
      if (table === 'profiles') {
        const user1Profile = parsed.find((p: any) => p.id === 'user1');
        if (user1Profile && user1Profile.full_name !== 'John Admin') {
          user1Profile.full_name = 'John Admin';
          user1Profile.email = 'admin@hotel.com';
          changed = true;
        }
      }
      if (changed) {
        localStorage.setItem(`db_${table}`, JSON.stringify(parsed));
      }
      return parsed;
    }
  } else {
    const db = (globalThis as any).__mockDb || {};
    if (db[table]) return db[table];
  }
  
  const defaults = getSeededData(table);
  saveMockTable(table, defaults);
  return defaults;
}

function saveMockTable(table: string, data: any[]) {
  if (isBrowser) {
    localStorage.setItem(`db_${table}`, JSON.stringify(data));
  } else {
    if (!(globalThis as any).__mockDb) {
      (globalThis as any).__mockDb = {};
    }
    (globalThis as any).__mockDb[table] = data;
  }
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getActiveShift(): string {
  const hr = new Date().getHours();
  if (hr >= 6 && hr < 14) return 'Morning';
  if (hr >= 14 && hr < 22) return 'Evening';
  return 'Night';
}

class MockQueryBuilder {
  private table: string;
  private filters: Array<(item: any) => boolean> = [];
  private orderCol: string | null = null;
  private orderAsc: boolean = true;
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;
  private isCountOnly: boolean = false;
  private isInsert: boolean = false;
  private isUpdate: boolean = false;
  private isDelete: boolean = false;
  private isUpsert: boolean = false;
  private payload: any = null;
  private upsertOptions: any = null;

  constructor(table: string) {
    this.table = table;
  }

  select(fields: string = '*', options?: any) {
    if (options?.count) {
      this.isCountOnly = true;
    }
    return this;
  }

  insert(payload: any) {
    this.isInsert = true;
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.isUpdate = true;
    this.payload = payload;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  upsert(payload: any, options?: any) {
    this.isUpsert = true;
    this.payload = payload;
    this.upsertOptions = options;
    return this;
  }

  eq(col: string, val: any) {
    this.filters.push((item) => item[col] === val);
    return this;
  }

  gte(col: string, val: any) {
    this.filters.push((item) => item[col] >= val);
    return this;
  }

  order(col: string, options?: { ascending?: boolean }) {
    this.orderCol = col;
    this.orderAsc = options?.ascending !== false;
    return this;
  }

  limit(n: number) {
    this.limitCount = n;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await this.execute();
      return onfulfilled ? onfulfilled(res) : res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute() {
    let data = getMockTable(this.table);

    if (this.isInsert) {
      const records = Array.isArray(this.payload) ? this.payload : [this.payload];
      const inserted: any[] = [];
      records.forEach((r: any) => {
        const newRecord = {
          id: r.id || generateUUID(),
          created_at: new Date().toISOString(),
          shift: r.shift || getActiveShift(),
          ...r
        };
        data.push(newRecord);
        inserted.push(newRecord);
      });
      saveMockTable(this.table, data);
      return { data: Array.isArray(this.payload) ? inserted : inserted[0], error: null };
    }

    if (this.isUpdate) {
      const updated: any[] = [];
      data = data.map((item) => {
        const matches = this.filters.every((f) => f(item));
        if (matches) {
          const updatedItem = { ...item, ...this.payload };
          updated.push(updatedItem);
          return updatedItem;
        }
        return item;
      });
      saveMockTable(this.table, data);
      return { data: updated, error: null };
    }

    if (this.isUpsert) {
      const records = Array.isArray(this.payload) ? this.payload : [this.payload];
      const conflictCols = this.upsertOptions?.onConflict?.split(',').map((c: string) => c.trim()) || ['id'];
      records.forEach((r: any) => {
        const matchIdx = data.findIndex((item) => 
          conflictCols.every((col: string) => item[col] === r[col])
        );
        if (matchIdx >= 0) {
          data[matchIdx] = { ...data[matchIdx], ...r };
        } else {
          data.push({
            id: r.id || generateUUID(),
            created_at: new Date().toISOString(),
            ...r
          });
        }
      });
      saveMockTable(this.table, data);
      return { data: this.payload, error: null };
    }

    if (this.isDelete) {
      data = data.filter((item) => !this.filters.every((f) => f(item)));
      saveMockTable(this.table, data);
      return { data: null, error: null };
    }

    let filtered = [...data];
    this.filters.forEach((f) => {
      filtered = filtered.filter(f);
    });

    if (this.orderCol) {
      filtered.sort((a, b) => {
        const va = a[this.orderCol!];
        const vb = b[this.orderCol!];
        if (va < vb) return this.orderAsc ? -1 : 1;
        if (va > vb) return this.orderAsc ? 1 : -1;
        return 0;
      });
    }

    if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount);
    }

    filtered = filtered.map((item) => {
      const newItem = { ...item };
      
      if (this.table === 'room_checks') {
        const roomsTable = getMockTable('rooms');
        const room = roomsTable.find((r) => r.id === item.room_id);
        newItem.rooms = room ? { room_number: room.room_number, room_type: room.room_type } : null;

        const checkItemsTable = getMockTable('room_check_items');
        const linenItemsTable = getMockTable('linen_items');
        const checkItems = checkItemsTable.filter((ci) => ci.room_check_id === item.id);
        newItem.room_check_items = checkItems.map((ci) => {
          const li = linenItemsTable.find((l) => l.id === ci.linen_item_id);
          return {
            ...ci,
            linen_items: li ? { item_name: li.item_name } : null
          };
        });
      }

      if (this.table === 'room_linen_standards' || this.table === 'room_check_items' || 
          this.table === 'pantry_records' || this.table === 'laundry_records' || 
          this.table === 'lost_records' || this.table === 'breakage_records' ||
          this.table === 'linen_movements') {
        const linenItemsTable = getMockTable('linen_items');
        const li = linenItemsTable.find((l) => l.id === item.linen_item_id);
        newItem.linen_items = li ? { item_name: li.item_name } : null;
      }

      if (this.table === 'room_assignments') {
        const roomsTable = getMockTable('rooms');
        const profilesTable = getMockTable('profiles');
        const room = roomsTable.find((r) => r.id === item.room_id);
        const profile = profilesTable.find((p) => p.id === item.user_id);
        newItem.rooms = room ? { room_number: room.room_number, room_type: room.room_type } : null;
        newItem.profiles = profile ? { full_name: profile.full_name, email: profile.email } : null;
      }

      if (this.table === 'room_qr_codes') {
        const roomsTable = getMockTable('rooms');
        const room = roomsTable.find((r) => r.id === item.room_id);
        newItem.rooms = room ? { room_number: room.room_number, room_type: room.room_type } : null;
      }

      if (this.table === 'linen_movements') {
        const profilesTable = getMockTable('profiles');
        const profile = profilesTable.find((p) => p.id === item.user_id);
        newItem.profiles = profile ? { full_name: profile.full_name, email: profile.email } : null;
      }

      return newItem;
    });

    if (this.isCountOnly) {
      return { count: filtered.length, data: null, error: null };
    }

    if (this.isSingle) {
      return { data: filtered[0] || null, error: filtered[0] ? null : new Error('Record not found') };
    }

    if (this.isMaybeSingle) {
      return { data: filtered[0] || null, error: null };
    }

    return { data: filtered, error: null };
  }
}

const mockSession = {
  access_token: 'mock-token',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'mock-refresh',
  user: {
    id: 'user1',
    email: 'admin@hotel.com',
    app_metadata: {},
    user_metadata: { full_name: 'John Admin' },
    aud: 'authenticated',
    created_at: new Date().toISOString()
  }
};

const mockAuth = {
  getSession: async () => ({ data: { session: mockSession }, error: null }),
  onAuthStateChange: (cb: any) => {
    setTimeout(() => cb('SIGNED_IN', mockSession), 0);
    return { data: { subscription: { unsubscribe: () => {} } } };
  },
  signOut: async () => ({ error: null }),
  admin: {
    createUser: async (payload: any) => {
      const id = generateUUID();
      const newUser = { id, email: payload.email, full_name: payload.user_metadata?.full_name };
      const profiles = getMockTable('profiles');
      profiles.push(newUser);
      saveMockTable('profiles', profiles);
      return { data: { user: { id } }, error: null };
    },
    deleteUser: async (id: string) => {
      let profiles = getMockTable('profiles');
      profiles = profiles.filter((p) => p.id !== id);
      saveMockTable('profiles', profiles);
      return { data: {}, error: null };
    }
  }
};

export const supabase = {
  auth: mockAuth,
  from: (table: string) => new MockQueryBuilder(table),
} as any;
