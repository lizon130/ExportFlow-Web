import React, { useEffect, useState } from "react";
import {
  Home,
  Users,
  Settings,
  FileText,
  Calendar,
  ChevronDown,
  LogOut,
  Shield,
  Key,
  UserCog,
  Menu,
  X,
  ClipboardList,
  Ship,
  Building2,
  BadgeDollarSign,
  ScrollText,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState({});
  const location = useLocation();

  const menuItems = [
    { icon: <Home size={20} />, label: "Dashboard", path: "/" },

    {
      label: "Documents",
      icon: <FileText size={20} />,
      children: [
        {
          icon: <ClipboardList size={18} />,
          label: "Export Document",
          path: "/documents/export-document",
        },
        {
          icon: <ScrollText size={18} />,
          label: "B/L Date Check",
          path: "/documents/bl-date-check",
        },
        {
          icon: <Ship size={18} />,
          label: "Shipping",
          path: "/documents/shipping",
        },
        {
          icon: <Building2 size={18} />,
          label: "Bank Submit",
          path: "/documents/bank-submit",
        },
        {
          icon: <BadgeDollarSign size={18} />,
          label: "Realization",
          path: "/documents/realization",
        },
      ],
    },

    {
      label: "User Management",
      icon: <UserCog size={20} />,
      children: [
        { icon: <Users size={18} />, label: "Users", path: "/users" },
        { icon: <Shield size={18} />, label: "Roles", path: "/roles" },
        { icon: <Key size={18} />, label: "Rights", path: "/rights/create" },
      ],
    },

    { icon: <ScrollText size={20} />, label: "Logs & Feedback", path: "/logs" },
    { icon: <Calendar size={20} />, label: "Calendar", path: "/calendar" },
    { icon: <Settings size={20} />, label: "Settings", path: "/settings" },
  ];

  const isRouteActive = (path) => {
    if (!path) return false;

    if (path === "/") {
      return location.pathname === "/";
    }

    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const isMenuGroupActive = (item) => {
    if (!item.children) return false;
    return item.children.some((child) => isRouteActive(child.path));
  };

  useEffect(() => {
    setOpenMenus((prev) => {
      const updatedMenus = { ...prev };

      menuItems.forEach((item) => {
        if (item.children && isMenuGroupActive(item)) {
          updatedMenus[item.label] = true;
        }
      });

      return updatedMenus;
    });

    setIsMobileOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  const handleLogout = async () => {
    try {
      const token =
        localStorage.getItem("accessToken") || localStorage.getItem("token");

      await fetch("http://192.168.9.45:7000/api/Auth/logout", {
        method: "POST",
        headers: {
          accept: "*/*",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("expireAt");
      localStorage.removeItem("user");
      localStorage.removeItem("userId");
      localStorage.removeItem("token");
      localStorage.removeItem("token_expiry");

      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      localStorage.clear();
      window.location.href = "/login";
    }
  };

  const parentButtonClass = (isActive) => `
    !w-full !flex !items-center !justify-between !rounded-xl
    !px-4 !py-3 !border-0 !outline-none !ring-0 !shadow-none
    !transition !duration-200
    focus:!outline-none focus:!ring-0 focus:!shadow-none
    active:!outline-none active:!ring-0 active:!shadow-none
    ${
      isActive
        ? "!bg-slate-800 !text-white"
        : "!bg-transparent !text-gray-300 hover:!bg-slate-800 hover:!text-white"
    }
  `;

  const childLinkClass = (isActive) => `
    !flex !items-center !px-4 !py-2 !rounded-lg !text-sm
    !border-0 !outline-none !ring-0 !shadow-none !no-underline
    !transition !duration-200
    focus:!outline-none focus:!ring-0 focus:!shadow-none
    active:!outline-none active:!ring-0 active:!shadow-none
    ${
      isActive
        ? "!bg-blue-600 !text-white"
        : "!bg-transparent !text-gray-400 hover:!text-white hover:!bg-slate-800"
    }
  `;

  const singleLinkClass = (isActive) => `
    !flex !items-center !rounded-xl !px-4 !py-3
    !border-0 !outline-none !ring-0 !shadow-none !no-underline
    !transition !duration-200
    focus:!outline-none focus:!ring-0 focus:!shadow-none
    active:!outline-none active:!ring-0 active:!shadow-none
    ${
      isActive
        ? "!bg-blue-600 !text-white"
        : "!bg-transparent !text-gray-300 hover:!bg-slate-800 hover:!text-white"
    }
  `;

  return (
    <>
      {/* Mobile menu open button */}
      <button
        type="button"
        onClick={() => setIsMobileOpen(true)}
        className="lg:!hidden !fixed !top-4 !left-4 !z-50 !bg-gray-900 !text-white !p-2 !rounded-xl !shadow-lg !border-0 focus:!outline-none focus:!ring-0"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="lg:!hidden !fixed !inset-0 !bg-black/60 !z-40"
        />
      )}

      <aside
        className={`
          !fixed !left-0 !top-0 !z-50 !h-screen
          !w-72 lg:!w-64
          !bg-gray-900 !text-white
          !transition-transform !duration-300
          !flex !flex-col
          ${isMobileOpen ? "!translate-x-0" : "-translate-x-full"}
          lg:!translate-x-0
        `}
      >
        {/* Mobile close button */}
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          className="lg:!hidden !absolute !right-4 !top-4 !text-gray-300 hover:!text-white !bg-transparent !border-0 focus:!outline-none focus:!ring-0"
        >
          <X size={24} />
        </button>

        {/* Logo */}
        <div className="!h-16 !flex !items-center !px-5 !border-b !border-gray-800">
          <Link
            to="/"
            className="!flex !items-center !gap-3 !no-underline !bg-transparent !border-0 focus:!outline-none focus:!ring-0"
          >
            <img
              src="/favicon.png"
              alt="ExportFlow Logo"
              className="!h-10 !w-10 !rounded-xl !object-contain !p-1"
            />

            <span className="!text-lg !font-bold !tracking-wide !text-white">
              ExportFlow
            </span>
          </Link>
        </div>

        {/* User Profile */}
        <div className="!px-5 !py-5 !border-b !border-gray-800">
          <div className="!flex !items-center !space-x-3">
            <div className="!w-11 !h-11 !bg-gradient-to-br !from-blue-500 !to-purple-600 !rounded-2xl !flex !items-center !justify-center !shadow-lg">
              <span className="!font-bold !text-white">SA</span>
            </div>

            <div className="!flex-1 !overflow-hidden">
              <p className="!font-semibold !text-sm !truncate !text-white">
                Super Admin
              </p>
              <p className="!text-xs !text-gray-400 !truncate">
                superadmin@tusuka.com
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="!flex-1 !p-4 !overflow-y-auto">
          <ul className="!space-y-2 !p-0 !m-0 !list-none">
            {menuItems.map((item, index) => {
              if (item.children) {
                const isOpen = openMenus[item.label];
                const isChildActive = isMenuGroupActive(item);

                return (
                  <li key={index} className="!list-none">
                    <button
                      type="button"
                      onClick={() => toggleMenu(item.label)}
                      className={parentButtonClass(isChildActive)}
                    >
                      <div className="!flex !items-center">
                        <span
                          className={
                            isChildActive ? "!text-blue-400" : "!text-gray-400"
                          }
                        >
                          {item.icon}
                        </span>

                        <span className="!ml-3 !font-medium">{item.label}</span>
                      </div>

                      <ChevronDown
                        size={16}
                        className={`!transition-transform ${
                          isOpen ? "!rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isOpen && (
                      <ul className="!mt-2 !ml-5 !space-y-1 !border-l !border-gray-700 !pl-3 !p-0 !list-none">
                        {item.children.map((child) => {
                          const isActive = isRouteActive(child.path);

                          return (
                            <li key={child.label} className="!list-none">
                              <Link
                                to={child.path}
                                className={childLinkClass(isActive)}
                              >
                                <span className="!mr-3">{child.icon}</span>
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

              const isActive = isRouteActive(item.path);

              return (
                <li key={item.label} className="!list-none">
                  <Link to={item.path} className={singleLinkClass(isActive)}>
                    <span className={isActive ? "!text-white" : "!text-gray-400"}>
                      {item.icon}
                    </span>

                    <span className="!ml-3 !font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="!p-4 !border-t !border-gray-800">
          <button
            type="button"
            onClick={handleLogout}
            className="
              !flex !items-center !w-full !rounded-xl !px-4 !py-3
              !border-0 !outline-none !ring-0 !shadow-none
              !bg-transparent !text-gray-300 hover:!bg-red-500/10 hover:!text-red-300
              !transition
              focus:!outline-none focus:!ring-0 focus:!shadow-none
              active:!bg-red-500/10 active:!text-red-300
            "
          >
            <LogOut size={20} />
            <span className="!ml-3 !font-medium">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
