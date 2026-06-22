import React, { useMemo, useState } from "react";

const RoleManagement = () => {
  const staticRoles = [
    {
      id: 1,
      roleName: "Super Admin",
      roleRights: [
        { rightId: 1 },
        { rightId: 2 },
        { rightId: 3 },
        { rightId: 4 },
        { rightId: 5 },
      ],
    },
    {
      id: 2,
      roleName: "Admin",
      roleRights: [{ rightId: 1 }, { rightId: 2 }, { rightId: 4 }],
    },
    {
      id: 3,
      roleName: "Manager",
      roleRights: [{ rightId: 2 }, { rightId: 4 }, { rightId: 5 }],
    },
    {
      id: 4,
      roleName: "User",
      roleRights: [{ rightId: 4 }],
    },
  ];

  const staticRights = [
    { id: 1, rightName: "Create" },
    { id: 2, rightName: "Edit" },
    { id: 3, rightName: "Delete" },
    { id: 4, rightName: "View" },
    { id: 5, rightName: "Approve" },
    { id: 6, rightName: "Export" },
    { id: 7, rightName: "Print" },
    { id: 8, rightName: "Settings Access" },
  ];

  const [roles, setRoles] = useState(staticRoles);
  const [allRights] = useState(staticRights);
  const [selectedRoleId, setSelectedRoleId] = useState(1);

  const selectedRole = useMemo(
    () => roles.find((r) => r.id === selectedRoleId) || null,
    [roles, selectedRoleId]
  );

  const hasRight = (rightId) => {
    if (!selectedRole || !selectedRole.roleRights) return false;
    return selectedRole.roleRights.some((rr) => rr.rightId === rightId);
  };

  const toggleRight = (rightId, isAssigned) => {
    setRoles((prevRoles) =>
      prevRoles.map((role) => {
        if (role.id !== selectedRoleId) return role;

        const updatedRights = isAssigned
          ? role.roleRights.filter((rr) => rr.rightId !== rightId)
          : [...role.roleRights, { rightId }];

        return {
          ...role,
          roleRights: updatedRights,
        };
      })
    );
  };

  const assignedRightsCount = selectedRole?.roleRights?.length || 0;

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
                Static role permission design without API.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <InfoBox value={roles.length} label="Roles" />
              <InfoBox value={allRights.length} label="Rights" />
              <InfoBox value={assignedRightsCount} label="Assigned" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-white">
              <h2 className="text-lg font-bold text-slate-800">Select Role</h2>
              <p className="text-sm text-slate-500 mt-1">
                Choose a role to manage permissions.
              </p>
            </div>

            <div className="p-4 space-y-3 max-h-[420px] lg:max-h-[620px] overflow-y-auto">
              {roles.map((role) => {
                const active = selectedRoleId === role.id;
                const count = role.roleRights ? role.roleRights.length : 0;

                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleId(role.id)}
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
                          {role.roleName.slice(0, 2).toUpperCase()}
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
                            Role ID: {role.id}
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
                        {count} Rights
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-2 bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">
                  Manage Permissions
                </h2>

                <p className="text-sm text-slate-500 mt-1">
                  Permissions for {selectedRole?.roleName}
                </p>
              </div>

              <span className="inline-flex items-center justify-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold">
                Static Mode
              </span>
            </div>

            <div className="p-4 sm:p-6">
              <div className="mb-5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-slate-500">Selected Role</p>
                    <h3 className="text-xl font-extrabold text-slate-800">
                      {selectedRole?.roleName}
                    </h3>
                  </div>

                  <div className="flex gap-3">
                    <MiniStat label="Assigned" value={assignedRightsCount} />
                    <MiniStat label="Available" value={allRights.length} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {allRights.map((right) => {
                  const isChecked = hasRight(right.id);

                  return (
                    <label
                      key={right.id}
                      className={`
                        group relative flex items-center gap-3 rounded-2xl border p-4 cursor-pointer transition-all select-none
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
                        onChange={() => toggleRight(right.id, isChecked)}
                      />

                      <span
                        className={`
                          h-6 w-6 rounded-lg border flex items-center justify-center shrink-0 transition
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
                          {right.rightName}
                        </p>
                        <p className="text-xs text-slate-400">
                          Right ID: {right.id}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
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