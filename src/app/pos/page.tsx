"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Establishment {
  _id: string;
  name: string;
  slug: string;
  city?: string;
}

interface TableSeat {
  seatCode: string;
  label: string;
  isActive: boolean;
}

interface TableRow {
  _id: string;
  tableNumber: number;
  name: string;
  zone: string;
  seats: TableSeat[];
  occupiedCount: number;
  state: "empty" | "partial" | "full";
}

const SLUG_STORAGE_KEY = "osonmenu-pos:slug";

const STATE_STYLES: Record<TableRow["state"], string> = {
  empty: "bg-gray-100 border-gray-300 text-gray-700",
  partial: "bg-yellow-100 border-yellow-400 text-yellow-900",
  full: "bg-green-100 border-green-500 text-green-900",
};

const STATE_LABELS: Record<TableRow["state"], string> = {
  empty: "Bo'sh",
  partial: "Qisman band",
  full: "Band",
};

export default function PosHomePage() {
  const [establishments, setEstablishments] = useState<Establishment[] | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [tables, setTables] = useState<TableRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/establishments")
      .then((res) => res.json())
      .then((data) => {
        setEstablishments(data.establishments);
        const saved = localStorage.getItem(SLUG_STORAGE_KEY);
        if (saved && data.establishments.some((e: Establishment) => e.slug === saved)) {
          setSlug(saved);
        }
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/establishments/${slug}/tables`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Xatolik");
        if (!cancelled) setTables(data.tables);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Xatolik");
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [slug]);

  function chooseSlug(s: string) {
    localStorage.setItem(SLUG_STORAGE_KEY, s);
    setSlug(s);
  }

  if (!establishments) {
    return <div className="flex min-h-screen items-center justify-center">Yuklanmoqda...</div>;
  }

  if (!slug) {
    return (
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-4 text-xl font-bold">Restoranni tanlang</h1>
        <div className="flex flex-col gap-2">
          {establishments.map((e) => (
            <button
              key={e.slug}
              onClick={() => chooseSlug(e.slug)}
              className="rounded-lg border bg-white p-4 text-left shadow-sm hover:bg-gray-50"
            >
              <p className="font-medium">{e.name}</p>
              {e.city && <p className="text-sm text-gray-500">{e.city}</p>}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const currentEst = establishments.find((e) => e.slug === slug);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{currentEst?.name ?? slug}</h1>
          <p className="text-sm text-gray-500">Stollar xaritasi</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/pos/admin?slug=${slug}`}
            className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
          >
            Boshqaruv
          </Link>
          <button
            onClick={() => {
              localStorage.removeItem(SLUG_STORAGE_KEY);
              setSlug(null);
              setTables(null);
            }}
            className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm"
          >
            Almashtirish
          </button>
        </div>
      </header>

      {error && <p className="mb-4 text-sm text-red-600">{error}</p>}

      {tables === null ? (
        <p>Yuklanmoqda...</p>
      ) : tables.length === 0 ? (
        <p className="text-gray-500">
          Hali stol qo&apos;shilmagan.{" "}
          <Link href={`/pos/admin?slug=${slug}`} className="underline">
            Boshqaruv
          </Link>{" "}
          bo&apos;limidan qo&apos;shing.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tables.map((t) => (
            <Link
              key={t._id}
              href={`/pos/${t.tableNumber}?slug=${slug}`}
              className={`rounded-xl border-2 p-4 shadow-sm ${STATE_STYLES[t.state]}`}
            >
              <p className="text-lg font-bold">{t.name}</p>
              <p className="text-xs">{t.zone}</p>
              <p className="mt-2 text-sm">
                {t.occupiedCount}/{t.seats.length} joy · {STATE_LABELS[t.state]}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
