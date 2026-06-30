import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import { Outlet } from "react-router-dom";

function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-950">
      <Header />

      <div className="flex">
        <Sidebar />

        {/* pt-16 because Header is fixed height 64px */}
        <main className="flex-1 lg:ml-64 pt-16 transition-all duration-300">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;