import React, { useState, useEffect } from "react";

const AssignRightToRole = () => {
  const [roles, setRoles] = useState([]);
  const [rights, setRights] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedRight, setSelectedRight] = useState("");

  useEffect(() => {
    // Fetch both Roles and Rights
    const fetchData = async () => {
      const rolesRes = await fetch("http://localhost:5208/api/Security/get-all-roles");
      const rightsRes = await fetch("http://localhost:5208/api/Security/get-all-rights");
      setRoles(await rolesRes.json());
      setRights(await rightsRes.json());
    };
    fetchData();
  }, []);

  const handleAssign = async () => {
    if (!selectedRole || !selectedRight) return;

    try {
      const res = await fetch("http://localhost:5208/api/Security/assign-right-to-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            roleId: parseInt(selectedRole), 
            rightId: parseInt(selectedRight) 
        }),
      });
      
      if(res.ok) alert("Right assigned to Role successfully!");
      else alert("Failed to assign right");
    } catch(e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 border rounded shadow-sm bg-gray-50 mt-8">
      <h3 className="font-bold mb-4">Assign Rights to Roles</h3>
      <div className="flex gap-4 items-end">
        <div>
          <label className="block text-xs font-bold mb-1">Select Role</label>
          <select 
            className="border p-2 rounded w-48" 
            onChange={e => setSelectedRole(e.target.value)}
          >
            <option value="">-- Role --</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.roleName}</option>)}
          </select>
        </div>

        <div>
           <label className="block text-xs font-bold mb-1">Select Permission</label>
           <select 
             className="border p-2 rounded w-48"
             onChange={e => setSelectedRight(e.target.value)}
           >
            <option value="">-- Right --</option>
            {rights.map(r => <option key={r.id} value={r.id}>{r.rightName}</option>)}
          </select>
        </div>

        <button 
          onClick={handleAssign}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Link Permission
        </button>
      </div>
    </div>
  );
};

export default AssignRightToRole;