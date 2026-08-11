import React, { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

const API_BASE = "http://192.168.11.39:7000/api";

function UsersTable() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);

  const [globalFilter, setGlobalFilter] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [profileOpen, setProfileOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [selectedUser, setSelectedUser] = useState(null);
  const [userDepartments, setUserDepartments] = useState([]);
  const [selectedDepartmentIds, setSelectedDepartmentIds] = useState([]);
  const [departmentSearch, setDepartmentSearch] = useState("");

  const [createForm, setCreateForm] = useState({
    userName: "",
    email: "",
    password: "",
    roleRecId: "",
  });

  const getHeaders = () => {
    const token = localStorage.getItem("accessToken");

    return {
      "Content-Type": "application/json",
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/User/get-all-users-list`, {
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Failed to load users");

      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_BASE}/Role/all`, {
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Failed to load roles");

      const data = await res.json();
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setRoles([]);
    }
  };

  const fetchAllDepartments = async () => {
    try {
      const res = await fetch(`${API_BASE}/Department/get-all-department`, {
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Failed to load departments");

      const data = await res.json();
      setAllDepartments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setAllDepartments([]);
    }
  };

  const fetchUserDepartments = async (userId) => {
    try {
      const res = await fetch(
        `${API_BASE}/User/${userId}/user-departments-getById`,
        {
          headers: getHeaders(),
        }
      );

      if (!res.ok) throw new Error("Failed to load user departments");

      const data = await res.json();
      const departments = Array.isArray(data) ? data : [];

      setUserDepartments(departments);

      const ids = departments
        .map((item) => item.recId || item.departmentRecId || item.departmentId || item)
        .filter((id) => Number.isFinite(Number(id)))
        .map(Number);

      setSelectedDepartmentIds(ids);
    } catch (error) {
      console.error(error);
      setUserDepartments([]);
      setSelectedDepartmentIds([]);
    }
  };

  const fetchUserProfile = async (userId) => {
    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/User/${userId}/profile`, {
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Failed to load profile");

      const data = await res.json();

      console.log("Profile data:", data);
      console.log("Departments from profile:", data.departments);

      setSelectedUser(data);

      // IMPORTANT: Set userDepartments directly from profile data
      if (data.departments && Array.isArray(data.departments) && data.departments.length > 0) {
        setUserDepartments(data.departments);
        const ids = data.departments
          .map((item) => item.recId)
          .filter((id) => Number.isFinite(Number(id)))
          .map(Number);
        setSelectedDepartmentIds(ids);
      } else {
        // Fallback: fetch from the other endpoint
        await fetchUserDepartments(userId);
      }

      setProfileOpen(true);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load user profile");
    } finally {
      setLoading(false);
    }
  };

  const toggleDepartment = (departmentId) => {
    setSelectedDepartmentIds((prev) =>
      prev.includes(departmentId)
        ? prev.filter((id) => id !== departmentId)
        : [...prev, departmentId]
    );
  };

  const handleSetDepartments = async (e) => {
    e.preventDefault();

    if (!selectedUser) return;

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(
        `${API_BASE}/User/${selectedUser.recId}/user-departments-set`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            departmentIds: selectedDepartmentIds,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to set departments");

      setMessage("✅ Departments updated successfully");
      await fetchUserProfile(selectedUser.recId);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to update departments");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateChange = (e) => {
    setCreateForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const openCreateModal = async () => {
    await fetchRoles();
    setCreateOpen(true);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();

    if (
      !createForm.userName.trim() ||
      !createForm.email.trim() ||
      !createForm.password.trim()
    ) {
      setMessage("❌ Username, email and password are required");
      return;
    }

    const payload = {
      userName: createForm.userName.trim(),
      email: createForm.email.trim(),
      password: createForm.password,
      roleRecId: Number(createForm.roleRecId || 0),
    };

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/Auth/register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to create user");

      setMessage("✅ User created successfully");
      setCreateOpen(false);

      setCreateForm({
        userName: "",
        email: "",
        password: "",
        roleRecId: "",
      });

      await fetchUsers();
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchAllDepartments();
  }, []);

  const tableData = useMemo(
    () =>
      users.map((user) => ({
        ...user,
        username: user.userName,
        status: user.isActive ? "Active" : "Inactive",
      })),
    [users]
  );

  const columns = useMemo(
    () => [
      {
        header: "#",
        cell: ({ row }) => (
          <span className="text-[10px] font-bold text-slate-300">
            {row.index + 1}
          </span>
        ),
        size: 40,
      },
      {
        header: "User",
        accessorKey: "username",
        cell: ({ row }) => {
          const user = row.original;
          const initials = user.userName?.slice(0, 2).toUpperCase();

          return (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                {initials}
              </div>

              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {user.userName}
                </div>
                <div className="text-[9px] text-slate-400 truncate">
                  {user.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        header: "Created",
        accessorKey: "createdAt",
        cell: (info) => (
          <span className="text-[10px] text-slate-400">
            {info.getValue()
              ? new Date(info.getValue()).toLocaleDateString()
              : "-"}
          </span>
        ),
        size: 100,
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: (info) => (
          <span
            className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
              info.getValue() === "Active"
                ? "bg-emerald-500/20 text-emerald-300"
                : "bg-red-500/20 text-red-300"
            }`}
          >
            {info.getValue()}
          </span>
        ),
        size: 80,
      },
      {
        header: "Action",
        cell: ({ row }) => (
          <button
            type="button"
            onClick={() => fetchUserProfile(row.original.recId)}
            className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-[9px] font-bold transition"
          >
            Profile
          </button>
        ),
        size: 80,
      },
    ],
    []
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const filteredDepartments = allDepartments.filter((dept) => {
    const keyword = departmentSearch.toLowerCase();

    return (
      dept.departmentName?.toLowerCase().includes(keyword) ||
      dept.departmentCode?.toLowerCase().includes(keyword) ||
      dept.buyerName?.toLowerCase().includes(keyword) ||
      dept.buyerNameCode?.toLowerCase().includes(keyword)
    );
  });

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
                🔐 User Access Control
              </div>

              <h1 className="text-xl font-black text-white">
                User Management
              </h1>

              <p className="text-[10px] text-indigo-200/60 mt-0.5">
                Create users and manage roles, profile, departments and buyers
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <MiniInfoBox value={users.length} label="Users" />
              <MiniInfoBox value={roles.length} label="Roles" />
              <MiniInfoBox value={allDepartments.length} label="Depts" />
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
            {message}
          </div>
        )}

        {/* Main Table */}
        <div className="bg-[#101827] rounded-xl border border-white/10 shadow-lg overflow-hidden">
          <div className="p-3 border-b border-white/10 flex flex-col md:flex-row justify-between md:items-center gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">Users List</h2>
              <p className="text-[9px] text-slate-400">
                Loaded from get-all-users-list API
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              <div className="relative w-full sm:w-56">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search user..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 border border-white/10 rounded-lg bg-[#0f172a] text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <button
                type="button"
                onClick={fetchUsers}
                disabled={loading}
                className="px-3 py-1.5 bg-slate-800 text-white hover:bg-slate-700 rounded-lg text-[10px] font-bold transition disabled:opacity-60 whitespace-nowrap"
              >
                {loading ? "..." : "⟳"}
              </button>

              <button
                type="button"
                onClick={openCreateModal}
                className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-[10px] font-bold transition whitespace-nowrap"
              >
                + Create
              </button>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#0f172a] border-b border-white/10">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider"
                        style={{ width: header.column.columnDef.size }}
                      >
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>

              <tbody className="divide-y divide-white/5">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-white/5 transition">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}

                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-8 text-center text-slate-400 text-sm">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden p-3 space-y-3">
            {table.getRowModel().rows.map((row) => {
              const user = row.original;
              const initials = user.userName?.slice(0, 2).toUpperCase();

              return (
                <div
                  key={user.recId}
                  className="rounded-lg border border-white/10 bg-[#0f172a] p-3"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {initials}
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-white truncate">
                          {user.userName}
                        </h3>
                        <p className="text-[9px] text-slate-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold shrink-0 ${
                        user.isActive
                          ? "bg-emerald-500/20 text-emerald-300"
                          : "bg-red-500/20 text-red-300"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchUserProfile(user.recId)}
                    className="w-full px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-[10px] font-bold hover:bg-indigo-700 transition"
                  >
                    View Profile
                  </button>
                </div>
              );
            })}
          </div>

          {table.getPageCount() > 1 && (
            <div className="p-3 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <p className="text-[9px] text-slate-400">
                Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
              </p>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-700 disabled:opacity-40 transition"
                >
                  ◀
                </button>
                <button
                  type="button"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-700 disabled:opacity-40 transition"
                >
                  ▶
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 p-3 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-md bg-[#0b1220] rounded-xl border border-white/10 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#101827] to-[#1a1f35] p-4 text-white flex justify-between items-start gap-3 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold">Create New User</h2>
                <p className="text-[10px] text-indigo-200/60">
                  Register user and assign role
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-4 space-y-3">
              <DarkInput
                label="Username"
                name="userName"
                value={createForm.userName}
                onChange={handleCreateChange}
                placeholder="Robi"
              />

              <DarkInput
                label="Email"
                type="email"
                name="email"
                value={createForm.email}
                onChange={handleCreateChange}
                placeholder="robi@tusuka.com"
              />

              <DarkInput
                label="Password"
                type="password"
                name="password"
                value={createForm.password}
                onChange={handleCreateChange}
                placeholder="••••••"
              />

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
                  Role
                </label>
                <select
                  name="roleRecId"
                  value={createForm.roleRecId}
                  onChange={handleCreateChange}
                  className="w-full border border-white/10 rounded-lg bg-[#0f172a] px-3 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Role</option>
                  {roles.map((role) => (
                    <option key={role.roleRecId} value={role.roleRecId}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-60 transition"
                >
                  {loading ? "Creating..." : "Create User"}
                </button>

                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-xs font-bold hover:bg-white/10 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {profileOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 p-3 backdrop-blur-sm flex items-center justify-center">
          <div className="w-full max-w-4xl bg-[#0b1220] rounded-xl border border-white/10 shadow-2xl overflow-hidden max-h-[90vh]">
            <div className="bg-gradient-to-r from-[#101827] to-[#1a1f35] p-4 text-white flex justify-between items-start gap-3 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold">{selectedUser.userName}</h2>
                <p className="text-[10px] text-indigo-200/60">
                  {selectedUser.email}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  ID: {selectedUser.recId}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 transition shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <DarkProfileBox
                  title="Roles"
                  items={selectedUser.roles}
                  empty="No roles assigned"
                  getLabel={(item) => item.roleName}
                  color="purple"
                />

                <DarkProfileBox
                  title="Permissions"
                  items={selectedUser.permissions}
                  empty="No permissions assigned"
                  getLabel={(item) => item.permissionName}
                  color="emerald"
                />
              </div>

              <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3 mb-4">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Current Departments
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {userDepartments.length > 0 ? (
                    userDepartments.map((dept, index) => (
                      <span
                        key={dept.recId || index}
                        className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-bold border border-blue-500/20"
                      >
                        {dept.departmentName ||
                          dept.deptName ||
                          dept.name ||
                          dept.departmentCode ||
                          dept.deptCode ||
                          dept.recId}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">
                      No assigned departments
                    </span>
                  )}
                </div>
              </div>

              <form
                onSubmit={handleSetDepartments}
                className="rounded-lg border border-white/10 bg-[#0f172a] p-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      Set User Departments
                    </h3>
                    <p className="text-[9px] text-slate-400">
                      Select departments to assign
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[9px] font-bold border border-indigo-500/20">
                    Selected: {selectedDepartmentIds.length}
                  </span>
                </div>

                <input
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  placeholder="Search department, buyer, code..."
                  className="w-full border border-white/10 rounded-lg bg-[#0a0c12] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                  {filteredDepartments.map((dept) => {
                    const checked = selectedDepartmentIds.includes(dept.recId);

                    return (
                      <label
                        key={dept.recId}
                        className={`flex items-start gap-2 rounded-lg border p-2.5 cursor-pointer transition ${
                          checked
                            ? "bg-indigo-500/10 border-indigo-500/30"
                            : "bg-[#0a0c12] border-white/10 hover:bg-white/5"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDepartment(dept.recId)}
                          className="mt-0.5 h-3.5 w-3.5 accent-indigo-600"
                        />

                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {dept.departmentName}
                          </p>
                          <p className="text-[9px] text-slate-400">
                            Code: {dept.departmentCode || "-"}
                          </p>
                          <p className="text-[9px] text-indigo-400 truncate">
                            Buyer: {dept.buyerName || "-"}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    {loading ? "Saving..." : "Save Departments"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDepartmentIds([])}
                    className="px-4 py-2 bg-white/5 text-slate-400 rounded-lg text-xs font-bold hover:bg-white/10 transition"
                  >
                    Clear Selected
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MiniInfoBox = ({ value, label }) => (
  <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
    <div className="text-sm font-bold text-white">{value}</div>
    <div className="text-[8px] text-indigo-200">{label}</div>
  </div>
);

const DarkInput = ({ label, ...props }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 mb-0.5">
      {label}
    </label>
    <input
      {...props}
      className="w-full border border-white/10 rounded-lg bg-[#0f172a] px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

const DarkProfileBox = ({ title, items, empty, getLabel, color }) => {
  const colorClasses = {
    purple: "bg-purple-500/20 text-purple-300 border-purple-500/20",
    emerald: "bg-emerald-500/20 text-emerald-300 border-emerald-500/20",
    blue: "bg-blue-500/20 text-blue-300 border-blue-500/20",
  };

  return (
    <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
      <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </h3>
      <div className="flex flex-wrap gap-1.5">
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <span
              key={item.recId || item.id || index}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                colorClasses[color] || colorClasses.blue
              }`}
            >
              {getLabel(item)}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">{empty}</span>
        )}
      </div>
    </div>
  );
};

export default UsersTable;
