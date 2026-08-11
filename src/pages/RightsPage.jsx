import React, { useEffect, useState } from "react";

const API_URL = "http://192.168.11.39:7000/api/Permission";

const RightsPage = () => {
  const [rights, setRights] = useState([]);
  const [formData, setFormData] = useState({
    permissionName: "",
    moduleName: "",
    description: "",
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("accessToken");

    return {
      "Content-Type": "application/json",
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchRights = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/get-all-permission`, {
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Failed to load permissions");

      const data = await res.json();
      setRights(data);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load permissions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRights();
  }, []);

  const resetForm = () => {
    setFormData({
      permissionName: "",
      moduleName: "",
      description: "",
    });
    setEditingId(null);
  };

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();

    if (!formData.permissionName.trim()) {
      setMessage("❌ Permission name is required");
      return;
    }

    const payload = {
      recId: editingId || 0,
      permissionName: formData.permissionName,
      moduleName: formData.moduleName,
      description: formData.description,
    };

    try {
      setLoading(true);

      const url = editingId
        ? `${API_URL}/${editingId}`
        : `${API_URL}/permission-create`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(editingId ? "Update failed" : "Create failed");
      }

      setMessage(
        editingId
          ? "✅ Permission updated successfully"
          : "✅ Permission created successfully"
      );

      resetForm();
      fetchRights();
    } catch (error) {
      console.error(error);
      setMessage(
        editingId
          ? "❌ Update API failed. Please check your PUT endpoint."
          : "❌ Create permission failed"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (right) => {
    setEditingId(right.recId);
    setFormData({
      permissionName: right.permissionName || "",
      moduleName: right.moduleName || "",
      description: right.description || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (recId) => {
    if (!window.confirm("Are you sure you want to delete this permission?")) {
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`${API_URL}/${recId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });

      if (!res.ok) throw new Error("Delete failed");

      setMessage("✅ Permission deleted successfully");
      fetchRights();
    } catch (error) {
      console.error(error);
      setMessage("❌ Delete failed. Make sure you use correct recId.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#101827] via-[#1a1f35] to-[#101827] p-4 shadow-lg border border-white/10">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-2.5 py-0.5 text-[9px] text-emerald-200 font-bold mb-1.5">
                🔑 Permission Control
              </div>

              <h1 className="text-xl font-black text-white">
                System Permissions
              </h1>

              <p className="text-[10px] text-emerald-200/60 mt-0.5">
                Create, read, update and delete permissions
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-white">{rights.length}</div>
                <div className="text-[8px] text-emerald-200">Total</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-white">CRUD</div>
                <div className="text-[8px] text-emerald-200">Mode</div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
            {message}
          </div>
        )}

        {/* Form */}
        <div className="bg-[#101827] rounded-xl border border-white/10 p-3 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div>
              <h2 className="text-sm font-bold text-white">
                {editingId ? "Update Permission" : "Create Permission"}
              </h2>
              <p className="text-[9px] text-slate-400">
                {editingId
                  ? `Editing ID: ${editingId}`
                  : "Add a new permission to the system"}
              </p>
            </div>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-2.5 py-1 bg-white/5 text-slate-400 rounded-lg text-[10px] font-bold hover:bg-white/10 transition"
              >
                ✕ Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleCreateOrUpdate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <input
              type="text"
              name="permissionName"
              placeholder="Permission Name*"
              value={formData.permissionName}
              onChange={handleChange}
              className="border border-white/10 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />

            <input
              type="text"
              name="moduleName"
              placeholder="Module Name"
              value={formData.moduleName}
              onChange={handleChange}
              className="border border-white/10 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <input
              type="text"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              className="border border-white/10 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />

            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-xs font-bold transition disabled:opacity-60 whitespace-nowrap"
            >
              {loading ? "..." : editingId ? "💾 Update" : "➕ Create"}
            </button>
          </form>
        </div>

        {/* Table */}
        <div className="bg-[#101827] rounded-xl border border-white/10 shadow-lg overflow-hidden">
          <div className="p-3 border-b border-white/10 bg-[#0f172a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">Permission List</h2>
              <p className="text-[9px] text-slate-400">All available permissions from API</p>
            </div>

            <button
              onClick={fetchRights}
              className="px-3 py-1.5 bg-white/5 text-white rounded-lg text-[10px] font-bold hover:bg-white/10 transition whitespace-nowrap"
            >
              ⟳ Refresh
            </button>
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-[#0f172a] border-b border-white/10">
                <tr>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">ID</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Permission</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Module</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Description</th>
                  <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-white/5">
                {rights.map((right) => (
                  <tr key={right.recId} className="hover:bg-white/5 transition">
                    <td className="px-3 py-2.5 text-xs font-bold text-slate-500">#{right.recId}</td>
                    <td className="px-3 py-2.5 text-xs font-bold text-white">{right.permissionName}</td>
                    <td className="px-3 py-2.5">
                      <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-bold border border-indigo-500/20">
                        {right.moduleName || "-"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-slate-400">{right.description || "-"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEdit(right)}
                          className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold hover:bg-blue-700 transition"
                        >
                          ✎ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(right.recId)}
                          className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-bold hover:bg-red-700 transition"
                        >
                          ✕ Del
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {rights.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-3 py-8 text-center text-slate-400 text-sm">
                      No permissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden p-3 space-y-2">
            {rights.map((right) => (
              <div
                key={right.recId}
                className="rounded-lg border border-white/10 bg-[#0f172a] p-3"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-xs font-bold text-white">{right.permissionName}</h3>
                    <p className="text-[9px] text-slate-400">ID: #{right.recId}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded-full text-[9px] font-bold border border-indigo-500/20">
                    {right.moduleName || "-"}
                  </span>
                </div>

                <p className="text-[10px] text-slate-400 mb-2">{right.description || "-"}</p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={() => handleEdit(right)}
                    className="px-2.5 py-1 bg-blue-600 text-white rounded-lg text-[9px] font-bold hover:bg-blue-700 transition"
                  >
                    ✎ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(right.recId)}
                    className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[9px] font-bold hover:bg-red-700 transition"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}

            {rights.length === 0 && (
              <div className="rounded-lg border border-white/10 bg-[#0f172a] p-6 text-center text-slate-400 text-sm">
                No permissions found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RightsPage;