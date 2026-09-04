CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,          -- MongoDB _id
  establishment_slug TEXT,
  table_number INTEGER,
  seat_label TEXT,
  order_number INTEGER,
  items TEXT,                   -- JSON string
  total_amount INTEGER,
  status TEXT DEFAULT 'pending',
  payment_status TEXT DEFAULT 'unpaid',
  created_at TEXT,
  synced INTEGER DEFAULT 0      -- 0=local only, 1=synced to server
);

CREATE TABLE IF NOT EXISTS print_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id TEXT,
  print_type TEXT,              -- 'kitchen' | 'cashier'
  content TEXT,                 -- chek matni
  printed INTEGER DEFAULT 0,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);
