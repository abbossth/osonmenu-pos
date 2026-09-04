import { useEffect, useState } from "react";
import type { Settings } from "../../electron/preload";

interface Props {
  initial: Settings;
  onSaved: (settings: Settings) => void;
}

export default function Setup({ initial, onSaved }: Props) {
  const [form, setForm] = useState(initial);
  const [printers, setPrinters] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.api.printers.list().then(setPrinters);
  }, []);

  async function save() {
    if (!form.serverUrl || !form.establishmentSlug) {
      setError("Server URL va restoran slug talab qilinadi");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await window.api.settings.set(form);
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Xatolik");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "40px auto", padding: 24 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>OsonMenu POS — Sozlash</h1>

      <Field label="Server URL">
        <input
          value={form.serverUrl}
          onChange={(e) => setForm((f) => ({ ...f, serverUrl: e.target.value }))}
          placeholder="https://pos.osonmenu.uz"
          style={inputStyle}
        />
      </Field>

      <Field label="Restoran slug">
        <input
          value={form.establishmentSlug}
          onChange={(e) => setForm((f) => ({ ...f, establishmentSlug: e.target.value }))}
          placeholder="cafe-bahor"
          style={inputStyle}
        />
      </Field>

      <Field label="Oshpaz printer">
        <select
          value={form.kitchenPrinter}
          onChange={(e) => setForm((f) => ({ ...f, kitchenPrinter: e.target.value }))}
          style={inputStyle}
        >
          <option value="">— tanlanmagan —</option>
          {printers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Kassir printer">
        <select
          value={form.cashierPrinter}
          onChange={(e) => setForm((f) => ({ ...f, cashierPrinter: e.target.value }))}
          style={inputStyle}
        >
          <option value="">— tanlanmagan —</option>
          {printers.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </Field>

      {error && <p style={{ color: "#dc2626", fontSize: 13, marginBottom: 12 }}>{error}</p>}

      <button
        onClick={save}
        disabled={saving}
        style={{
          width: "100%",
          padding: "10px 0",
          background: "#111",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          opacity: saving ? 0.6 : 1,
        }}
      >
        Saqlash
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: "block", fontSize: 13, marginBottom: 6, color: "#555" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 14,
};
