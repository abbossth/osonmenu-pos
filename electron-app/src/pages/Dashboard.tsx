import { useEffect, useMemo, useRef, useState } from "react";
import type { Settings } from "../../electron/preload";
import { OrderManager, ConnectionState } from "../utils/orderManager";
import { startSyncLoop } from "../utils/sync";
import { buildCashierReceipt, buildKitchenReceipt } from "../utils/printer";
import type { OrderStatus, RemoteOrder } from "../types";

interface Props {
  settings: Settings;
  onOpenSettings: () => void;
}

const FILTERS: { key: OrderStatus | "all"; label: string }[] = [
  { key: "pending", label: "Kutmoqda" },
  { key: "preparing", label: "Tayyorlanmoqda" },
  { key: "ready", label: "Tayyor" },
];

const NEXT_STATUS: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "confirmed",
  confirmed: "preparing",
  preparing: "ready",
  ready: "completed",
};

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  pending: "Tasdiqlash",
  confirmed: "Tayyorlanmoqda",
  preparing: "Tayyor",
  ready: "Yakunlash",
};

function formatMoney(n: number): string {
  return `${n.toLocaleString("ru-RU")} so'm`;
}

export default function Dashboard({ settings, onOpenSettings }: Props) {
  const [orders, setOrders] = useState<RemoteOrder[]>([]);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [filter, setFilter] = useState<OrderStatus | "all">("pending");
  const managerRef = useRef<OrderManager | null>(null);

  useEffect(() => {
    let cancelled = false;
    let manager: OrderManager | null = null;

    (async () => {
      let pusherKey = "";
      let pusherCluster = "ap2";
      try {
        const res = await fetch(
          `${settings.serverUrl}/api/websocket?establishmentSlug=${settings.establishmentSlug}`
        );
        const data = await res.json();
        pusherKey = data.key ?? "";
        pusherCluster = data.cluster ?? "ap2";
      } catch (err) {
        console.error("[Dashboard] Failed to load Pusher config, staying on polling", err);
      }

      if (cancelled) return;
      manager = new OrderManager({
        serverUrl: settings.serverUrl,
        establishmentSlug: settings.establishmentSlug,
        pusherKey,
        pusherCluster,
        onOrders: (incoming) => setOrders(incoming),
        onConnectionState: setConnection,
      });
      managerRef.current = manager;
      manager.start();
    })();

    const stopSync = startSyncLoop({
      serverUrl: settings.serverUrl,
      establishmentSlug: settings.establishmentSlug,
    });

    return () => {
      cancelled = true;
      manager?.stop();
      stopSync();
    };
  }, [settings.serverUrl, settings.establishmentSlug]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, preparing: 0, ready: 0 };
    for (const o of orders) {
      if (o.status === "confirmed") c.pending++;
      else if (c[o.status] !== undefined) c[o.status]++;
    }
    return c;
  }, [orders]);

  const visibleOrders = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "pending") return o.status === "pending" || o.status === "confirmed";
    return o.status === filter;
  });

  async function advance(order: RemoteOrder) {
    const next = NEXT_STATUS[order.status];
    if (!next) return;
    await window.api.db.setLocalStatus(order._id, next);
    setOrders((prev) => prev.map((o) => (o._id === order._id ? { ...o, status: next } : o)));
    try {
      await fetch(`${settings.serverUrl}/api/orders/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      await window.api.db.markSynced([order._id]);
    } catch (err) {
      console.error("[Dashboard] Offline — status change queued for sync", err);
    }
  }

  async function printKitchen(order: RemoteOrder) {
    const content = buildKitchenReceipt(order);
    await window.api.db.enqueuePrint(order._id, "kitchen", content);
    if (settings.kitchenPrinter) {
      await window.api.print.receipt(settings.kitchenPrinter, content);
    }
  }

  async function printCashier(order: RemoteOrder) {
    const content = buildCashierReceipt(order, settings.establishmentSlug);
    await window.api.db.enqueuePrint(order._id, "cashier", content);
    if (settings.cashierPrinter) {
      await window.api.print.receipt(settings.cashierPrinter, content);
    }
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          background: "#fff",
          borderBottom: "1px solid #eee",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <strong>OsonMenu POS</strong>
          <ConnectionBadge state={connection} />
        </div>
        <button onClick={onOpenSettings} style={{ background: "none", border: "none", fontSize: 18 }}>
          ⚙
        </button>
      </header>

      <div style={{ display: "flex", gap: 8, padding: "12px 20px" }}>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              background: filter === f.key ? "#111" : "#fff",
              color: filter === f.key ? "#fff" : "#333",
              boxShadow: filter === f.key ? "none" : "0 1px 2px rgba(0,0,0,0.08)",
            }}
          >
            {f.label} ({counts[f.key === "pending" ? "pending" : f.key] ?? 0})
          </button>
        ))}
      </div>

      <main style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {visibleOrders.length === 0 && <p style={{ color: "#888" }}>Buyurtmalar yo&apos;q</p>}
        {visibleOrders.map((order) => (
          <div
            key={order._id}
            style={{ background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <strong>
                #{order.orderNumber} · {order.seatLabel}
              </strong>
              <span style={{ color: "#999", fontSize: 12 }}>
                {new Date(order.createdAt).toLocaleTimeString("uz-UZ", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <ul style={{ margin: "0 0 8px", paddingLeft: 18, fontSize: 14 }}>
              {order.items.map((item, idx) => (
                <li key={idx}>
                  {item.quantity}× {item.name}
                  {item.note && <span style={{ color: "#999" }}> [{item.note}]</span>}
                </li>
              ))}
            </ul>
            <p style={{ fontWeight: 600, marginBottom: 12 }}>Jami: {formatMoney(order.totalAmount)}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {NEXT_STATUS[order.status] && (
                <button onClick={() => advance(order)} style={actionBtnStyle("#111", "#fff")}>
                  ✓ {NEXT_LABEL[order.status]}
                </button>
              )}
              <button onClick={() => printKitchen(order)} style={actionBtnStyle("#f3f4f6", "#111")}>
                🖨 Oshpaz
              </button>
              <button onClick={() => printCashier(order)} style={actionBtnStyle("#f3f4f6", "#111")}>
                🧾 Kassir
              </button>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

function ConnectionBadge({ state }: { state: ConnectionState }) {
  const config = {
    websocket: { color: "#16a34a", label: "🟢 WebSocket" },
    polling: { color: "#ca8a04", label: "🟡 Polling" },
    connecting: { color: "#9ca3af", label: "⚪ Ulanmoqda..." },
  }[state];

  return <span style={{ fontSize: 12, color: config.color }}>{config.label}</span>;
}

function actionBtnStyle(bg: string, color: string): React.CSSProperties {
  return {
    padding: "8px 14px",
    borderRadius: 8,
    border: "none",
    background: bg,
    color,
    fontSize: 13,
  };
}
