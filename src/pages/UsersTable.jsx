import React, { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
} from "@tanstack/react-table";

function UsersTable() {
  const [globalFilter, setGlobalFilter] = useState("");

  const users = [
    {
      id: 1,
      username: "superadmin",
      email: "superadmin@tusuka.com",
      roles: ["Super Admin"],
      rights: ["Create", "Edit", "Delete", "View", "Approve"],
      status: "Active",
    },
    {
      id: 2,
      username: "admin",
      email: "admin@tusuka.com",
      roles: ["Admin"],
      rights: ["Create", "Edit", "View"],
      status: "Active",
    },
    {
      id: 3,
      username: "manager",
      email: "manager@tusuka.com",
      roles: ["Manager"],
      rights: ["View", "Approve"],
      status: "Active",
    },
    {
      id: 4,
      username: "user",
      email: "user@tusuka.com",
      roles: [],
      rights: ["View"],
      status: "Limited",
    },
  ];

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
          const initials = user.username.slice(0, 2).toUpperCase();

          return (
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                {initials}
              </div>

              <div>
                <div className="font-bold text-slate-800">{user.username}</div>
                <div className="text-xs text-slate-400 break-all">
                  {user.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        header: "Roles",
        accessorKey: "roles",
        cell: (info) => (
          <div className="flex flex-wrap gap-2">
            {info.getValue().length > 0 ? (
              info.getValue().map((role, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100"
                >
                  {role}
                </span>
              ))
            ) : (
              <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs italic">
                No Role
              </span>
            )}
          </div>
        ),
      },
      {
        header: "Rights",
        accessorKey: "rights",
        cell: (info) => (
          <div className="flex flex-wrap gap-2">
            {info.getValue().map((right, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100"
              >
                {right}
              </span>
            ))}
          </div>
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
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {info.getValue()}
          </span>
        ),
      },
      {
        header: "Actions",
        cell: () => (
          <div className="flex flex-col sm:flex-row gap-2">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 text-xs font-bold shadow-lg transition">
              Assign Role
            </button>

            <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-bold shadow-lg transition">
              Assign Rights
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: users,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
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
                🔐 Access Control Panel
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                Security Management
              </h1>

              <p className="text-indigo-100 mt-2 text-sm sm:text-base">
                Manage users, roles, rights and permission access
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                ["4", "Users"],
                ["3", "Roles"],
                ["5", "Rights"],
              ].map(([value, label]) => (
                <div
                  key={label}
                  className="bg-white/10 backdrop-blur rounded-2xl px-3 sm:px-5 py-3 sm:py-4 border border-white/10 text-center"
                >
                  <div className="text-xl sm:text-2xl font-bold text-white">
                    {value}
                  </div>
                  <div className="text-[10px] sm:text-xs text-indigo-100">
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-2xl border border-white p-4 sm:p-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                Users Access List
              </h2>
              <p className="text-sm text-slate-500">
                Static user role permission overview
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <div className="relative w-full sm:w-80">
                <span className="absolute left-4 top-2.5 text-slate-400">
                  🔍
                </span>

                <input
                  type="text"
                  placeholder="Search user, role, right..."
                  value={globalFilter ?? ""}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>

              <button className="w-full sm:w-auto px-5 py-2.5 bg-slate-900 text-white hover:bg-indigo-700 rounded-2xl text-sm font-bold shadow-lg transition">
                Refresh
              </button>
            </div>
          </div>

          {/* Desktop / Tablet Table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-[900px] w-full">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr
                    key={headerGroup.id}
                    className="bg-slate-50 border-b border-slate-200"
                  >
                    {headerGroup.headers.map((header) => (
                      <th
                        key={header.id}
                        className="px-6 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider"
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
                  <tr
                    key={row.id}
                    className="hover:bg-indigo-50/70 transition duration-200"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-6 py-5 text-sm text-slate-700 align-top"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden space-y-4">
            {table.getRowModel().rows.map((row) => {
              const user = row.original;
              const initials = user.username.slice(0, 2).toUpperCase();

              return (
                <div
                  key={user.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">
                        {initials}
                      </div>

                      <div>
                        <h3 className="font-bold text-slate-800">
                          {user.username}
                        </h3>
                        <p className="text-xs text-slate-400 break-all">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {user.status}
                    </span>
                  </div>

                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Roles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.roles.length > 0 ? (
                        user.roles.map((role, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100"
                          >
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="px-3 py-1 bg-slate-100 text-slate-400 rounded-full text-xs italic">
                          No Role
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">
                      Rights
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {user.rights.map((right, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100"
                        >
                          {right}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold">
                      Assign Role
                    </button>
                    <button className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">
                      Assign Rights
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
            <span className="text-sm text-slate-500">
              Page{" "}
              <b className="text-slate-800">
                {table.getState().pagination.pageIndex + 1}
              </b>{" "}
              of <b className="text-slate-800">{table.getPageCount()}</b>
            </span>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                className="flex-1 sm:flex-none px-5 py-2 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-100 text-sm font-semibold transition"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                Previous
              </button>

              <button
                className="flex-1 sm:flex-none px-5 py-2 border border-slate-200 rounded-xl disabled:opacity-40 hover:bg-slate-100 text-sm font-semibold transition"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UsersTable;