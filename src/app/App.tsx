// src/app/App.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import { AppShell } from "./layout/AppShell";
import { MapView } from "./routes/MapView";
import { SettingsView } from "./routes/SettingsView";
import { NotFoundView } from "./routes/NotFoundView";

export const App: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="*" element={<NotFoundView />} />
      </Routes>
    </AppShell>
  );
};
