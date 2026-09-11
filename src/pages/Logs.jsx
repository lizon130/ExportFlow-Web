import React, { useEffect, useMemo, useState } from "react";

const LOGGER_API_BASE = "http://192.168.136.53:7000/api/Logger";
const FEEDBACK_API_BASE =
  "http://192.168.136.53:7000/api/Notification/get-all-export-document-feedback";

function LoggerPage() {
  const [activeTab, setActiveTab] = useState("feedback");

  const [logs, setLogs] = useState([]);
  const [mode, setMode] = useState("today");
  const [lines, setLines] = useState(200);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [feedbackRows, setFeedbackRows] = useState([]);
  const [feedbackSearch, setFeedbackSearch] = useState("");
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const getHeaders = () => {
    const token =
      localStorage.getItem("accessToken") || localStorage.getItem("token");

    return {
      accept: "*/*",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const normalizeLogs = (data) => {
    if (Array.isArray(data)) return data;

    if (typeof data === "string") {
      return data
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
    }

    return [];
  };

  const normalizeFeedbackRows = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  };

  const fetchTodayLogs = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMode("today");

      const res = await fetch(`${LOGGER_API_BASE}/today`, {
        method: "GET",
        headers: getHeaders(),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to load today logs");

      setLogs(normalizeLogs(text));
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load today logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchTailLogs = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMode("tail");

      const res = await fetch(`${LOGGER_API_BASE}/tail?lines=${lines}`, {
        method: "GET",
        headers: getHeaders(),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to load tail logs");

      try {
        const json = JSON.parse(text);
        setLogs(normalizeLogs(json));
      } catch {
        setLogs(normalizeLogs(text));
      }
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to load tail logs");
    } finally {
      setLoading(false);
    }
  };

  const fetchFeedback = async () => {
    try {
      setFeedbackLoading(true);
      setFeedbackMessage("");

      const res = await fetch(FEEDBACK_API_BASE, {
        method: "GET",
        headers: getHeaders(),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to load feedback");

      let data = [];

      try {
        data = JSON.parse(text);
      } catch {
        data = [];
      }

      setFeedbackRows(normalizeFeedbackRows(data));
    } catch (error) {
      console.error(error);
      setFeedbackRows([]);
      setFeedbackMessage("❌ Failed to load feedback");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const clearLogs = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear log files?"
    );

    if (!confirmClear) return;

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${LOGGER_API_BASE}/clear`, {
        method: "POST",
        headers: getHeaders(),
      });

      const text = await res.text();

      if (!res.ok) throw new Error(text || "Failed to clear logs");

      let resultMessage = "✅ Logs cleared successfully";

      try {
        const json = JSON.parse(text);
        resultMessage = `✅ ${json.message || "Logs cleared."} Deleted files: ${
          json.deletedFileCount ?? 0
        }`;
      } catch {
        resultMessage = "✅ Logs cleared successfully";
      }

      setMessage(resultMessage);
      setLogs([]);
    } catch (error) {
      console.error(error);
      setMessage("❌ Failed to clear logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodayLogs();
    fetchFeedback();
  }, []);

  const getLogLevel = (line) => {
    if (line.includes("[FTL]")) return "FTL";
    if (line.includes("[ERR]")) return "ERR";
    if (line.includes("[WRN]")) return "WRN";
    if (line.includes("[INF]")) return "INF";
    if (line.includes("[DBG]")) return "DBG";
    return "OTHER";
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((line) => {
      const matchesSearch = line.toLowerCase().includes(search.toLowerCase());
      const matchesLevel = level === "ALL" || getLogLevel(line) === level;

      return matchesSearch && matchesLevel;
    });
  }, [logs, search, level]);

  const getFeedbackTimestamp = (item) => {
    const time = new Date(item.updatedDate || item.createdDate || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  };

  const filteredFeedbackRows = useMemo(() => {
    const key = feedbackSearch.trim().toLowerCase();

    const rows = key
      ? feedbackRows.filter((item) =>
          [
            item.recId,
            item.userName,
            item.roleName,
            item.notifyName,
            item.exportDocument,
            item.departmentCode,
            item.departmentName,
            item.customerCode,
            item.customerName,
            item.prevFeedback,
            item.feedback,
            item.createdDate,
            item.updatedDate,
          ]
            .join(" ")
            .toLowerCase()
            .includes(key)
        )
      : [...feedbackRows];

    return rows.sort(
      (a, b) => getFeedbackTimestamp(b) - getFeedbackTimestamp(a)
    );
  }, [feedbackRows, feedbackSearch]);

  const counts = useMemo(() => {
    return logs.reduce(
      (acc, line) => {
        const logLevel = getLogLevel(line);
        acc[logLevel] = (acc[logLevel] || 0) + 1;
        acc.ALL += 1;
        return acc;
      },
      { ALL: 0, INF: 0, WRN: 0, ERR: 0, FTL: 0, DBG: 0, OTHER: 0 }
    );
  }, [logs]);

  const feedbackCounts = useMemo(() => {
    const updated = feedbackRows.filter((item) => item.updatedDate).length;
    const newFeedback = feedbackRows.filter((item) => !item.updatedDate).length;

    const uniqueUsers = new Set(
      feedbackRows.map((item) => item.userName).filter(Boolean)
    ).size;

    return {
      total: feedbackRows.length,
      updated,
      newFeedback,
      uniqueUsers,
    };
  }, [feedbackRows]);

  const levelOptions = ["ALL", "INF", "WRN", "ERR", "FTL", "DBG", "OTHER"];

  const formatDateTime = (value) => {
    if (!value) return "-";

    try {
      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return value;

      return date.toLocaleString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return value;
    }
  };

  const getFeedbackStatus = (item) => {
    if (item.updatedDate) {
      return {
        label: "Updated",
        className: "bg-blue-500/10 text-blue-300 border-blue-500/20",
      };
    }

    return {
      label: "New",
      className: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
    };
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#101827] via-[#1a1f35] to-[#101827] p-4 shadow-lg border border-white/10">
          <div className="absolute -top-16 -right-16 h-48 w-48 rounded-full bg-indigo-500/20 blur-2xl" />
          <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-cyan-500/10 blur-2xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 bg-white/10 border border-white/10 rounded-full px-2.5 py-0.5 text-[9px] text-indigo-200 font-bold mb-1.5">
                🧾 System Monitor
              </div>

              <h1 className="text-xl font-black text-white">
                Logs & Feedback
              </h1>

              <p className="text-[10px] text-indigo-200/60 mt-0.5">
                View application logs and export document feedback from users
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-white">{counts.ALL}</div>
                <div className="text-[8px] text-indigo-200">Logs</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-white">{feedbackCounts.total}</div>
                <div className="text-[8px] text-indigo-200">Feedback</div>
              </div>
              <div className="bg-white/10 backdrop-blur rounded-lg px-3 py-1.5 border border-white/10 text-center">
                <div className="text-sm font-bold text-red-300">{counts.FTL + counts.ERR}</div>
                <div className="text-[8px] text-indigo-200">Critical</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex justify-center">
          <div className="relative inline-flex items-center gap-1.5 rounded-2xl bg-[#101827]/90 backdrop-blur border border-white/10 p-1.5 shadow-xl">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-transparent to-cyan-500/10 pointer-events-none" />

            <button
              onClick={() => setActiveTab("feedback")}
              className={`relative flex items-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 text-xs font-black tracking-wide transition-all duration-300 ${
                activeTab === "feedback"
                  ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-600/40 scale-[1.02]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span
                className={`text-sm transition-transform duration-300 ${
                  activeTab === "feedback" ? "scale-110" : "grayscale opacity-70"
                }`}
              >
                💬
              </span>
              <span className="hidden sm:inline">Feedback</span>

              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-black tabular-nums transition ${
                  activeTab === "feedback"
                    ? "bg-white/25 text-white"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {feedbackCounts.total}
              </span>

              {activeTab === "feedback" && (
                <span className="absolute -bottom-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`relative flex items-center gap-2 rounded-xl px-4 sm:px-5 py-2.5 text-xs font-black tracking-wide transition-all duration-300 ${
                activeTab === "logs"
                  ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/40 scale-[1.02]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <span
                className={`text-sm transition-transform duration-300 ${
                  activeTab === "logs" ? "scale-110" : "grayscale opacity-70"
                }`}
              >
                🧾
              </span>
              <span className="hidden sm:inline">Logs</span>

              <span
                className={`rounded-full px-1.5 py-0.5 text-[9px] font-black tabular-nums transition ${
                  activeTab === "logs"
                    ? "bg-white/25 text-white"
                    : "bg-white/10 text-slate-400"
                }`}
              >
                {counts.ALL}
              </span>

              {activeTab === "logs" && (
                <span className="absolute -bottom-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-white/80 to-transparent" />
              )}
            </button>
          </div>
        </div>

        {activeTab === "logs" ? (
          <>
            {message && (
              <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
                {message}
              </div>
            )}

            {/* Controls */}
            <div className="bg-[#101827] rounded-xl border border-white/10 p-3 shadow-lg">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Log Controls
                  </h2>
                  <p className="text-[9px] text-slate-400">
                    Mode: <span className="font-bold text-indigo-300 uppercase">{mode}</span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={fetchTodayLogs}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 disabled:opacity-60 transition"
                  >
                    Today
                  </button>

                  <select
                    value={lines}
                    onChange={(e) => setLines(Number(e.target.value))}
                    className="border border-white/10 rounded-lg px-2 py-1.5 text-[10px] font-bold bg-[#0f172a] text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value={500}>500</option>
                  </select>

                  <button
                    onClick={fetchTailLogs}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-700 disabled:opacity-60 transition"
                  >
                    Tail
                  </button>

                  <button
                    onClick={mode === "today" ? fetchTodayLogs : fetchTailLogs}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-60 transition"
                  >
                    ⟳
                  </button>

                  <button
                    onClick={clearLogs}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 disabled:opacity-60 transition"
                  >
                    ✕ Clear
                  </button>
                </div>
              </div>
            </div>

            {/* Level Filters */}
            <div className="flex flex-wrap gap-1.5">
              {levelOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => setLevel(item)}
                  className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border transition ${
                    level === item
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-[#101827] text-slate-400 border-white/10 hover:bg-white/5"
                  }`}
                >
                  {item}
                  <span className="ml-1 text-[8px] opacity-70">
                    {counts[item] || 0}
                  </span>
                </button>
              ))}
            </div>

            {/* Log Output */}
            <div className="bg-[#101827] rounded-xl border border-white/10 shadow-lg overflow-hidden">
              <div className="p-3 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">Log Output</h2>
                  <p className="text-[9px] text-slate-400">
                    Showing {filteredLogs.length} of {logs.length} log lines
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full lg:w-64 border border-white/10 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {loading ? (
                <div className="p-6 text-center text-slate-400 text-sm font-bold">
                  Loading logs...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No logs found
                </div>
              ) : (
                <div className="max-h-[500px] overflow-auto bg-[#0a0c12]">
                  {filteredLogs.map((line, index) => {
                    const logLevel = getLogLevel(line);

                    return (
                      <div
                        key={`${line}-${index}`}
                        className="grid grid-cols-[50px_70px_1fr] gap-2 px-3 py-1.5 border-b border-white/5 hover:bg-white/5 font-mono text-[10px]"
                      >
                        <div className="text-slate-500">#{index + 1}</div>

                        <div>
                          <span
                            className={`px-1.5 py-0.5 rounded-lg font-bold ${getLevelClass(
                              logLevel
                            )}`}
                          >
                            {logLevel}
                          </span>
                        </div>

                        <pre className="whitespace-pre-wrap break-words text-slate-300 text-[10px]">
                          {line}
                        </pre>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {feedbackMessage && (
              <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-xs font-bold text-slate-300">
                {feedbackMessage}
              </div>
            )}

            {/* Feedback Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="rounded-lg bg-gradient-to-br from-indigo-600 to-violet-700 p-3 shadow-lg">
                <div className="text-lg font-bold text-white">{feedbackCounts.total}</div>
                <div className="text-[8px] font-bold text-white/80">Total</div>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 p-3 shadow-lg">
                <div className="text-lg font-bold text-white">{feedbackCounts.newFeedback}</div>
                <div className="text-[8px] font-bold text-white/80">New</div>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-blue-600 to-cyan-700 p-3 shadow-lg">
                <div className="text-lg font-bold text-white">{feedbackCounts.updated}</div>
                <div className="text-[8px] font-bold text-white/80">Updated</div>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-purple-600 to-fuchsia-700 p-3 shadow-lg">
                <div className="text-lg font-bold text-white">{feedbackCounts.uniqueUsers}</div>
                <div className="text-[8px] font-bold text-white/80">Users</div>
              </div>
            </div>

            {/* Feedback Table */}
            <div className="bg-[#101827] rounded-xl border border-white/10 shadow-lg overflow-hidden">
              <div className="p-3 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Export Document Feedback
                  </h2>
                  <p className="text-[9px] text-slate-400">
                    Showing {filteredFeedbackRows.length} of {feedbackRows.length} records
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
                  <input
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    placeholder="Search feedback..."
                    className="w-full lg:w-64 border border-white/10 rounded-lg bg-[#0f172a] px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    onClick={fetchFeedback}
                    disabled={feedbackLoading}
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 disabled:opacity-60 transition whitespace-nowrap"
                  >
                    {feedbackLoading ? "Loading..." : "⟳ Refresh"}
                  </button>
                </div>
              </div>

              {feedbackLoading ? (
                <div className="p-6 text-center text-slate-400 text-sm font-bold">
                  Loading feedback...
                </div>
              ) : filteredFeedbackRows.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-sm">
                  No feedback found
                </div>
              ) : (
                <>
                  <div className="hidden xl:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-[#0f172a] border-b border-white/10">
                        <tr>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">ID</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">User</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Document</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dept/Buyer</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Feedback</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Time</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                          <th className="px-3 py-2 text-left text-[9px] font-bold text-slate-400 uppercase tracking-wider">Action</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-white/5">
                        {filteredFeedbackRows.map((item) => {
                          const status = getFeedbackStatus(item);

                          return (
                            <tr key={item.recId} className="hover:bg-white/5 transition">
                              <td className="px-3 py-2 text-xs font-bold text-slate-500">#{item.recId}</td>
                              <td className="px-3 py-2">
                                <p className="text-xs font-bold text-white">{item.userName || "-"}</p>
                                <p className="text-[9px] text-slate-400">{item.roleName || "-"}</p>
                              </td>
                              <td className="px-3 py-2">
                                <span className="inline-flex rounded-lg bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">
                                  {item.exportDocument || "-"}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <p className="text-xs font-bold text-white">{item.departmentName || "-"}</p>
                                <p className="text-[9px] text-slate-400">{item.customerName || "-"}</p>
                              </td>
                              <td className="px-3 py-2 max-w-xs">
                                <p className="text-xs font-bold text-white truncate">
                                  {item.feedback || "-"}
                                </p>
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap">
                                <p className="text-[10px] font-bold text-slate-300">
                                  🕒 {formatDateTime(item.updatedDate || item.createdDate)}
                                </p>
                              </td>
                              <td className="px-3 py-2">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-bold ${status.className}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <button
                                  onClick={() => setSelectedFeedback(item)}
                                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-white text-[9px] font-bold hover:bg-slate-700 transition"
                                >
                                  View
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Cards */}
                  <div className="xl:hidden p-3 space-y-3">
                    {filteredFeedbackRows.map((item) => {
                      const status = getFeedbackStatus(item);

                      return (
                        <div
                          key={item.recId}
                          className="rounded-lg border border-white/10 bg-[#0f172a] p-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-xs font-bold text-white">
                                #{item.recId} • {item.userName || "-"}
                              </p>
                              <p className="text-[9px] text-slate-400">
                                {item.roleName || "-"}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${status.className}`}>
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-2">
                            <p className="text-[9px] font-bold text-slate-400">Document</p>
                            <p className="text-xs font-bold text-indigo-300">{item.exportDocument || "-"}</p>
                          </div>

                          <div className="mt-2">
                            <p className="text-[9px] font-bold text-slate-400">Feedback</p>
                            <p className="text-xs font-bold text-white truncate">{item.feedback || "-"}</p>
                          </div>

                          <div className="mt-2">
                            <p className="text-[9px] font-bold text-slate-400">Time</p>
                            <p className="text-xs font-bold text-slate-300">
                              🕒 {formatDateTime(item.updatedDate || item.createdDate)}
                            </p>
                          </div>

                          <button
                            onClick={() => setSelectedFeedback(item)}
                            className="mt-3 w-full px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-700 transition"
                          >
                            View Details
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Feedback Detail Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl bg-[#0b1220] border border-white/10 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-[#101827] to-[#1a1f35] p-4 text-white flex items-start justify-between gap-3 border-b border-white/10">
              <div>
                <p className="text-[9px] text-indigo-300 font-bold">
                  Feedback Details
                </p>
                <h2 className="text-base font-bold mt-0.5">
                  #{selectedFeedback.recId} • {selectedFeedback.notifyName || "Notification"}
                </h2>
              </div>

              <button
                onClick={() => setSelectedFeedback(null)}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">User</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{selectedFeedback.userName || "-"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">Role</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{selectedFeedback.roleName || "-"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">Export Document</p>
                  <p className="mt-0.5 text-xs font-bold text-indigo-300">{selectedFeedback.exportDocument || "-"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">Notification</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{selectedFeedback.notifyName || "-"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">Department</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{selectedFeedback.departmentName || "-"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">Customer</p>
                  <p className="mt-0.5 text-xs font-bold text-white">{selectedFeedback.customerName || "-"}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">Created</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-300">{formatDateTime(selectedFeedback.createdDate)}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#0f172a] p-3">
                  <p className="text-[8px] font-bold uppercase text-slate-400">Updated</p>
                  <p className="mt-0.5 text-xs font-bold text-slate-300">{formatDateTime(selectedFeedback.updatedDate)}</p>
                </div>
              </div>

              <div className="mt-3 rounded-lg border border-white/10 bg-[#0f172a] p-3">
                <p className="text-[8px] font-bold uppercase text-slate-400">Previous Feedback</p>
                <p className="mt-1 text-xs font-bold text-slate-300 whitespace-pre-wrap">
                  {selectedFeedback.prevFeedback || "-"}
                </p>
              </div>

              <div className="mt-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 p-3">
                <p className="text-[8px] font-bold uppercase text-indigo-300">Current Feedback</p>
                <p className="mt-1 text-sm font-bold text-indigo-200 whitespace-pre-wrap">
                  {selectedFeedback.feedback || "-"}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const getLevelClass = (level) => {
  switch (level) {
    case "FTL":
      return "bg-red-500/20 text-red-300";
    case "ERR":
      return "bg-red-500/20 text-red-300";
    case "WRN":
      return "bg-yellow-500/20 text-yellow-300";
    case "INF":
      return "bg-blue-500/20 text-blue-300";
    case "DBG":
      return "bg-purple-500/20 text-purple-300";
    default:
      return "bg-slate-500/20 text-slate-300";
  }
};

export default LoggerPage;