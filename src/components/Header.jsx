import React, { useEffect, useState } from "react";
import {
  Menu,
  Bell,
  Search,
  X,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Shield,
  Building2,
  Users,
} from "lucide-react";

const API_BASE_URL = "http://192.168.11.39:7000";

function Header({ onMenuClick }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  const [profile, setProfile] = useState({
    recId: "",
    userName: "User",
    email: "",
    roles: [],
    permissions: [],
    departments: [],
    buyers: [],
  });

  const menuButtonClass =
    "w-full bg-white text-gray-700 flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-0 active:bg-gray-100 transition-colors";

  const getStoredJson = (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const getToken = () => {
    return (
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      getStoredJson("user")?.accessToken ||
      ""
    );
  };

  const decodeJwtPayload = (token) => {
    try {
      if (!token || !token.includes(".")) return {};

      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");

      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((char) => {
            return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  };

  const getUserId = () => {
    const token = getToken();
    const payload = decodeJwtPayload(token);
    const storedUser = getStoredJson("user");

    return (
      localStorage.getItem("userId") ||
      storedUser?.recId ||
      storedUser?.id ||
      storedUser?.userId ||
      payload?.sub ||
      payload?.nameid ||
      payload?.userId ||
      ""
    );
  };

  const getUserNameFromToken = () => {
    const payload = decodeJwtPayload(getToken());

    return (
      payload?.[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      ] ||
      payload?.name ||
      payload?.userName ||
      ""
    );
  };

  const getEmailFromToken = () => {
    const payload = decodeJwtPayload(getToken());

    return (
      payload?.[
        "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
      ] ||
      payload?.email ||
      ""
    );
  };

  const getRoleFromToken = () => {
    const payload = decodeJwtPayload(getToken());
    return payload?.role || "";
  };

  const getInitials = (name) => {
    if (!name) return "U";

    const parts = String(name).trim().split(" ").filter(Boolean);

    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }

    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const roleName =
    profile?.roles?.length > 0
      ? profile.roles.map((role) => role.roleName).join(", ")
      : getRoleFromToken() || "User";

  const displayName = profile?.userName || getUserNameFromToken() || "User";
  const displayEmail = profile?.email || getEmailFromToken() || "";
  const initials = getInitials(displayName);

  const fetchUserProfile = async () => {
    const userId = getUserId();
    const token = getToken();

    if (!userId) {
      const storedUser = getStoredJson("user");

      setProfile((prev) => ({
        ...prev,
        recId: storedUser?.id || "",
        userName:
          storedUser?.userName ||
          storedUser?.name ||
          getUserNameFromToken() ||
          "User",
        email: storedUser?.email || getEmailFromToken() || "",
        roles: getRoleFromToken()
          ? [{ recId: 0, roleName: getRoleFromToken() }]
          : [],
      }));

      return;
    }

    try {
      setProfileLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/User/${userId}/profile`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error(`Profile load failed: ${response.status}`);
      }

      const data = await response.json();

      setProfile({
        recId: data?.recId || userId,
        userName: data?.userName || getUserNameFromToken() || "User",
        email: data?.email || getEmailFromToken() || "",
        roles: Array.isArray(data?.roles) ? data.roles : [],
        permissions: Array.isArray(data?.permissions) ? data.permissions : [],
        departments: Array.isArray(data?.departments) ? data.departments : [],
        buyers: Array.isArray(data?.buyers) ? data.buyers : [],
      });

      localStorage.setItem("userId", String(data?.recId || userId));
      localStorage.setItem(
        "user",
        JSON.stringify({
          recId: data?.recId || userId,
          userName: data?.userName || "",
          email: data?.email || "",
          roles: data?.roles || [],
          permissions: data?.permissions || [],
          departments: data?.departments || [],
          buyers: data?.buyers || [],
        })
      );
    } catch (error) {
      console.error("Profile API error:", error);

      const storedUser = getStoredJson("user");

      setProfile((prev) => ({
        ...prev,
        recId: userId,
        userName:
          storedUser?.userName ||
          storedUser?.name ||
          getUserNameFromToken() ||
          "User",
        email: storedUser?.email || getEmailFromToken() || "",
        roles:
          storedUser?.roles ||
          (getRoleFromToken()
            ? [{ recId: 0, roleName: getRoleFromToken() }]
            : []),
        permissions: storedUser?.permissions || [],
        departments: storedUser?.departments || [],
        buyers: storedUser?.buyers || [],
      }));
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearAuthStorage = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("expireAt");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    localStorage.removeItem("token_expiry");
    localStorage.removeItem("userData");
    localStorage.removeItem("authData");
  };

  const handleLogout = async () => {
    const token = getToken();

    try {
      await fetch(`${API_BASE_URL}/api/Auth/logout`, {
        method: "POST",
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      clearAuthStorage();
      window.location.href = "/login";
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 border-b border-gray-800 shadow-lg">
      <div className="h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex h-full items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-xl bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-0 transition"
            >
              <Menu size={22} />
            </button>

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

          <div className="flex items-center gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="md:hidden p-2 rounded-xl bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-0 transition"
            >
              <Search size={21} />
            </button>

            <button
              type="button"
              className="relative p-2 rounded-xl bg-transparent text-gray-300 hover:text-white hover:bg-gray-800 focus:outline-none focus:ring-0 transition"
            >
              <Bell size={21} />
              <span className="absolute top-2 right-2 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-gray-900"></span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 sm:gap-3 rounded-2xl bg-transparent text-white hover:bg-gray-800 px-2 py-1.5 focus:outline-none focus:ring-0 transition"
              >
                <div className="hidden sm:block text-right">
                  <p className="text-sm font-semibold text-white leading-tight">
                    {profileLoading ? "Loading..." : displayName}
                  </p>
                  <p className="text-xs text-gray-400">{roleName}</p>
                </div>

                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 ring-2 ring-gray-700 flex items-center justify-center text-white text-sm font-black">
                  {initials}
                </div>

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

                  <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-1rem)] rounded-2xl bg-white text-gray-900 shadow-2xl border border-gray-100 z-20 overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-gray-900 to-gray-800 text-white">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-black">
                          {initials}
                        </div>

                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">
                            {displayName}
                          </p>
                          <p className="text-xs text-gray-300 truncate">
                            {displayEmail || "No email found"}
                          </p>
                          <p className="text-[11px] text-blue-200 truncate mt-0.5">
                            {roleName}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-white text-gray-900">
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-xl bg-blue-50 border border-blue-100 px-2 py-2 text-center">
                          <p className="text-sm font-black text-blue-700">
                            {profile.roles?.length || 0}
                          </p>
                          <p className="text-[10px] font-bold text-blue-500">
                            Roles
                          </p>
                        </div>

                        <div className="rounded-xl bg-green-50 border border-green-100 px-2 py-2 text-center">
                          <p className="text-sm font-black text-green-700">
                            {profile.permissions?.length || 0}
                          </p>
                          <p className="text-[10px] font-bold text-green-500">
                            Rights
                          </p>
                        </div>

                        <div className="rounded-xl bg-purple-50 border border-purple-100 px-2 py-2 text-center">
                          <p className="text-sm font-black text-purple-700">
                            {profile.departments?.length || 0}
                          </p>
                          <p className="text-[10px] font-bold text-purple-500">
                            Depts
                          </p>
                        </div>
                      </div>

                      {profile.buyers?.length > 0 && (
                        <div className="mb-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Users size={16} className="text-gray-500" />
                            <p className="text-xs font-bold text-gray-700">
                              Buyer
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {profile.buyers.map((buyer) => (
                              <span
                                key={buyer.buyerRecId || buyer.buyerNameCode}
                                className="px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold"
                              >
                                {buyer.buyerNameCode || buyer.buyerName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {profile.departments?.length > 0 && (
                        <div className="mb-3 rounded-xl bg-gray-50 border border-gray-100 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Building2 size={16} className="text-gray-500" />
                            <p className="text-xs font-bold text-gray-700">
                              Departments
                            </p>
                          </div>

                          <div className="max-h-24 overflow-y-auto flex flex-wrap gap-1 pr-1">
                            {profile.departments.map((dept) => (
                              <span
                                key={dept.recId || dept.departmentCode}
                                className="px-2 py-1 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold"
                              >
                                {dept.departmentCode || dept.departmentName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

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
                        onClick={fetchUserProfile}
                        className={menuButtonClass}
                      >
                        <Shield size={18} className="text-gray-500" />
                        <span className="text-gray-700">
                          Refresh Profile
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
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
