
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin','supervisor','room_attendant','laundry_attendant');
CREATE TYPE public.linen_status AS ENUM ('match','kurang','hilang','rusak','noda');
CREATE TYPE public.lost_category AS ENUM ('guest_missing','laundry_missing','room_missing','unknown');
CREATE TYPE public.damage_type AS ENUM ('spot','sobek','bolong','luntur','burn_mark','lainnya');

-- ============ PROFILES ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read all auth" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- ============ USER ROLES ============
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles admin manage" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ============ PROFILE AUTO-CREATE TRIGGER ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email);
  -- First user becomes admin; others default to room_attendant
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin') THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'room_attendant');
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ ROOMS ============
CREATE TABLE public.rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_number text NOT NULL UNIQUE,
  room_type text NOT NULL,
  bed_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rooms TO authenticated;
GRANT ALL ON public.rooms TO service_role;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rooms read auth" ON public.rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "rooms admin write" ON public.rooms FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms admin update" ON public.rooms FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "rooms admin delete" ON public.rooms FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ LINEN ITEMS ============
CREATE TABLE public.linen_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_name text NOT NULL UNIQUE,
  category text NOT NULL DEFAULT 'linen',
  unit text NOT NULL DEFAULT 'pcs',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.linen_items TO authenticated;
GRANT ALL ON public.linen_items TO service_role;
ALTER TABLE public.linen_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "linen_items read auth" ON public.linen_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "linen_items admin write" ON public.linen_items FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "linen_items admin update" ON public.linen_items FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "linen_items admin delete" ON public.linen_items FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ STANDARDS ============
CREATE TABLE public.room_linen_standards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type text NOT NULL,
  linen_item_id uuid NOT NULL REFERENCES public.linen_items(id) ON DELETE CASCADE,
  standard_qty int NOT NULL DEFAULT 0,
  UNIQUE(room_type, linen_item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_linen_standards TO authenticated;
GRANT ALL ON public.room_linen_standards TO service_role;
ALTER TABLE public.room_linen_standards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stds read auth" ON public.room_linen_standards FOR SELECT TO authenticated USING (true);
CREATE POLICY "stds admin write" ON public.room_linen_standards FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "stds admin update" ON public.room_linen_standards FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "stds admin delete" ON public.room_linen_standards FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- ============ ROOM CHECKS ============
CREATE TABLE public.room_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  check_date date NOT NULL DEFAULT CURRENT_DATE,
  extra_bed boolean NOT NULL DEFAULT false,
  notes text,
  photo_url text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_checks TO authenticated;
GRANT ALL ON public.room_checks TO service_role;
ALTER TABLE public.room_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc read auth" ON public.room_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "rc insert auth" ON public.room_checks FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "rc update own/admin" ON public.room_checks FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "rc delete admin" ON public.room_checks FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.room_check_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_check_id uuid NOT NULL REFERENCES public.room_checks(id) ON DELETE CASCADE,
  linen_item_id uuid NOT NULL REFERENCES public.linen_items(id) ON DELETE CASCADE,
  actual_qty int NOT NULL DEFAULT 0,
  standard_qty int NOT NULL DEFAULT 0,
  status public.linen_status NOT NULL DEFAULT 'match'
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_check_items TO authenticated;
GRANT ALL ON public.room_check_items TO service_role;
ALTER TABLE public.room_check_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rci read auth" ON public.room_check_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "rci write auth" ON public.room_check_items FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ============ PANTRY ============
CREATE TABLE public.pantry_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linen_item_id uuid NOT NULL REFERENCES public.linen_items(id) ON DELETE CASCADE,
  qty int NOT NULL DEFAULT 0,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pantry_records TO authenticated;
GRANT ALL ON public.pantry_records TO service_role;
ALTER TABLE public.pantry_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pantry read auth" ON public.pantry_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "pantry insert auth" ON public.pantry_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "pantry update own/admin" ON public.pantry_records FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "pantry delete admin" ON public.pantry_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- ============ LAUNDRY ============
CREATE TABLE public.laundry_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linen_item_id uuid NOT NULL REFERENCES public.linen_items(id) ON DELETE CASCADE,
  qty_in int NOT NULL DEFAULT 0,
  qty_out int NOT NULL DEFAULT 0,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.laundry_records TO authenticated;
GRANT ALL ON public.laundry_records TO service_role;
ALTER TABLE public.laundry_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "laundry read auth" ON public.laundry_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "laundry insert auth" ON public.laundry_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "laundry update own/admin" ON public.laundry_records FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "laundry delete admin" ON public.laundry_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- ============ LOST ============
CREATE TABLE public.lost_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linen_item_id uuid NOT NULL REFERENCES public.linen_items(id) ON DELETE CASCADE,
  qty int NOT NULL DEFAULT 0,
  category public.lost_category NOT NULL DEFAULT 'unknown',
  location text,
  notes text,
  petugas text,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lost_records TO authenticated;
GRANT ALL ON public.lost_records TO service_role;
ALTER TABLE public.lost_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lost read auth" ON public.lost_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "lost insert auth" ON public.lost_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "lost update own/admin" ON public.lost_records FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "lost delete admin" ON public.lost_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- ============ BREAKAGE ============
CREATE TABLE public.breakage_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linen_item_id uuid NOT NULL REFERENCES public.linen_items(id) ON DELETE CASCADE,
  qty int NOT NULL DEFAULT 0,
  damage_type public.damage_type NOT NULL DEFAULT 'lainnya',
  remark text,
  photo_url text,
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.breakage_records TO authenticated;
GRANT ALL ON public.breakage_records TO service_role;
ALTER TABLE public.breakage_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "brk read auth" ON public.breakage_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "brk insert auth" ON public.breakage_records FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "brk update own/admin" ON public.breakage_records FOR UPDATE TO authenticated USING (created_by = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));
CREATE POLICY "brk delete admin" ON public.breakage_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- ============ INVENTORY MONTHLY ============
CREATE TABLE public.inventory_monthly (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linen_item_id uuid NOT NULL REFERENCES public.linen_items(id) ON DELETE CASCADE,
  year int NOT NULL,
  month int NOT NULL CHECK (month BETWEEN 1 AND 12),
  actual_qty int NOT NULL DEFAULT 0,
  lost_qty int NOT NULL DEFAULT 0,
  breakage_qty int NOT NULL DEFAULT 0,
  remark text,
  UNIQUE(linen_item_id, year, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_monthly TO authenticated;
GRANT ALL ON public.inventory_monthly TO service_role;
ALTER TABLE public.inventory_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv read auth" ON public.inventory_monthly FOR SELECT TO authenticated USING (true);
CREATE POLICY "inv supervisor write" ON public.inventory_monthly FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'supervisor'));

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public) VALUES ('linen-photos','linen-photos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "linen-photos read public" ON storage.objects FOR SELECT USING (bucket_id = 'linen-photos');
CREATE POLICY "linen-photos auth insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'linen-photos');
CREATE POLICY "linen-photos auth update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'linen-photos');
CREATE POLICY "linen-photos auth delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'linen-photos');

-- ============ SEED DATA ============
INSERT INTO public.linen_items (item_name, category, unit) VALUES
  ('Sprei','linen','pcs'),
  ('Pillow Case','linen','pcs'),
  ('Duvet Cover','linen','pcs'),
  ('Pillow Protector','linen','pcs'),
  ('Bath Towel','towel','pcs'),
  ('Hand Towel','towel','pcs'),
  ('Face Towel','towel','pcs'),
  ('Bath Mat','towel','pcs');

-- Sample rooms
INSERT INTO public.rooms (room_number, room_type, bed_type) VALUES
  ('101','Standard','Twin'),
  ('102','Standard','Twin'),
  ('103','Standard','Double'),
  ('201','Deluxe','King'),
  ('202','Deluxe','King'),
  ('301','Suite','King');

-- Standards per room type
INSERT INTO public.room_linen_standards (room_type, linen_item_id, standard_qty)
SELECT 'Standard', id,
  CASE item_name
    WHEN 'Sprei' THEN 2
    WHEN 'Pillow Case' THEN 2
    WHEN 'Duvet Cover' THEN 1
    WHEN 'Pillow Protector' THEN 2
    WHEN 'Bath Towel' THEN 2
    WHEN 'Hand Towel' THEN 2
    WHEN 'Face Towel' THEN 2
    WHEN 'Bath Mat' THEN 1
  END
FROM public.linen_items;

INSERT INTO public.room_linen_standards (room_type, linen_item_id, standard_qty)
SELECT 'Deluxe', id,
  CASE item_name
    WHEN 'Sprei' THEN 2
    WHEN 'Pillow Case' THEN 4
    WHEN 'Duvet Cover' THEN 1
    WHEN 'Pillow Protector' THEN 4
    WHEN 'Bath Towel' THEN 3
    WHEN 'Hand Towel' THEN 3
    WHEN 'Face Towel' THEN 3
    WHEN 'Bath Mat' THEN 2
  END
FROM public.linen_items;

INSERT INTO public.room_linen_standards (room_type, linen_item_id, standard_qty)
SELECT 'Suite', id,
  CASE item_name
    WHEN 'Sprei' THEN 3
    WHEN 'Pillow Case' THEN 6
    WHEN 'Duvet Cover' THEN 2
    WHEN 'Pillow Protector' THEN 6
    WHEN 'Bath Towel' THEN 4
    WHEN 'Hand Towel' THEN 4
    WHEN 'Face Towel' THEN 4
    WHEN 'Bath Mat' THEN 2
  END
FROM public.linen_items;
