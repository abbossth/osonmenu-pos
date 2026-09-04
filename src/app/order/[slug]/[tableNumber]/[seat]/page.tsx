"use client";

import { use, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format";

interface MenuItem {
  _id: string;
  name: string;
  price: number;
  imageUrl?: string;
  description?: string;
  badge?: "popular" | "new" | null;
}

interface MenuCategory {
  _id: string;
  name: string;
  items: MenuItem[];
}

interface MenuResponse {
  name: string;
  slug: string;
  logoUrl?: string;
  currency: string;
  categories: MenuCategory[];
}

interface CartLine {
  itemId: string;
  name: string;
  price: number;
  quantity: number;
  note?: string;
}

export default function OrderPage({
  params,
}: {
  params: Promise<{ slug: string; tableNumber: string; seat: string }>;
}) {
  const { slug, tableNumber, seat } = use(params);

  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const [submitting, setSubmitting] = useState(false);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/establishments/${slug}/menu`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Xatolik");
        return res.json();
      })
      .then(setMenu)
      .catch((err) => setError(err.message));
  }, [slug]);

  const cartLines = useMemo(() => Object.values(cart), [cart]);
  const total = useMemo(
    () => cartLines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    [cartLines]
  );

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev[item._id];
      return {
        ...prev,
        [item._id]: {
          itemId: item._id,
          name: item.name,
          price: item.price,
          quantity: (existing?.quantity ?? 0) + 1,
        },
      };
    });
  }

  function changeQuantity(itemId: string, delta: number) {
    setCart((prev) => {
      const existing = prev[itemId];
      if (!existing) return prev;
      const quantity = existing.quantity + delta;
      const next = { ...prev };
      if (quantity <= 0) {
        delete next[itemId];
      } else {
        next[itemId] = { ...existing, quantity };
      }
      return next;
    });
  }

  async function submitOrder() {
    if (cartLines.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          establishmentSlug: slug,
          tableNumber: Number(tableNumber),
          seatCode: seat,
          items: cartLines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik yuz berdi");
      setOrderNumber(data.order.orderNumber);
      setCart({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  if (orderNumber !== null) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-bold">#{orderNumber} — Buyurtmangiz qabul qilindi</h1>
        <p className="text-gray-500">Tez orada tayyorlanadi</p>
        <button
          className="mt-6 rounded-lg bg-black px-6 py-3 text-white"
          onClick={() => setOrderNumber(null)}
        >
          Yana buyurtma berish
        </button>
      </div>
    );
  }

  if (error && !menu) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center text-red-600">
        {error}
      </div>
    );
  }

  if (!menu) {
    return <div className="flex min-h-screen items-center justify-center">Yuklanmoqda...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-10 bg-white p-4 shadow-sm">
        <h1 className="text-lg font-bold">{menu.name}</h1>
        <p className="text-sm text-gray-500">
          Stol {tableNumber} · Joy {seat}
        </p>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {menu.categories.map((cat) => (
          <section key={cat._id} className="mb-6">
            <h2 className="mb-2 text-base font-semibold">{cat.name}</h2>
            <div className="flex flex-col gap-2">
              {cat.items.map((item) => {
                const line = cart[item._id];
                return (
                  <div
                    key={item._id}
                    className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatMoney(item.price, menu.currency)}
                      </p>
                    </div>
                    {line ? (
                      <div className="flex items-center gap-2">
                        <button
                          className="h-8 w-8 rounded-full bg-gray-100 text-lg"
                          onClick={() => changeQuantity(item._id, -1)}
                        >
                          −
                        </button>
                        <span className="w-4 text-center">{line.quantity}</span>
                        <button
                          className="h-8 w-8 rounded-full bg-gray-100 text-lg"
                          onClick={() => changeQuantity(item._id, 1)}
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        className="rounded-lg bg-black px-3 py-2 text-sm text-white"
                        onClick={() => addToCart(item)}
                      >
                        Qo&apos;shish
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </main>

      {cartLines.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 border-t bg-white p-4 shadow-lg">
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
          <button
            disabled={submitting}
            onClick={submitOrder}
            className="flex w-full items-center justify-between rounded-lg bg-black px-4 py-3 text-white disabled:opacity-50"
          >
            <span>Buyurtma berish ({cartLines.length})</span>
            <span>{formatMoney(total, menu.currency)}</span>
          </button>
        </div>
      )}
    </div>
  );
}
