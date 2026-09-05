"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/format";

interface OrderRow {
  _id: string;
  orderNumber: number;
  totalAmount: number;
  items: { name: string; quantity: number; price: number }[];
}

interface SeatGroup {
  seatCode: string;
  seatLabel: string;
  orders: OrderRow[];
  total: number;
}

type PaymentMethod = "cash" | "card" | "click" | "payme";

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "Naqd" },
  { key: "card", label: "Karta" },
  { key: "click", label: "Click" },
  { key: "payme", label: "Payme" },
];

export default function TablePayPage({
  params,
  searchParams,
}: {
  params: Promise<{ tableNumber: string }>;
  searchParams: Promise<{ slug?: string }>;
}) {
  const { tableNumber } = use(params);
  const { slug } = use(searchParams);
  const router = useRouter();

  const [seats, setSeats] = useState<SeatGroup[] | null>(null);
  const [grandTotal, setGrandTotal] = useState(0);
  const [selectedSeat, setSelectedSeat] = useState<"table" | string>("table");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<{ receiptNumber: string; totalAmount: number } | null>(
    null
  );

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/orders/table/${tableNumber}?slug=${slug}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Xatolik");
        setSeats(data.seats);
        setGrandTotal(data.grandTotal);
      })
      .catch((err) => setError(err.message));
  }, [slug, tableNumber]);

  async function confirmPayment() {
    if (!slug) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/orders/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          establishmentSlug: slug,
          tableNumber: Number(tableNumber),
          paymentType: selectedSeat === "table" ? "table" : "seat",
          seatCode: selectedSeat === "table" ? undefined : selectedSeat,
          paymentMethod: method,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setSuccess({ receiptNumber: data.payment.receiptNumber, totalAmount: data.payment.totalAmount });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-gray-50 p-6 text-center">
        <div className="text-6xl">✅</div>
        <h1 className="text-2xl font-bold">To&apos;lov qabul qilindi</h1>
        <p className="text-gray-500">
          {success.receiptNumber} · {formatMoney(success.totalAmount)}
        </p>
        <button
          onClick={() => router.push(`/pos?slug=${slug}`)}
          className="mt-4 rounded-lg bg-black px-6 py-3 text-white"
        >
          Stollarga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-4">
        <Link href={`/pos/${tableNumber}?slug=${slug ?? ""}`} className="text-sm text-gray-500">
          ← Orqaga
        </Link>
        <h1 className="text-xl font-bold">Stol {tableNumber} — To&apos;lov</h1>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {!seats ? (
        <p>Yuklanmoqda...</p>
      ) : seats.length === 0 ? (
        <p className="text-gray-500">To&apos;lanmagan buyurtma yo&apos;q</p>
      ) : (
        <>
          <div className="mb-4 flex flex-col gap-2">
            <button
              onClick={() => setSelectedSeat("table")}
              className={`rounded-xl border-2 p-4 text-left shadow-sm ${
                selectedSeat === "table" ? "border-black" : "border-transparent bg-white"
              }`}
            >
              <p className="font-semibold">Birgalikda to&apos;lov (barcha joylar)</p>
              <p className="text-sm text-gray-500">{formatMoney(grandTotal)}</p>
            </button>
            {seats.map((s) => (
              <button
                key={s.seatCode}
                onClick={() => setSelectedSeat(s.seatCode)}
                className={`rounded-xl border-2 p-4 text-left shadow-sm ${
                  selectedSeat === s.seatCode ? "border-black" : "border-transparent bg-white"
                }`}
              >
                <p className="font-semibold">Joy {s.seatLabel}</p>
                <p className="text-sm text-gray-500">
                  {s.orders.length} buyurtma · {formatMoney(s.total)}
                </p>
              </button>
            ))}
          </div>

          <div className="mb-6">
            <p className="mb-2 text-sm font-medium text-gray-700">To&apos;lov usuli</p>
            <div className="grid grid-cols-4 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMethod(m.key)}
                  className={`rounded-lg py-2 text-sm ${
                    method === m.key ? "bg-black text-white" : "bg-white shadow-sm"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={submitting}
            onClick={confirmPayment}
            className="w-full rounded-lg bg-black py-3 text-white disabled:opacity-50"
          >
            Tasdiqlash ·{" "}
            {formatMoney(selectedSeat === "table" ? grandTotal : seats.find((s) => s.seatCode === selectedSeat)?.total ?? 0)}
          </button>
        </>
      )}
    </div>
  );
}
