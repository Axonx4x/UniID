import React from "react";
import { Outlet } from "react-router-dom";
import { DemoBanner } from "./DemoBanner";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";

export const Layout: React.FC = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <DemoBanner />
      <Navbar />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};
