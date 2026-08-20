import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://192.168.136.53:7000/api";

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
      <div className="min-h-screen w-full bg-[#0a0c12] flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto" />
          <p className="mt-3 text-sm text-slate-400 font-bold">
            Loading role permissions...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#101827] via-[#1a1f35] to-[#101827] p-4 shadow-lg border border-white/10">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-purple-500/20 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-2.5 py-0.5 text-[9px] text-indigo-200 font-bold mb-1.5">
                🛡️ Role Access Control
              </div>

              <h1 className="text-xl font-black text-white">
                Role & Permission Management
              </h1>

              <p className="text-[10px] text-indigo-200/60 mt-0.5">
                Select a role, choose permissions, then save to API
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-white">{roles.length}</div>
                <div className="text-[8px] text-indigo-200">Roles</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-white">{allPermissions.length}</div>
                <div className="text-[8px] text-indigo-200">Permissions</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-emerald-300">{assignedRightsCount}</div>
                <div className="text-[8px] text-indigo-200">Selected</div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          {/* Roles List - Left Side */}
          <div className="lg:col-span-4 bg-[#101827] rounded-xl border border-white/10 shadow-lg overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-[#0f172a]">
              <h2 className="text-sm font-bold text-white">Select Role</h2>
              <p className="text-[9px] text-slate-400 mt-0.5">Choose a role to manage permissions</p>
            </div>

            <div className="p-2 space-y-1.5 max-h-[480px] lg:max-h-[580px] overflow-y-auto">
              {roles.map((role) => {
                const active = selectedRoleId === role.roleRecId;
                const count = role.permissions ? role.permissions.length : 0;

                return (
                  <button
                    key={role.roleRecId}
                    type="button"
                    onClick={() => setSelectedRoleId(role.roleRecId)}
                    className={`
                      w-full text-left rounded-lg p-2.5 border transition-all
                      focus:outline-none
                      ${
                        active
                          ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                          : "bg-[#0f172a] border-white/5 hover:bg-white/5 text-slate-300"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`
                            h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0
                            ${
                              active
                                ? "bg-white/20 text-white"
                                : "bg-indigo-500/20 text-indigo-300"
                            }
                          `}
                        >
                          {role.roleName?.slice(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${active ? "text-white" : "text-white"}`}>
                            {role.roleName}
                          </p>
                          <p className={`text-[9px] ${active ? "text-indigo-200" : "text-slate-500"}`}>
                            ID: {role.roleRecId}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`
                          shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold
                          ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-white/5 text-slate-400"
                          }
                        `}
                      >
                        {count}
                      </span>
                    </div>
                  </button>
                );
              })}

              {roles.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">
                  No roles found
                </div>
              )}
            </div>
          </div>

          {/* Permissions - Right Side */}
          <div className="lg:col-span-8 bg-[#101827] rounded-xl border border-white/10 shadow-lg overflow-hidden">
            <div className="p-3 border-b border-white/10 bg-[#0f172a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-white">Manage Permissions</h2>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Permissions for{" "}
                  <span className="font-bold text-indigo-300">
                    {selectedRole?.roleName || "No role selected"}
                  </span>
                </p>
              </div>

              <button
                type="button"
                onClick={savePermissions}
                disabled={saving || !selectedRoleId}
                className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 disabled:opacity-60 transition whitespace-nowrap"
              >
                {saving ? "Saving..." : "💾 Save"}
              </button>
            </div>

            <div className="p-3">
              {/* Selected Role Summary */}
              <div className="mb-3 rounded-lg bg-[#0f172a] border border-white/10 p-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <p className="text-[9px] text-slate-400">Selected Role</p>
                    <h3 className="text-sm font-bold text-white">
                      {selectedRole?.roleName || "-"}
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <div className="bg-indigo-500/10 rounded-lg px-3 py-1 text-center border border-indigo-500/20">
                      <div className="text-xs font-bold text-indigo-300">{assignedRightsCount}</div>
                      <div className="text-[8px] text-slate-400">Selected</div>
                    </div>
                    <div className="bg-white/5 rounded-lg px-3 py-1 text-center border border-white/10">
                      <div className="text-xs font-bold text-white">{allPermissions.length}</div>
                      <div className="text-[8px] text-slate-400">Available</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Permission Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-2 gap-1.5 max-h-[400px] overflow-y-auto pr-1">
                {allPermissions.map((permission) => {
                  const isChecked = selectedPermissionIds.includes(
                    permission.recId
                  );

                  return (
                    <label
                      key={permission.recId}
                      className={`
                        group relative flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition-all select-none
                        ${
                          isChecked
                            ? "bg-emerald-500/10 border-emerald-500/30"
                            : "bg-[#0f172a] border-white/5 hover:bg-white/5"
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
                          h-5 w-5 rounded border flex items-center justify-center shrink-0 transition mt-0.5 text-[10px]
                          ${
                            isChecked
                              ? "bg-emerald-500 border-emerald-500 text-white"
                              : "bg-[#0f172a] border-white/20 text-transparent group-hover:border-indigo-400"
                          }
                        `}
                      >
                        ✓
                      </span>

                      <div className="min-w-0">
                        <p
                          className={`
                            text-xs font-bold truncate
                            ${isChecked ? "text-emerald-300" : "text-white"}
                          `}
                        >
                          {permission.permissionName}
                        </p>

                        <p className="text-[9px] text-slate-500">
                          ID: {permission.recId}
                        </p>

                        {permission.moduleName && (
                          <p className="text-[9px] text-indigo-400 mt-0.5">
                            {permission.moduleName}
                          </p>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {allPermissions.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-8">
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

export default RoleManagement;