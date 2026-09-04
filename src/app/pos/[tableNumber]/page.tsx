"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { formatMoney } from "@/lib/format";

type OrderStatus = "pending" | "confirmed" | "preparing" | "ready" | "completed" | "cancelled";

interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

interface OrderRow {
  _id: string;
  seatLabel: string;
  orderNumber: number;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  createdAt: string;
}

const FILTERS: { key: "all" | OrderStatus; label: string }[] = [
  { key: "all", label: "Hammasi" },
  { key: "pending", label: "Kutmoqda" },
  { key: "preparing", label: "Tayyorlanmoqda" },
  { key: "ready", label: "Tayyor" },
];

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  pending: { next: "confirmed", label: "Tasdiqlash" },
  confirmed: { next: "preparing", label: "Tayyorlanmoqda" },
  preparing: { next: "ready", label: "Tayyor" },
  ready: { next: "completed", label: "Yakunlash" },
};

export default function TableOrdersPage({
  params,
}: {
  params: Promise<{ tableNumber: string }>;
}) {
  const { tableNumber } = use(params);
  const [slug] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("slug")
  );
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/orders/pending?establishmentSlug=${slug}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Xatolik");
        if (!cancelled) {
          setOrders(
            data.orders.filter((o: OrderRow & { tableNumber: number }) => String(o.tableNumber) === tableNumber)
          );
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Xatolik");
      }
    }

    load();
    const interval = setInterval(load, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [slug, tableNumber]);

  const visibleOrders = orders.filter((o) => filter === "all" || o.status === filter);

  async function advanceStatus(order: OrderRow) {
    const transition = NEXT_STATUS[order.status];
    if (!transition) return;
    try {
      const res = await fetch(`/api/orders/${order._id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: transition.next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setOrders((prev) => prev.map((o) => (o._id === order._id ? data.order : o)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    }
  }

  async function sendToPrint(order: OrderRow) {
    try {
      await fetch(`/api/orders/${order._id}/print`, { method: "POST" });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-24">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Stol {tableNumber}</h1>
          <p className="text-sm text-gray-500">Buyurtmalar</p>
        </div>
        <Link
          href={`/pos/${tableNumber}/pay?slug=${slug ?? ""}`}
          className="rounded-lg bg-black px-4 py-2 text-sm text-white"
        >
          To&apos;lov
        </Link>
      </header>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm ${
              filter === f.key ? "bg-black text-white" : "bg-white text-gray-700 shadow-sm"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      <div className="flex flex-col gap-3">
        {visibleOrders.length === 0 && <p className="text-gray-500">Buyurtmalar yo&apos;q</p>}
        {visibleOrders.map((order) => {
          const transition = NEXT_STATUS[order.status];
          return (
            <div key={order._id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-bold">
                  #{order.orderNumber} · {order.seatLabel}
                </p>
                <span className="text-xs text-gray-400">
                  {new Date(order.createdAt).toLocaleTimeString("uz-UZ", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <ul className="mb-2 text-sm text-gray-700">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.quantity}× {item.name}
                    {item.note && <span className="text-gray-400"> [{item.note}]</span>}
                  </li>
                ))}
              </ul>
              <p className="mb-3 font-semibold">Jami: {formatMoney(order.totalAmount)}</p>
              <div className="flex flex-wrap gap-2">
                {transition && (
                  <button
                    onClick={() => advanceStatus(order)}
                    className="rounded-lg bg-black px-3 py-2 text-sm text-white"
                  >
                    {transition.label}
                  </button>
                )}
                <button
                  onClick={() => sendToPrint(order)}
                  className="rounded-lg bg-gray-100 px-3 py-2 text-sm"
                >
                  🧾 Chek
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
