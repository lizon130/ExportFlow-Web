import React, { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

const API_BASE = "http://192.168.9.45:7000/api";

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

      setSelectedUser(data);
      setProfileOpen(true);

      await fetchUserDepartments(userId);
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
        cell: ({ row }) => row.index + 1,
      },
      {
        header: "User",
        accessorKey: "username",
        cell: ({ row }) => {
          const user = row.original;
          const initials = user.userName?.slice(0, 2).toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                {initials}
              </div>

              <div>
                <div className="font-bold text-slate-800">{user.userName}</div>
                <div className="text-xs text-slate-400 break-all">
                  {user.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        header: "Created At",
        accessorKey: "createdAt",
        cell: (info) => (
          <span className="text-sm text-slate-500">
            {info.getValue()
              ? new Date(info.getValue()).toLocaleDateString()
              : "-"}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: (info) => (
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              info.getValue() === "Active"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      },
      {
        header: "Actions",
        cell: ({ row }) => (
          <button
            onClick={() => fetchUserProfile(row.original.recId)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg transition"
          >
            View Profile
          </button>
        ),
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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-indigo-50 to-purple-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-5 sm:p-8 mb-5 sm:mb-6 shadow-2xl">
          <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-60 w-60 rounded-full bg-indigo-500/30 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1 text-xs text-indigo-100 mb-4">
                🔐 User Access Control
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                User Management
              </h1>

              <p className="text-indigo-100 mt-2 text-sm sm:text-base">
                Create users and manage roles, profile, departments and buyers.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <InfoBox value={users.length} label="Users" />
              <InfoBox value={roles.length} label="Roles" />
              <InfoBox value={allDepartments.length} label="Departments" />
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
            {message}
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white p-4 sm:p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Users List
              </h2>
              <p className="text-sm text-slate-500">
                Loaded from get-all-users-list API.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <span className="absolute left-4 top-2.5 text-slate-400">
                  🔍
                </span>

                <input
                  type="text"
                  placeholder="Search user or email..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <button
                onClick={fetchUsers}
                disabled={loading}
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white hover:bg-indigo-700 rounded-2xl text-sm font-bold shadow-lg transition disabled:opacity-60"
              >
                {loading ? "Loading..." : "Refresh"}
              </button>

              <button
                onClick={openCreateModal}
                className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-2xl text-sm font-bold shadow-lg transition"
              >
                + Create User
              </button>
            </div>
          </div>

          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[850px] w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="bg-slate-50">
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase"
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

              <tbody className="bg-white divide-y divide-slate-100">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-indigo-50/70">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-6 py-5 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}

                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-10 text-center text-slate-400">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-4">
            {table.getRowModel().rows.map((row) => {
              const user = row.original;
              const initials = user.userName?.slice(0, 2).toUpperCase();

              return (
                <div
                  key={user.recId}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                        {initials}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800">
                          {user.userName}
                        </h3>
                        <p className="text-xs text-slate-400 break-all">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <button
                    onClick={() => fetchUserProfile(user.recId)}
                    className="w-full px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    View Profile
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-6 text-white flex justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">Create New User</h2>
                <p className="text-indigo-100 text-sm">
                  Register user and assign role.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="h-10 w-10 rounded-xl bg-white/10"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-5 space-y-4">
              <InputField
                label="Username"
                name="userName"
                value={createForm.userName}
                onChange={handleCreateChange}
                placeholder="Robi"
              />

              <InputField
                label="Email"
                type="email"
                name="email"
                value={createForm.email}
                onChange={handleCreateChange}
                placeholder="robi@tusuka.com"
              />

              <InputField
                label="Password"
                type="password"
                name="password"
                value={createForm.password}
                onChange={handleCreateChange}
                placeholder="12345"
              />

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  name="roleRecId"
                  value={createForm.roleRecId}
                  onChange={handleCreateChange}
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">No Role / Select Role</option>
                  {roles.map((role) => (
                    <option key={role.roleRecId} value={role.roleRecId}>
                      {role.roleName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm disabled:opacity-60"
                >
                  {loading ? "Creating..." : "Create User"}
                </button>

                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 px-5 py-3 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {profileOpen && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 p-4 flex items-center justify-center">
          <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-purple-950 p-6 text-white flex justify-between">
              <div>
                <h2 className="text-2xl font-extrabold">
                  {selectedUser.userName}
                </h2>
                <p className="text-indigo-100 text-sm">{selectedUser.email}</p>
                <p className="text-indigo-200 text-xs mt-1">
                  User ID: {selectedUser.recId}
                </p>
              </div>

              <button
                onClick={() => setProfileOpen(false)}
                className="h-10 w-10 rounded-xl bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto">
              <ProfileSection
                title="Roles"
                items={selectedUser.roles}
                empty="No roles assigned"
                getLabel={(item) => item.roleName}
                color="purple"
              />

              <ProfileSection
                title="Permissions"
                items={selectedUser.permissions}
                empty="No permissions assigned"
                getLabel={(item) => item.permissionName}
                color="emerald"
              />

              <ProfileSection
                title="Current Departments"
                items={userDepartments}
                empty="No assigned departments"
                getLabel={(item) =>
                  item.departmentName ||
                  item.departmentCode ||
                  item.name ||
                  item.recId ||
                  item
                }
                color="blue"
              />

              <form
                onSubmit={handleSetDepartments}
                className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 p-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="font-bold text-slate-800">
                      Set User Departments
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Select departments and save selected department recIds.
                    </p>
                  </div>

                  <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                    Selected: {selectedDepartmentIds.length}
                  </span>
                </div>

                <input
                  value={departmentSearch}
                  onChange={(e) => setDepartmentSearch(e.target.value)}
                  placeholder="Search department, buyer, code..."
                  className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {filteredDepartments.map((dept) => {
                    const checked = selectedDepartmentIds.includes(dept.recId);

                    return (
                      <label
                        key={dept.recId}
                        className={`flex items-start gap-3 rounded-2xl border p-3 cursor-pointer transition ${
                          checked
                            ? "bg-indigo-50 border-indigo-200"
                            : "bg-white border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleDepartment(dept.recId)}
                          className="mt-1 h-4 w-4 accent-indigo-600"
                        />

                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-800 truncate">
                            {dept.departmentName}
                          </p>
                          <p className="text-xs text-slate-500">
                            ID: {dept.recId} • Code: {dept.departmentCode}
                          </p>
                          <p className="text-xs text-indigo-600 truncate">
                            Buyer: {dept.buyerName || "-"}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm disabled:opacity-60"
                  >
                    {loading ? "Saving..." : "Save Departments"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDepartmentIds([])}
                    className="px-5 py-3 bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm"
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

const InfoBox = ({ value, label }) => (
  <div className="bg-white/10 backdrop-blur rounded-2xl px-3 sm:px-5 py-3 sm:py-4 border border-white/10 text-center">
    <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
    <div className="text-[10px] sm:text-xs text-indigo-100">{label}</div>
  </div>
);

const InputField = ({ label, ...props }) => (
  <div>
    <label className="block text-sm font-bold text-slate-700 mb-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  </div>
);

const ProfileSection = ({ title, items, empty, getLabel, color }) => {
  const colors = {
    purple: "bg-purple-50 text-purple-700 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
  };

  return (
    <div className="mb-5">
      <h3 className="font-bold text-slate-800 mb-2">{title}</h3>

      <div className="flex flex-wrap gap-2">
        {items && items.length > 0 ? (
          items.map((item, index) => (
            <span
              key={item.recId || item.id || index}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${colors[color]}`}
            >
              {getLabel(item)}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-400 italic">{empty}</span>
        )}
      </div>
    </div>
  );
};

export default UsersTable;