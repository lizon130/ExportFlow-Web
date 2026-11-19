import { useState } from "react";
import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  // Desktop e sidebar collapse on/off, mobile e overlay open state
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <Header
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
        onMenuClick={() => setMobileOpen(true)}
      />

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />

      {/* pt-16 because Header is fixed height 64px.
          Sidebar collapse korle body full width e stretch hoy. */}
      <main
        className={`pt-16 min-h-[calc(100vh-4rem)] transition-[margin-left] duration-300 ${
          collapsed ? "ml-0" : "lg:ml-64"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;
