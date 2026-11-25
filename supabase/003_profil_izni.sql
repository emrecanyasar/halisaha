-- =====================================================================
-- 3. dosya: düzeltme. Kayıt olurken oyuncu profilinin kimliği tarayıcıda
-- üretildiği için "id" sütununa yazma izni gerekiyor (schema.sql'de eksikti).
-- 002'den sonra, SQL Editor'de bir kez çalıştırılır.
-- =====================================================================

grant insert (id, user_id, name, number, foot, size, position, position2) on public.players to authenticated;
