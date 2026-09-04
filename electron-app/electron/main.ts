import { app, BrowserWindow, ipcMain } from "electron";
import { join } from "path";
import { is } from "@electron-toolkit/utils";
import Database from "better-sqlite3";
import Store from "electron-store";
import { printReceipt } from "./printer";

interface Settings {
  serverUrl: string;
  establishmentSlug: string;
  kitchenPrinter: string;
  cashierPrinter: string;
}

interface LocalOrderRow {
  id: string;
  establishment_slug: string;
  table_number: number;
  seat_label: string;
  order_number: number;
  items: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  synced: number;
}

const store = new Store<Settings>({
  defaults: {
    serverUrl: "https://pos.osonmenu.uz",
    establishmentSlug: "",
    kitchenPrinter: "",
    cashierPrinter: "",
  },
});

let db: Database.Database;

function initDatabase() {
  const dbPath = join(app.getPath("userData"), "pos.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      establishment_slug TEXT,
      table_number INTEGER,
      seat_label TEXT,
      order_number INTEGER,
      items TEXT,
      total_amount INTEGER,
      status TEXT DEFAULT 'pending',
      payment_status TEXT DEFAULT 'unpaid',
      created_at TEXT,
      synced INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS print_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id TEXT,
      print_type TEXT,
      content TEXT,
      printed INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    minWidth: 720,
    minHeight: 560,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function registerIpcHandlers() {
  ipcMain.handle("settings:get", () => store.store);
  ipcMain.handle("settings:set", (_e, patch: Partial<Settings>) => {
    store.set(patch);
    return store.store;
  });

  ipcMain.handle("printers:list", async () => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length === 0) return [];
    const printers = await wins[0].webContents.getPrintersAsync();
    return printers.map((p) => p.name);
  });

  ipcMain.handle("db:upsertOrders", (_e, orders: LocalOrderRow[]) => {
    const stmt = db.prepare(`
      INSERT INTO orders (id, establishment_slug, table_number, seat_label, order_number, items, total_amount, status, payment_status, created_at, synced)
      VALUES (@id, @establishment_slug, @table_number, @seat_label, @order_number, @items, @total_amount, @status, @payment_status, @created_at, 1)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        payment_status = excluded.payment_status,
        items = excluded.items,
        total_amount = excluded.total_amount
    `);
    const insertMany = db.transaction((rows: LocalOrderRow[]) => {
      for (const row of rows) stmt.run(row);
    });
    insertMany(orders);
    return true;
  });

  ipcMain.handle("db:getOrders", () => {
    return db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 200").all();
  });

  ipcMain.handle("db:setLocalStatus", (_e, { id, status }: { id: string; status: string }) => {
    db.prepare("UPDATE orders SET status = ?, synced = 0 WHERE id = ?").run(status, id);
    return true;
  });

  ipcMain.handle("db:getUnsyncedOrders", () => {
    return db.prepare("SELECT * FROM orders WHERE synced = 0").all() as LocalOrderRow[];
  });

  ipcMain.handle("db:markSynced", (_e, ids: string[]) => {
    const stmt = db.prepare("UPDATE orders SET synced = 1 WHERE id = ?");
    const markMany = db.transaction((idList: string[]) => {
      for (const id of idList) stmt.run(id);
    });
    markMany(ids);
    return true;
  });

  ipcMain.handle(
    "print:receipt",
    async (
      _e,
      { printerName, content }: { printerName: string; content: string }
    ) => {
      return printReceipt(printerName, content);
    }
  );

  ipcMain.handle(
    "db:enqueuePrint",
    (
      _e,
      { orderId, printType, content }: { orderId: string; printType: string; content: string }
    ) => {
      db.prepare(
        "INSERT INTO print_queue (order_id, print_type, content, created_at) VALUES (?, ?, ?, ?)"
      ).run(orderId, printType, content, new Date().toISOString());
      return true;
    }
  );
}

app.whenReady().then(() => {
  initDatabase();
  registerIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
