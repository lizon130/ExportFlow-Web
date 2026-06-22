import React, { useState, useEffect } from "react";

const RolesPage = () => {
  const [roles, setRoles] = useState([]);
  const [allRights, setAllRights] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [newRoleName, setNewRoleName] = useState("");
  const [loading, setLoading] = useState(false);

  const API_URL = "http://localhost:5208/api/Security";

  // Fetch Data
  const fetchData = async () => {
    const [rolesRes, rightsRes] = await Promise.all([
      fetch(`${API_URL}/get-all-roles`),
      fetch(`${API_URL}/get-all-rights`),
    ]);
    const rolesData = await rolesRes.json();
    setRoles(rolesData);
    setAllRights(await rightsRes.json());
    
    // Refresh selected role data if active
    if(selectedRole) {
        const updated = rolesData.find(r => r.id === selectedRole.id);
        setSelectedRole(updated);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Create Role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if(!newRoleName) return;
    try {
      await fetch(`${API_URL}/create-role`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roleName: newRoleName })
      });
      setNewRoleName("");
      fetchData();
      alert("Role Created!");
    } catch(e) { alert("Error creating role"); }
  };

  // Toggle Right
  const toggleRight = async (rightId, isAssigned) => {
    if (!selectedRole) return;
    setLoading(true);
    const endpoint = isAssigned ? "remove-right-from-role" : "assign-right-to-role";

    await fetch(`${API_URL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roleId: selectedRole.id, rightId })
    });
    
    await fetchData();
    setLoading(false);
  };

  const hasRight = (rightId) => selectedRole?.roleRights?.some(rr => rr.rightId === rightId);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Roles & Permissions</h1>

      {/* CREATE ROLE BAR */}
      <div className="bg-white p-4 rounded shadow mb-6 flex gap-4 items-end border border-gray-200">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">Create New Role</label>
          <input 
            type="text" 
            placeholder="e.g. Manager, Editor" 
            className="w-full border p-2 rounded"
            value={newRoleName}
            onChange={(e) => setNewRoleName(e.target.value)}
          />
        </div>
        <button onClick={handleCreateRole} className="bg-indigo-600 text-white px-6 py-2 rounded hover:bg-indigo-700">
          Add Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEFT: ROLES LIST */}
        <div className="bg-white rounded shadow border border-gray-200">
            <div className="bg-gray-50 px-4 py-3 border-b font-semibold">Roles List</div>
            <ul>
                {roles.map(role => (
                    <li key={role.id} onClick={() => setSelectedRole(role)}
                        className={`p-3 cursor-pointer hover:bg-indigo-50 flex justify-between ${selectedRole?.id === role.id ? 'bg-indigo-100 border-l-4 border-indigo-600' : ''}`}>
                        <span>{role.roleName}</span>
                        <span className="text-xs bg-gray-200 px-2 py-1 rounded-full">{role.roleRights?.length || 0}</span>
                    </li>
                ))}
            </ul>
        </div>

        {/* RIGHT: PERMISSION MATRIX */}
        <div className="md:col-span-2 bg-white rounded shadow border border-gray-200 p-6">
            <h2 className="font-bold text-lg mb-4 text-gray-700">
                {selectedRole ? `Manage Permissions for: ${selectedRole.roleName}` : "Select a Role to Configure"}
            </h2>
            
            {selectedRole && (
                <div className="grid grid-cols-2 gap-3">
                    {allRights.map(right => (
                        <label key={right.id} className={`flex items-center p-3 border rounded cursor-pointer ${hasRight(right.id) ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}`}>
                            <input type="checkbox" checked={hasRight(right.id)} onChange={() => toggleRight(right.id, hasRight(right.id))} disabled={loading} className="w-5 h-5 text-indigo-600" />
                            <span className="ml-2 text-sm font-medium text-gray-700">{right.rightName}</span>
                        </label>
                    ))}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default RolesPage;