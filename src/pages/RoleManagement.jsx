import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://192.168.9.45:7000/api";

const RoleManagement = () => {
  const [roles, setRoles] = useState([]);
  const [allPermissions, setAllPermissions] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [selectedPermissionIds, setSelectedPermissionIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedRole = useMemo(
    () => roles.find((role) => role.roleRecId === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  const getHeaders = () => {
    const token = localStorage.getItem("accessToken");

    return {
      "Content-Type": "application/json",
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchRoles = async () => {
    const res = await fetch(`${API_BASE}/Role/all`, {
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error("Failed to load roles");

    const data = await res.json();
    setRoles(data);

    if (data.length > 0 && !selectedRoleId) {
      setSelectedRoleId(data[0].roleRecId);
    }
  };

  const fetchPermissions = async () => {
    const res = await fetch(`${API_BASE}/Permission/get-all-permission`, {
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error("Failed to load permissions");

    const data = await res.json();
    setAllPermissions(data);
  };

  const fetchRolePermissions = async (roleId) => {
    if (!roleId) return;

    const res = await fetch(`${API_BASE}/Role/${roleId}/permissions`, {
      headers: getHeaders(),
    });

    if (!res.ok) throw new Error("Failed to load role permissions");

    const data = await res.json();

    const ids = Array.isArray(data.permissions)
      ? data.permissions.map((permission) => permission.recId)
      : [];

    setSelectedPermissionIds(ids);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      await Promise.all([fetchRoles(), fetchPermissions()]);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load role/permission data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedRoleId) {
      fetchRolePermissions(selectedRoleId).catch((error) => {
        console.error(error);
        setMessage("❌ Failed to load selected role permissions");
      });
    }
  }, [selectedRoleId]);

  const togglePermission = (permissionId) => {
    setSelectedPermissionIds((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const savePermissions = async () => {
    if (!selectedRoleId) {
      setMessage("❌ Please select a role first");
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const res = await fetch(
        `${API_BASE}/Role/${selectedRoleId}/permissions-create`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            permissionIds: selectedPermissionIds,
          }),
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to save permissions");
      }

      setMessage("✅ Permissions saved successfully");

      await fetchRoles();
      await fetchRolePermissions(selectedRoleId);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  const assignedRightsCount = selectedPermissionIds.length;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="h-14 w-14 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-slate-600 font-semibold">
            Loading role permissions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-5 sm:p-8 mb-6 shadow-2xl">
          <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1 text-xs text-indigo-100 mb-4">
                🛡️ Role Access Control
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                Role & Permission Management
              </h1>

              <p className="text-indigo-100 mt-2 text-sm sm:text-base">
                Select a role, choose permissions, then save to API.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <InfoBox value={roles.length} label="Roles" />
              <InfoBox value={allPermissions.length} label="Permissions" />
              <InfoBox value={assignedRightsCount} label="Selected" />
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-white">
              <h2 className="text-lg font-bold text-slate-800">
                Select Role
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose a role to manage permissions.
              </p>
            </div>

            <div className="p-4 space-y-3 max-h-[420px] lg:max-h-[620px] overflow-y-auto">
              {roles.map((role) => {
                const active = selectedRoleId === role.roleRecId;
                const count = role.permissions ? role.permissions.length : 0;

                return (
                  <button
                    key={role.roleRecId}
                    type="button"
                    onClick={() => setSelectedRoleId(role.roleRecId)}
                    className={`
                      w-full text-left rounded-2xl p-4 border transition-all
                      focus:outline-none focus:ring-0
                      ${
                        active
                          ? "bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-white border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-700"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`
                            h-11 w-11 rounded-2xl flex items-center justify-center font-bold shrink-0
                            ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-indigo-50 text-indigo-600"
                            }
                          `}
                        >
                          {role.roleName?.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`font-bold truncate ${
                              active ? "text-white" : "text-slate-800"
                            }`}
                          >
                            {role.roleName}
                          </p>
                          <p
                            className={`text-xs ${
                              active ? "text-indigo-100" : "text-slate-400"
                            }`}
                          >
                            Role ID: {role.roleRecId}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`
                          shrink-0 px-3 py-1 rounded-full text-xs font-bold
                          ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-500"
                          }
                        `}
                      >
                        {count} API
                      </span>
                    </div>
                  </button>
                );
              })}

              {roles.length === 0 && (
                <div className="text-center text-slate-400 py-10">
                  No roles found
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Manage Permissions
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Permissions for{" "}
                  <span className="font-bold text-indigo-700">
                    {selectedRole?.roleName || "No role selected"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={savePermissions}
                disabled={saving || !selectedRoleId}
                className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white rounded-2xl text-xs font-bold hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Permissions"}
              </button>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Selected Role</p>
                    <h3 className="text-xl font-extrabold text-slate-800">
                      {selectedRole?.roleName || "-"}
                    </h3>
                  </div>

                  <div className="flex gap-3">
                    <MiniStat label="Selected" value={assignedRightsCount} />
                    <MiniStat label="Available" value={allPermissions.length} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {allPermissions.map((permission) => {
                  const isChecked = selectedPermissionIds.includes(
                    permission.recId
                  );

                  return (
                    <label
                      key={permission.recId}
                      className={`
                        group relative flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all select-none
                        ${
                          isChecked
                            ? "bg-emerald-50 border-emerald-200 shadow-sm"
                            : "bg-white border-slate-200 hover:bg-slate-50 hover:border-indigo-200"
                        }
                      `}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => togglePermission(permission.recId)}
                      />

                      <span
                        className={`
                          h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 transition mt-0.5
                          ${
                            isChecked
                              ? "bg-emerald-600 border-emerald-600 text-white"
                              : "bg-white border-slate-300 text-transparent group-hover:border-indigo-400"
                          }
                        `}
                      >
                        ✓
                      </span>

                      <div className="min-w-0">
                        <p
                          className={`
                            text-sm font-bold truncate
                            ${
                              isChecked
                                ? "text-emerald-800"
                                : "text-slate-700"
                            }
                          `}
                        >
                          {permission.permissionName}
                        </p>

                        <p className="text-xs text-slate-400">
                          ID: {permission.recId}
                        </p>

                        {permission.moduleName && (
                          <p className="text-xs text-indigo-500 mt-1">
                            Module: {permission.moduleName}
                          </p>
                        )}

                        {permission.description && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {permission.description}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {allPermissions.length === 0 && (
                <div className="text-center text-slate-400 py-10">
                  No permissions found
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoBox = ({ value, label }) => (
  <div className="bg-white/10 backdrop-blur rounded-2xl px-3 sm:px-5 py-3 sm:py-4 border border-white/10 text-center">
    <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
    <div className="text-[10px] sm:text-xs text-indigo-100">{label}</div>
  </div>
);

const MiniStat = ({ value, label }) => (
  <div className="bg-white rounded-2xl px-4 py-3 border border-indigo-100 shadow-sm text-center min-w-[90px]">
    <div className="text-lg font-extrabold text-indigo-700">{value}</div>
    <div className="text-xs text-slate-500">{label}</div>
  </div>
);

export default RoleManagement;