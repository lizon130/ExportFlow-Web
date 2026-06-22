import React, { useState } from "react";
import {
  Menu,
  Bell,
  Search,
  X,
  ChevronDown,
  User,
  Settings,
  LogOut,
} from "lucide-react";

function Header({ onMenuClick }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const menuButtonClass =
    "w-full bg-white text-gray-700 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-0 active:bg-gray-100 transition-colors";

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-4">
          {/* Left Section */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-0 transition"
            >
              <Menu size={22} />
            </button>

            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                E
              </div>

              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">
                  ExportFlow
                </h1>
                <p className="hidden sm:block text-[11px] text-gray-400">
                  Management Panel
                </p>
              </div>
            </div>
          </div>

          {/* Desktop Search */}
          <div className="hidden md:flex flex-1 max-w-xl mx-4">
            <div className="relative w-full">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                placeholder="Search anything..."
                className="w-full rounded-2xl bg-gray-800 border border-gray-700 pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Search Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-xl bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-0 transition"
            >
              <Search size={21} />
            </button>

            {/* Notification */}
            <button
              type="button"
              className="relative p-2 rounded-xl bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-0 transition"
            >
              <Bell size={21} />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-900"></span>
            </button>

            {/* Profile */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-transparent text-white hover:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-0 transition"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-white leading-tight">
                    John Doe
                  </p>
                  <p className="text-xs text-gray-400">Administrator</p>
                </div>

                <img
                  className="h-9 w-9 rounded-xl object-cover ring-2 ring-gray-700"
                  src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                  alt="Profile"
                />

                <ChevronDown
                  size={16}
                  className={`hidden sm:block text-gray-400 transition-transform ${
                    profileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {profileOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setProfileOpen(false)}
                  />

                  <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-100 z-20 overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                      <div className="flex items-center gap-3">
                        <img
                          className="h-11 w-11 rounded-xl object-cover"
                          src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                          alt="Profile"
                        />

                        <div>
                          <p className="font-bold text-white">John Doe</p>
                          <p className="text-xs text-gray-300">
                            admin@example.com
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-2 bg-white text-gray-900">
                      <button type="button" className={menuButtonClass}>
                        <User size={18} className="text-gray-500" />
                        <span className="text-gray-700">My Profile</span>
                      </button>

                      <button type="button" className={menuButtonClass}>
                        <Settings size={18} className="text-gray-500" />
                        <span className="text-gray-700">Settings</span>
                      </button>

                      <button
                        type="button"
                        className="w-full bg-white text-red-600 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-red-50 hover:text-red-700 focus:outline-none focus:ring-0 active:bg-red-50 transition-colors"
                      >
                        <LogOut size={18} className="text-red-500" />
                        <span className="text-red-600">Logout</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 p-4 md:hidden">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                autoFocus
                type="text"
                placeholder="Search anything..."
                className="w-full rounded-2xl bg-gray-800 border border-gray-700 pl-11 pr-4 py-3 text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="p-3 rounded-2xl bg-gray-800 text-gray-300 hover:text-white focus:outline-none focus:ring-0"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Header;
