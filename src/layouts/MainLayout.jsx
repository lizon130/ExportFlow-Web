import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import { Outlet } from "react-router-dom"

function MainLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 lg:ml-64 transition-all duration-300">
          <div className="">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default MainLayout
