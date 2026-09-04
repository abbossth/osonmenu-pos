import { useEffect, useState } from "react";
import Setup from "./pages/Setup";
import Dashboard from "./pages/Dashboard";
import type { Settings } from "../electron/preload";

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    window.api.settings.get().then(setSettings);
  }, []);

  if (!settings) {
    return <div style={{ padding: 24 }}>Yuklanmoqda...</div>;
  }

  const isConfigured = Boolean(settings.serverUrl && settings.establishmentSlug);

  if (!isConfigured || showSetup) {
    return (
      <Setup
        initial={settings}
        onSaved={(updated) => {
          setSettings(updated);
          setShowSetup(false);
        }}
      />
    );
  }

  return <Dashboard settings={settings} onOpenSettings={() => setShowSetup(true)} />;
}
