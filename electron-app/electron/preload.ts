import { contextBridge, ipcRenderer } from "electron";

export interface Settings {
  serverUrl: string;
  establishmentSlug: string;
  kitchenPrinter: string;
  cashierPrinter: string;
}

export interface LocalOrderRow {
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

const api = {
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke("settings:get"),
    set: (patch: Partial<Settings>): Promise<Settings> =>
      ipcRenderer.invoke("settings:set", patch),
  },
  printers: {
    list: (): Promise<string[]> => ipcRenderer.invoke("printers:list"),
  },
  print: {
    receipt: (printerName: string, content: string): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke("print:receipt", { printerName, content }),
  },
  db: {
    upsertOrders: (orders: LocalOrderRow[]): Promise<boolean> =>
      ipcRenderer.invoke("db:upsertOrders", orders),
    getOrders: (): Promise<LocalOrderRow[]> => ipcRenderer.invoke("db:getOrders"),
    setLocalStatus: (id: string, status: string): Promise<boolean> =>
      ipcRenderer.invoke("db:setLocalStatus", { id, status }),
    getUnsyncedOrders: (): Promise<LocalOrderRow[]> => ipcRenderer.invoke("db:getUnsyncedOrders"),
    markSynced: (ids: string[]): Promise<boolean> => ipcRenderer.invoke("db:markSynced", ids),
    enqueuePrint: (orderId: string, printType: "kitchen" | "cashier", content: string): Promise<boolean> =>
      ipcRenderer.invoke("db:enqueuePrint", { orderId, printType, content }),
  },
};

export type Api = typeof api;

contextBridge.exposeInMainWorld("api", api);
