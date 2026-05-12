-- Seed the seven canonical categories. Idempotent via on conflict.

insert into public.categories (name, icon) values
  ('Food',          '🍜'),
  ('Transport',     '🚇'),
  ('Bills',         '🧾'),
  ('Entertainment', '🎬'),
  ('Shopping',      '🛍️'),
  ('Health',        '💊'),
  ('Other',         '📦')
on conflict (name) do nothing;
