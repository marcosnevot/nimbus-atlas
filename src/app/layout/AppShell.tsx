// src/app/layout/AppShell.tsx
import React from "react";
import { TopBar } from "./TopBar";

type AppShellProps = {
  children: React.ReactNode;
};

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  return (
    <div className="na-app-shell">
      <TopBar />
      <main className="na-app-shell__main">{children}</main>
    </div>
  );
};
