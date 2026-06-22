import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const Dashboard = () => {
  const cards = [
    {
      title: "Export Docs",
      icon: "📄",
      completed: 128,
      pending: 24,
      total: 152,
      note: "Packing List: 152",
      color: "from-blue-500 to-cyan-400",
    },
    {
      title: "B/L Date Check",
      icon: "📋",
      completed: 96,
      pending: 18,
      total: 114,
      note: "Total B/L: 114",
      color: "from-violet-500 to-purple-400",
    },
    {
      title: "Shipping",
      icon: "🚚",
      completed: 74,
      pending: 12,
      total: 86,
      note: "Total Shipping: 86",
      color: "from-cyan-500 to-sky-400",
    },
    {
      title: "Bank Submit",
      icon: "🏦",
      completed: 58,
      pending: 9,
      total: 67,
      note: "Total Bank Submit: 67",
      color: "from-pink-500 to-rose-400",
    },
  ];

  const monthlyData = [
    { month: "Jan", exportValue: 420, realized: 300 },
    { month: "Feb", exportValue: 520, realized: 380 },
    { month: "Mar", exportValue: 610, realized: 470 },
    { month: "Apr", exportValue: 740, realized: 560 },
    { month: "May", exportValue: 690, realized: 610 },
    { month: "Jun", exportValue: 830, realized: 690 },
  ];

  const realization = {
    expected: "$2.4M",
    realized: "$1.7M",
    pending: "$700K",
    upcoming: "$420K",
    overdue: "$280K",
    percent: 72,
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white px-3 py-4 sm:p-5 lg:p-6">
      <div className="space-y-5 my-12">
        {/* Header */}
        <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-5 sm:p-6 border border-white/10 shadow-xl">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs text-cyan-100 border border-white/10 mb-3">
                ⚡ Export Intelligence
              </div>

              <h1 className="text-2xl sm:text-3xl font-black">
                ExportFlow Dashboard
              </h1>

              <p className="text-slate-300 mt-1 text-sm">
                Export document, shipping, bank submit and realization summary.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <HeaderStat label="Total Docs" value="419" />
              <HeaderStat label="Pending" value="63" />
              <HeaderStat label="Realized" value="72%" />
            </div>
          </div>
        </div>

        {/* Main Top Section: col-8 + col-4 */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          {/* Left: 4 cards col-8 */}
          <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => {
              const percent = Math.round((card.completed / card.total) * 100);

              return (
                <div
                  key={card.title}
                  className="rounded-2xl bg-[#101b2d] border border-white/10 p-4 shadow-lg hover:border-white/20 transition"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-10 w-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-lg`}
                      >
                        {card.icon}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold">{card.title}</h3>
                        <p className="text-xs text-slate-400">
                          Total: {card.total}
                        </p>
                      </div>
                    </div>

                    <span className="rounded-full bg-orange-500/10 text-orange-300 px-2.5 py-1 text-[11px] font-bold">
                      {card.pending} Pending
                    </span>
                  </div>

                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-xs text-slate-400">Completed</p>
                      <h2 className="text-2xl font-black">{card.completed}</h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-400">Progress</p>
                      <p className="text-sm font-bold text-emerald-300">
                        {percent}%
                      </p>
                    </div>
                  </div>

                  <div className="h-2 rounded-full bg-slate-800 overflow-hidden mb-3">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${card.color}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="text-xs text-slate-400 border-t border-white/10 pt-3">
                    {card.note}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right: realization col-4 */}
          <div className="xl:col-span-4 rounded-2xl bg-[#101b2d] border border-white/10 p-5 shadow-lg">
            <div className="flex justify-between items-start gap-3 mb-5">
              <div>
                <h2 className="text-lg font-bold">💰 Realization Tracking</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Expected vs realized export value
                </p>
              </div>

              <span className="rounded-full bg-violet-500/20 text-violet-300 px-3 py-1 text-xs font-bold">
                {realization.percent}%
              </span>
            </div>

            <div className="space-y-3 mb-5">
              <MoneyRow label="Expected" value={realization.expected} />
              <MoneyRow label="Realized" value={realization.realized} />
              <MoneyRow label="Pending" value={realization.pending} />
            </div>

            <div className="mb-4">
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                  style={{ width: `${realization.percent}%` }}
                />
              </div>
              <p className="text-center text-violet-300 text-xs mt-2">
                {realization.percent}% Realized
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
              <MiniBox label="Upcoming" value={realization.upcoming} />
              <MiniBox label="Overdue" value={realization.overdue} />
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ChartCard title="📈 Monthly Export Value">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="exportValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="realized" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#243247" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="exportValue"
                  stroke="#38bdf8"
                  fill="url(#exportValue)"
                  strokeWidth={3}
                />
                <Area
                  type="monotone"
                  dataKey="realized"
                  stroke="#a78bfa"
                  fill="url(#realized)"
                  strokeWidth={3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="📦 Document Pipeline">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cards}>
                <CartesianGrid strokeDasharray="3 3" stroke="#243247" />
                <XAxis dataKey="title" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="total" fill="#334155" radius={[8, 8, 0, 0]} />
                <Bar dataKey="completed" fill="#22c55e" radius={[8, 8, 0, 0]} />
                <Bar dataKey="pending" fill="#f97316" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
};

const HeaderStat = ({ label, value }) => (
  <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-center">
    <div className="text-lg font-black">{value}</div>
    <div className="text-[10px] text-slate-300">{label}</div>
  </div>
);

const MoneyRow = ({ label, value }) => (
  <div className="flex items-center justify-between rounded-xl bg-slate-950/70 border border-white/10 px-4 py-3">
    <span className="text-sm text-slate-400">{label}</span>
    <span className="font-black">{value}</span>
  </div>
);

const MiniBox = ({ label, value }) => (
  <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 text-center">
    <p className="text-[11px] text-slate-400">{label}</p>
    <h3 className="text-sm font-black mt-1">{value}</h3>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="rounded-2xl bg-[#101b2d] border border-white/10 p-5 shadow-lg">
    <h2 className="text-lg font-bold mb-1">{title}</h2>
    <p className="text-xs text-slate-400 mb-4">Static dashboard overview</p>
    <div className="h-72">{children}</div>
  </div>
);

export default Dashboard;