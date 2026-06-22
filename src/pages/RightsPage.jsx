import React, { useEffect, useState } from "react";

const API_URL = "http://192.168.9.45:7000/api/Permission";

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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-100 via-emerald-50 to-indigo-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12">
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-slate-950 via-emerald-950 to-indigo-950 p-5 sm:p-8 mb-6 shadow-2xl">
          <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-emerald-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1 text-xs text-emerald-100 mb-4">
                🔑 Permission Control
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                System Permissions
              </h1>

              <p className="text-emerald-100 mt-2 text-sm sm:text-base">
                Create, read, update and delete permissions.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-4 border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">
                  {rights.length}
                </div>
                <div className="text-xs text-emerald-100">Total</div>
              </div>

              <div className="bg-white/10 backdrop-blur rounded-2xl px-5 py-4 border border-white/10 text-center">
                <div className="text-2xl font-bold text-white">CRUD</div>
                <div className="text-xs text-emerald-100">Mode</div>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className="mb-5 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 shadow">
            {message}
          </div>
        )}

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white p-4 sm:p-6 mb-6">
          <h2 className="text-xl font-bold text-slate-800 mb-1">
            {editingId ? "Update Permission" : "Create Permission"}
          </h2>

          <p className="text-sm text-slate-500 mb-5">
            {editingId
              ? `Editing permission ID: ${editingId}`
              : "Add a new permission to the system."}
          </p>

          <form
            onSubmit={handleCreateOrUpdate}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <input
              type="text"
              name="permissionName"
              placeholder="Permission Name"
              value={formData.permissionName}
              onChange={handleChange}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />

            <input
              type="text"
              name="moduleName"
              placeholder="Module Name"
              value={formData.moduleName}
              onChange={handleChange}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />

            <input
              type="text"
              name="description"
              placeholder="Description"
              value={formData.description}
              onChange={handleChange}
              className="border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />

            <div className="md:col-span-3 flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 font-bold text-sm shadow-lg disabled:opacity-60"
              >
                {loading
                  ? "Please wait..."
                  : editingId
                  ? "Update Permission"
                  : "Create Permission"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-2xl hover:bg-slate-300 font-bold text-sm"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

        <div className="hidden md:block bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-800">
                Permission List
              </h2>
              <p className="text-sm text-slate-500">
                All available permissions from API.
              </p>
            </div>

            <button
              onClick={fetchRights}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold"
            >
              Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase">
                    ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase">
                    Permission
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase">
                    Module
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-slate-100">
                {rights.map((right) => (
                  <tr
                    key={right.recId}
                    className="hover:bg-emerald-50/70 transition"
                  >
                    <td className="px-6 py-5 text-sm font-semibold text-slate-400">
                      #{right.recId}
                    </td>

                    <td className="px-6 py-5 font-bold text-slate-800">
                      {right.permissionName}
                    </td>

                    <td className="px-6 py-5">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                        {right.moduleName}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm text-slate-500">
                      {right.description}
                    </td>

                    <td className="px-6 py-5">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(right)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDelete(right.recId)}
                          className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {rights.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-6 py-10 text-center text-slate-400"
                    >
                      No permissions found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="md:hidden space-y-4">
          {rights.map((right) => (
            <div
              key={right.recId}
              className="bg-white rounded-2xl border border-white shadow-lg p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">
                    {right.permissionName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Permission ID: #{right.recId}
                  </p>
                </div>

                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                  {right.moduleName}
                </span>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                {right.description}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleEdit(right)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(right.recId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {rights.length === 0 && (
            <div className="bg-white rounded-2xl p-8 text-center text-slate-400">
              No permissions found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RightsPage;