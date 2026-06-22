import React, { useState, useEffect } from "react";
import {
  Home,
  Users,
  Settings,
  BarChart,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LogOut,
  Shield,
  Key,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();

  const menuItems = [
    { icon: <Home size={20} />, label: "Dashboard", path: "/" },
    {
      label: "User Management",
      icon: <UserCog size={20} />,
      children: [
        { icon: <Users size={18} />, label: "Users", path: "/users" },
        { icon: <Shield size={18} />, label: "Roles", path: "/roles" },
        { icon: <Key size={18} />, label: "Rights", path: "/rights/create" },
      ],
    },
    { icon: <BarChart size={20} />, label: "Analytics", path: "/analytics" },
    { icon: <FileText size={20} />, label: "Documents", path: "/documents" },
    { icon: <Calendar size={20} />, label: "Calendar", path: "/calendar" },
    { icon: <Settings size={20} />, label: "Settings", path: "/settings" },
  ];

  const handleLogout = async () => {
    try {
      const userId = localStorage.getItem("userId") || 2;

      await fetch(`http://192.168.9.45:7000/api/Auth/logout?userId=${userId}`, {
        method: "POST",
        headers: {
          accept: "*/*",
        },
      });

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("expireAt");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  useEffect(() => {
    menuItems.forEach((item) => {
      if (item.children) {
        const isChildActive = item.children.some(
          (child) => child.path === location.pathname
        );

        if (isChildActive) {
          setOpenMenus((prev) => ({ ...prev, [item.label]: true }));
        }
      }
    });

    setIsMobileOpen(false);
  }, [location.pathname]);

  const toggleMenu = (label) => {
    if (isCollapsed) setIsCollapsed(false);

    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <>
      {/* Mobile Top Button */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-900 text-white p-2 rounded-xl shadow-lg"
      >
        <Menu size={22} />
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 z-50 h-screen
          bg-gray-900 text-white
          transition-all duration-300
          flex flex-col

          ${isCollapsed ? "lg:w-20" : "lg:w-64"}
          w-72

          ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Mobile Close Button */}
        <button
          onClick={() => setIsMobileOpen(false)}
          className="lg:hidden absolute right-4 top-4 text-gray-300 hover:text-white"
        >
          <X size={24} />
        </button>

        {/* Desktop Collapse Button */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:block absolute -right-3 top-20 bg-gray-800 text-white p-1 rounded-full hover:bg-gray-700"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>

        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-gray-800">
          {!isCollapsed && (
            <h1 className="text-xl font-bold tracking-wide">ExportFlow</h1>
          )}

          {isCollapsed && (
            <div className="hidden lg:flex w-full justify-center text-xl font-bold">
              E
            </div>
          )}
        </div>

        {/* User Profile */}
        <div
          className={`
            ${isCollapsed ? "lg:px-4" : "px-5"}
            py-5 border-b border-gray-800
          `}
        >
          <div
            className={`
              flex items-center
              ${isCollapsed ? "lg:justify-center" : "space-x-3"}
            `}
          >
            <div className="w-11 h-11 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="font-bold">SA</span>
            </div>

            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="font-semibold text-sm truncate">Super Admin</p>
                <p className="text-xs text-gray-400 truncate">
                  superadmin@tusuka.com
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-2">
            {menuItems.map((item, index) => {
              if (item.children) {
                const isOpen = openMenus[item.label];
                const isChildActive = item.children.some(
                  (c) => c.path === location.pathname
                );

                return (
                  <li key={index}>
                    <button
                      onClick={() => toggleMenu(item.label)}
                      className={`
                        w-full flex items-center rounded-xl transition
                        ${
                          isChildActive
                            ? "bg-blue-600/20 text-white"
                            : "text-gray-300 hover:bg-gray-800"
                        }
                        ${
                          isCollapsed
                            ? "lg:justify-center lg:p-3 px-4 py-3 justify-between"
                            : "px-4 py-3 justify-between"
                        }
                      `}
                    >
                      <div className="flex items-center">
                        <span
                          className={
                            isChildActive ? "text-blue-400" : "text-gray-400"
                          }
                        >
                          {item.icon}
                        </span>

                        {!isCollapsed && (
                          <span className="ml-3 font-medium">{item.label}</span>
                        )}
                      </div>

                      {!isCollapsed && (
                        <ChevronDown
                          size={16}
                          className={`transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      )}
                    </button>

                    {isOpen && !isCollapsed && (
                      <ul className="mt-2 ml-5 space-y-1 border-l border-gray-700 pl-3">
                        {item.children.map((child) => {
                          const isActive = location.pathname === child.path;

                          return (
                            <li key={child.label}>
                              <Link
                                to={child.path}
                                className={`
                                  flex items-center px-4 py-2 rounded-lg text-sm transition
                                  ${
                                    isActive
                                      ? "bg-blue-600 text-white"
                                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                                  }
                                `}
                              >
                                <span className="mr-3">{child.icon}</span>
                                <span>{child.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              const isActive = location.pathname === item.path;

              return (
                <li key={item.label}>
                  <Link
                    to={item.path}
                    className={`
                      flex items-center rounded-xl transition relative group
                      ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-800"
                      }
                      ${
                        isCollapsed
                          ? "lg:justify-center lg:p-3 px-4 py-3"
                          : "px-4 py-3"
                      }
                    `}
                  >
                    <span className={isActive ? "text-white" : "text-gray-400"}>
                      {item.icon}
                    </span>

                    {!isCollapsed && (
                      <span className="ml-3 font-medium">{item.label}</span>
                    )}

                    {isCollapsed && (
                      <div className="hidden lg:block absolute left-full ml-3 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none shadow-lg">
                        {item.label}
                      </div>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className={`
              flex items-center w-full rounded-xl
              text-gray-300 hover:bg-red-500/10 hover:text-red-300
              transition
              ${
                isCollapsed
                  ? "lg:justify-center lg:p-3 px-4 py-3"
                  : "px-4 py-3"
              }
            `}
          >
            <LogOut size={20} />
            {!isCollapsed && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;