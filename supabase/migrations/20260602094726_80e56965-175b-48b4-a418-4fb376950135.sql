
DO $$
DECLARE
  d date;
  item record;
  room record;
BEGIN
  FOR d IN SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date LOOP
    FOR item IN SELECT id FROM linen_items LOOP
      INSERT INTO pantry_records (record_date, linen_item_id, qty, notes)
      VALUES (d, item.id, 20 + floor(random() * 80)::int, 'Stok harian');

      INSERT INTO laundry_records (record_date, linen_item_id, qty_in, qty_out, notes)
      VALUES (d, item.id, 30 + floor(random() * 50)::int, 25 + floor(random() * 50)::int, 'Cycle harian');
    END LOOP;
  END LOOP;

  FOR d IN SELECT generate_series(CURRENT_DATE - INTERVAL '6 days', CURRENT_DATE, '1 day')::date LOOP
    IF random() > 0.4 THEN
      INSERT INTO lost_records (record_date, linen_item_id, qty, category, location, petugas, notes)
      SELECT d, id, 1 + floor(random() * 4)::int,
        (ARRAY['guest_missing','laundry_missing','room_missing','unknown']::lost_category[])[1 + floor(random()*4)::int],
        'Kamar ' || (100 + floor(random()*20)::int)::text,
        (ARRAY['Budi','Siti','Andi','Rina'])[1 + floor(random()*4)::int],
        'Hilang saat operasional'
      FROM linen_items ORDER BY random() LIMIT 2;
    END IF;

    IF random() > 0.5 THEN
      INSERT INTO breakage_records (record_date, linen_item_id, qty, damage_type, remark)
      SELECT d, id, 1 + floor(random() * 3)::int,
        (ARRAY['spot','sobek','bolong','luntur','burn_mark','lainnya']::damage_type[])[1 + floor(random()*6)::int],
        'Ditemukan rusak'
      FROM linen_items ORDER BY random() LIMIT 1;
    END IF;
  END LOOP;

  FOR room IN SELECT id, room_type FROM rooms ORDER BY room_number LIMIT 4 LOOP
    WITH new_check AS (
      INSERT INTO room_checks (check_date, room_id, extra_bed, notes)
      VALUES (CURRENT_DATE, room.id, random() > 0.7, 'OK semua linen')
      RETURNING id
    )
    INSERT INTO room_check_items (room_check_id, linen_item_id, standard_qty, actual_qty, status)
    SELECT nc.id, s.linen_item_id, s.standard_qty,
      GREATEST(0, s.standard_qty - floor(random() * 2)::int),
      CASE WHEN random() > 0.85 THEN 'kurang'::linen_status ELSE 'match'::linen_status END
    FROM new_check nc, room_linen_standards s
    WHERE s.room_type = room.room_type;
  END LOOP;

  FOR room IN SELECT id, room_type FROM rooms LOOP
    WITH new_check AS (
      INSERT INTO room_checks (check_date, room_id, extra_bed, notes)
      VALUES (CURRENT_DATE - 1, room.id, false, 'Cek rutin')
      RETURNING id
    )
    INSERT INTO room_check_items (room_check_id, linen_item_id, standard_qty, actual_qty, status)
    SELECT nc.id, s.linen_item_id, s.standard_qty, s.standard_qty, 'match'::linen_status
    FROM new_check nc, room_linen_standards s
    WHERE s.room_type = room.room_type;
  END LOOP;
END $$;
