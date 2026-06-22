import React, { useState, useEffect } from "react";
import AssignRoleModal from "./AssignRoleModal"; // Use the component we made earlier

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Form State for New User
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "" });

  const API_URL = "http://localhost:5208/api/Security";

  // 1. Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/get-users-permissions`);
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // 2. Handle Create User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.message || "Failed to create user");
        return;
      }

      alert("User Created Successfully");
      setShowCreateModal(false);
      setNewUser({ username: "", email: "", password: "" }); // Reset form
      fetchUsers(); // Refresh list
    } catch (error) {
      alert("Error creating user");
    }
  };

  // 3. Open Assign Modal
  const openAssignRole = (user) => {
    setSelectedUser(user);
    setShowAssignModal(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center gap-2"
        >
          + Create New User
        </button>
      </div>

      {/* USER LIST TABLE */}
      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roles</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rights</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? <tr><td colSpan="4" className="p-4 text-center">Loading...</td></tr> : 
             users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{user.username}</td>
                <td className="px-6 py-4">
                  {user.roles.map((r, i) => (
                    <span key={i} className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded mr-1">{r}</span>
                  ))}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.rights.map((r, i) => (
                      <span key={i} className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded border border-green-100">{r}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => openAssignRole(user)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    Manage Role
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 shadow-xl">
            <h2 className="text-xl font-bold mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input required type="text" className="w-full border p-2 rounded" 
                  value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input required type="email" className="w-full border p-2 rounded" 
                  value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input required type="password" className="w-full border p-2 rounded" 
                  value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-gray-600">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN ROLE MODAL (Reused) */}
      <AssignRoleModal 
        isOpen={showAssignModal} 
        onClose={() => setShowAssignModal(false)} 
        user={selectedUser} 
        onSuccess={fetchUsers} 
      />
    </div>
  );
};

export default UsersPage;