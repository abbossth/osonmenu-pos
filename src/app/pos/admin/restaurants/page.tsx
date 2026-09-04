"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Establishment {
  _id: string;
  name: string;
  slug: string;
  city?: string;
  phone?: string;
  currency: string;
}

export default function RestaurantsPage() {
  const [establishments, setEstablishments] = useState<Establishment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/establishments")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Xatolik");
        setEstablishments(data.establishments);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="mb-6">
        <Link href="/pos" className="text-sm text-gray-500">
          ← Orqaga
        </Link>
        <h1 className="text-xl font-bold">Restoranlar (OsonMenu)</h1>
      </header>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!establishments ? (
        <p>Yuklanmoqda...</p>
      ) : (
        <div className="flex flex-col gap-2">
          {establishments.map((e) => (
            <Link
              key={e.slug}
              href={`/pos/admin?slug=${e.slug}`}
              className="rounded-lg bg-white p-4 shadow-sm hover:bg-gray-100"
            >
              <p className="font-medium">{e.name}</p>
              <p className="text-sm text-gray-500">
                {e.slug} {e.city ? `· ${e.city}` : ""} · {e.currency}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
