"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { formatMoney } from "@/lib/format";

interface Establishment {
  _id: string;
  name: string;
  slug: string;
}

interface Seat {
  seatCode: string;
  label: string;
  qrUrl: string;
}

interface TableRow {
  _id: string;
  tableNumber: number;
  name: string;
  zone: string;
  capacity: number;
  seats: Seat[];
}

interface Stats {
  todayOrders: number;
  todayRevenue: number;
  activeTables: number;
}

export default function AdminPage() {
  const [slug] = useState<string | null>(() =>
    typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("slug")
  );
  const [refreshKey, setRefreshKey] = useState(0);
  const [establishment, setEstablishment] = useState<Establishment | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    tableNumber: "",
    name: "",
    zone: "Asosiy zal",
    capacity: "4",
    seats: "A,B,C,D",
  });
  const [submitting, setSubmitting] = useState(false);

  const [qrModal, setQrModal] = useState<{ label: string; dataUrl: string } | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      try {
        const [estRes, statsRes, tablesRes] = await Promise.all([
          fetch("/api/establishments").then((r) => r.json()),
          fetch(`/api/establishments/${slug}/stats`).then((r) => r.json()),
          fetch(`/api/establishments/${slug}/tables`).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setEstablishment(
          estRes.establishments.find((e: Establishment) => e.slug === slug) ?? null
        );
        setStats(statsRes);
        setTables(tablesRes.tables);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Xatolik");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [slug, refreshKey]);

  async function createTable(e: React.FormEvent) {
    e.preventDefault();
    if (!slug) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/establishments/${slug}/tables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tableNumber: Number(form.tableNumber),
          name: form.name || `${form.tableNumber}-stol`,
          zone: form.zone,
          capacity: Number(form.capacity),
          seats: form.seats.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Xatolik");
      setForm({ tableNumber: "", name: "", zone: "Asosiy zal", capacity: "4", seats: "A,B,C,D" });
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setSubmitting(false);
    }
  }

  async function showQr(seat: Seat) {
    const dataUrl = await QRCode.toDataURL(seat.qrUrl, { width: 320, margin: 1 });
    setQrModal({ label: seat.label, dataUrl });
  }

  if (!slug) return <div className="p-6">slug parametri kerak</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{establishment?.name ?? slug} — Boshqaruv</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/pos/admin/restaurants`} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
            Restoranlar
          </Link>
          <Link href={`/pos?slug=${slug}`} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
            Stollarga qaytish
          </Link>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {stats && (
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard label="Bugungi buyurtmalar" value={String(stats.todayOrders)} />
          <StatCard label="Bugungi daromad" value={formatMoney(stats.todayRevenue)} />
          <StatCard label="Faol stollar" value={String(stats.activeTables)} />
        </div>
      )}

      <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Yangi stol qo&apos;shish</h2>
        <form onSubmit={createTable} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <input
            required
            type="number"
            placeholder="Stol raqami"
            value={form.tableNumber}
            onChange={(e) => setForm((f) => ({ ...f, tableNumber: e.target.value }))}
            className="rounded-lg border p-2"
          />
          <input
            placeholder="Nomi (masalan: 1-stol)"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="rounded-lg border p-2"
          />
          <input
            placeholder="Zona"
            value={form.zone}
            onChange={(e) => setForm((f) => ({ ...f, zone: e.target.value }))}
            className="rounded-lg border p-2"
          />
          <input
            type="number"
            placeholder="Sig'im"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
            className="rounded-lg border p-2"
          />
          <input
            placeholder="Joylar (A,B,C)"
            value={form.seats}
            onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))}
            className="col-span-2 rounded-lg border p-2 sm:col-span-1"
          />
          <button
            disabled={submitting}
            className="col-span-2 rounded-lg bg-black py-2 text-white disabled:opacity-50 sm:col-span-3"
          >
            Qo&apos;shish
          </button>
        </form>
      </section>

      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-semibold">Stollar</h2>
        <div className="flex flex-col gap-3">
          {tables.map((t) => (
            <div key={t._id} className="rounded-lg border p-3">
              <p className="mb-2 font-medium">
                {t.name} · {t.zone} · {t.capacity} kishi
              </p>
              <div className="flex flex-wrap gap-2">
                {t.seats.map((s) => (
                  <button
                    key={s.seatCode}
                    onClick={() => showQr(s)}
                    className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm"
                  >
                    {s.label} QR
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {qrModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setQrModal(null)}
        >
          <div className="rounded-xl bg-white p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-3 font-semibold">Joy {qrModal.label}</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrModal.dataUrl} alt={`QR ${qrModal.label}`} className="mx-auto" />
            <a
              href={qrModal.dataUrl}
              download={`qr-${qrModal.label}.png`}
              className="mt-3 inline-block rounded-lg bg-black px-4 py-2 text-sm text-white"
            >
              Yuklab olish
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
