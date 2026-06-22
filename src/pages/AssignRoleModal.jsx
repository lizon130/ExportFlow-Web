import React, { useState, useEffect } from "react";

const AssignRoleModal = ({ isOpen, onClose, user, onSuccess }) => {
  const [roles, setRoles] = useState([]);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch available roles when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("http://localhost:5208/api/Security/get-all-roles")
        .then((res) => res.json())
        .then((data) => setRoles(data))
        .catch((err) => console.error("Failed to load roles", err));
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("http://localhost:5208/api/Security/assign-role-to-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, roleId: parseInt(selectedRoleId) }),
      });

      if (!response.ok) throw new Error("Failed to assign role");

      alert("Role assigned successfully!");
      onSuccess(); // Refresh parent table
      onClose();
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h2 className="text-xl font-bold mb-4">Assign Role</h2>
        <p className="text-sm text-gray-600 mb-4">
          Assigning role to user: <span className="font-semibold">{user?.username}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Role</label>
            <select
              required
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-blue-500"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
            >
              <option value="">-- Choose a Role --</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.roleName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Assigning..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignRoleModal;