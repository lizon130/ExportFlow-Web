import React, { useEffect, useMemo, useState } from "react";

const LOGGER_API_BASE = "http://192.168.9.45:7000/api/Logger";
const FEEDBACK_API_BASE =
  "http://192.168.9.45:7000/api/Notification/get-all-export-document-feedback";

function LoggerPage() {
  const [activeTab, setActiveTab] = useState("logs");

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

  const filteredFeedbackRows = useMemo(() => {
    const key = feedbackSearch.trim().toLowerCase();

    if (!key) return feedbackRows;

    return feedbackRows.filter((item) =>
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
        className: "bg-blue-100 text-blue-700 border-blue-200",
      };
    }

    return {
      label: "New",
      className: "bg-emerald-100 text-emerald-700 border-emerald-200",
    };
  };

  return (
    <div className="min-h-screen w-full bg-slate-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-gray-900 to-indigo-950 p-5 sm:p-8 mb-6 shadow-2xl">
          <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1 text-xs text-indigo-100 mb-4">
                🧾 System Monitor
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                Logs & Feedback
              </h1>

              <p className="text-indigo-100 mt-2 text-sm sm:text-base">
                View application logs and export document feedback from users.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <InfoBox value={counts.ALL} label="Logs" />
              <InfoBox value={feedbackCounts.total} label="Feedback" />
              <InfoBox value={counts.FTL + counts.ERR} label="Critical" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-2 mb-6">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setActiveTab("logs")}
              className={`rounded-2xl px-5 py-3 text-sm font-extrabold transition ${
                activeTab === "logs"
                  ? "bg-slate-900 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              🧾 Application Logs
            </button>

            <button
              onClick={() => setActiveTab("feedback")}
              className={`rounded-2xl px-5 py-3 text-sm font-extrabold transition ${
                activeTab === "feedback"
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              💬 Export Feedback
            </button>
          </div>
        </div>

        {activeTab === "logs" ? (
          <>
            {message && (
              <div className="mb-5 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
                {message}
              </div>
            )}

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-4 sm:p-6 mb-6">
              <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    Log Controls
                  </h2>
                  <p className="text-sm text-slate-500">
                    Current mode:{" "}
                    <span className="font-bold text-indigo-700 uppercase">
                      {mode}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 w-full xl:w-auto">
                  <button
                    onClick={fetchTodayLogs}
                    disabled={loading}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    Today Logs
                  </button>

                  <div className="flex gap-2">
                    <select
                      value={lines}
                      onChange={(e) => setLines(Number(e.target.value))}
                      className="w-full border border-slate-200 rounded-2xl px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value={50}>50 lines</option>
                      <option value={100}>100 lines</option>
                      <option value={200}>200 lines</option>
                      <option value={500}>500 lines</option>
                    </select>
                  </div>

                  <button
                    onClick={fetchTailLogs}
                    disabled={loading}
                    className="px-5 py-3 rounded-2xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-60"
                  >
                    Tail Logs
                  </button>

                  <button
                    onClick={mode === "today" ? fetchTodayLogs : fetchTailLogs}
                    disabled={loading}
                    className="px-5 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Refresh
                  </button>

                  <button
                    onClick={clearLogs}
                    disabled={loading}
                    className="px-5 py-3 rounded-2xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-60"
                  >
                    Clear Logs
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
              {levelOptions.map((item) => (
                <button
                  key={item}
                  onClick={() => setLevel(item)}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold border transition ${
                    level === item
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {item}
                  <span className="ml-2 text-xs opacity-70">
                    {counts[item] || 0}
                  </span>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    Log Output
                  </h2>
                  <p className="text-sm text-slate-500">
                    Showing {filteredLogs.length} of {logs.length} log lines
                  </p>
                </div>

                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search logs..."
                  className="w-full lg:w-96 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {loading ? (
                <div className="p-10 text-center text-slate-500 font-semibold">
                  Loading logs...
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  No logs found
                </div>
              ) : (
                <div className="max-h-[650px] overflow-auto bg-slate-950">
                  <div className="min-w-[900px]">
                    {filteredLogs.map((line, index) => {
                      const logLevel = getLogLevel(line);

                      return (
                        <div
                          key={`${line}-${index}`}
                          className="grid grid-cols-[70px_80px_1fr] gap-3 px-4 py-2 border-b border-white/5 hover:bg-white/5 font-mono text-xs"
                        >
                          <div className="text-slate-500">#{index + 1}</div>

                          <div>
                            <span
                              className={`px-2 py-1 rounded-lg font-bold ${getLevelClass(
                                logLevel
                              )}`}
                            >
                              {logLevel}
                            </span>
                          </div>

                          <pre className="whitespace-pre-wrap break-words text-slate-200">
                            {line}
                          </pre>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {feedbackMessage && (
              <div className="mb-5 rounded-2xl bg-white border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 shadow-sm">
                {feedbackMessage}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <FeedbackInfoCard
                value={feedbackCounts.total}
                label="Total Feedback"
                icon="💬"
                color="indigo"
              />
              <FeedbackInfoCard
                value={feedbackCounts.newFeedback}
                label="New Feedback"
                icon="🆕"
                color="emerald"
              />
              <FeedbackInfoCard
                value={feedbackCounts.updated}
                label="Updated Feedback"
                icon="✏️"
                color="blue"
              />
              <FeedbackInfoCard
                value={feedbackCounts.uniqueUsers}
                label="Users"
                icon="👤"
                color="purple"
              />
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-800">
                    Export Document Feedback
                  </h2>
                  <p className="text-sm text-slate-500">
                    Showing {filteredFeedbackRows.length} of{" "}
                    {feedbackRows.length} feedback records
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  <input
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    placeholder="Search feedback, user, document, department..."
                    className="w-full xl:w-[420px] border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    onClick={fetchFeedback}
                    disabled={feedbackLoading}
                    className="px-5 py-3 rounded-2xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-60"
                  >
                    {feedbackLoading ? "Loading..." : "Refresh"}
                  </button>
                </div>
              </div>

              {feedbackLoading ? (
                <div className="p-10 text-center text-slate-500 font-semibold">
                  Loading feedback...
                </div>
              ) : filteredFeedbackRows.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  No feedback found
                </div>
              ) : (
                <>
                  <div className="hidden xl:block overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <TableHead>ID</TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Notification</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Department / Buyer</TableHead>
                          <TableHead>Feedback</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Action</TableHead>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-100">
                        {filteredFeedbackRows.map((item) => {
                          const status = getFeedbackStatus(item);

                          return (
                            <tr
                              key={item.recId}
                              className="hover:bg-slate-50 transition"
                            >
                              <td className="px-5 py-4 text-sm font-bold text-slate-500">
                                #{item.recId}
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-extrabold text-slate-800">
                                  {item.userName || "-"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.roleName || "-"}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-bold text-slate-700">
                                  {item.notifyName || "-"}
                                </p>
                                <p className="text-xs text-slate-400">
                                  Created: {formatDateTime(item.createdDate)}
                                </p>
                              </td>

                              <td className="px-5 py-4">
                                <span className="inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                  {item.exportDocument || "-"}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <p className="text-sm font-bold text-slate-700">
                                  {item.departmentName || "-"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {item.customerName || "-"}
                                </p>
                              </td>

                              <td className="px-5 py-4 max-w-xs">
                                <p className="text-sm font-bold text-slate-800 line-clamp-2">
                                  {item.feedback || "-"}
                                </p>
                                {item.prevFeedback && (
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                                    Previous: {item.prevFeedback}
                                  </p>
                                )}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}
                                >
                                  {status.label}
                                </span>
                              </td>

                              <td className="px-5 py-4">
                                <button
                                  onClick={() => setSelectedFeedback(item)}
                                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700"
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

                  <div className="xl:hidden p-4 space-y-4">
                    {filteredFeedbackRows.map((item) => {
                      const status = getFeedbackStatus(item);

                      return (
                        <div
                          key={item.recId}
                          className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-extrabold text-slate-800">
                                #{item.recId} • {item.userName || "-"}
                              </p>
                              <p className="text-xs text-slate-500">
                                {item.roleName || "-"} •{" "}
                                {formatDateTime(item.createdDate)}
                              </p>
                            </div>

                            <span
                              className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div className="mt-3">
                            <p className="text-xs font-bold text-slate-500">
                              Document
                            </p>
                            <p className="text-sm font-bold text-indigo-700">
                              {item.exportDocument || "-"}
                            </p>
                          </div>

                          <div className="mt-3">
                            <p className="text-xs font-bold text-slate-500">
                              Feedback
                            </p>
                            <p className="text-sm font-bold text-slate-800">
                              {item.feedback || "-"}
                            </p>
                          </div>

                          <button
                            onClick={() => setSelectedFeedback(item)}
                            className="mt-4 w-full px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-700"
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

      {selectedFeedback && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-slate-950 via-gray-900 to-indigo-950 p-5 text-white flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-indigo-200 font-bold">
                  Feedback Details
                </p>
                <h2 className="text-2xl font-extrabold mt-1">
                  #{selectedFeedback.recId} •{" "}
                  {selectedFeedback.notifyName || "Notification"}
                </h2>
              </div>

              <button
                onClick={() => setSelectedFeedback(null)}
                className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <DetailBox label="User" value={selectedFeedback.userName} />
                <DetailBox label="Role" value={selectedFeedback.roleName} />
                <DetailBox
                  label="Export Document"
                  value={selectedFeedback.exportDocument}
                />
                <DetailBox
                  label="Notification"
                  value={selectedFeedback.notifyName}
                />
                <DetailBox
                  label="Department"
                  value={`${selectedFeedback.departmentCode || "-"} / ${
                    selectedFeedback.departmentName || "-"
                  }`}
                />
                <DetailBox
                  label="Customer"
                  value={`${selectedFeedback.customerCode || "-"} / ${
                    selectedFeedback.customerName || "-"
                  }`}
                />
                <DetailBox
                  label="Created"
                  value={formatDateTime(selectedFeedback.createdDate)}
                />
                <DetailBox
                  label="Updated"
                  value={formatDateTime(selectedFeedback.updatedDate)}
                />
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-extrabold uppercase text-slate-500">
                  Previous Feedback
                </p>
                <p className="mt-2 text-sm font-bold text-slate-700 whitespace-pre-wrap">
                  {selectedFeedback.prevFeedback || "-"}
                </p>
              </div>

              <div className="mt-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs font-extrabold uppercase text-indigo-500">
                  Current Feedback
                </p>
                <p className="mt-2 text-base font-extrabold text-indigo-900 whitespace-pre-wrap">
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

const InfoBox = ({ value, label }) => (
  <div className="bg-white/10 backdrop-blur rounded-2xl px-3 sm:px-5 py-3 sm:py-4 border border-white/10 text-center">
    <div className="text-xl sm:text-2xl font-bold text-white">{value}</div>
    <div className="text-[10px] sm:text-xs text-indigo-100">{label}</div>
  </div>
);

const FeedbackInfoCard = ({ value, label, icon, color }) => {
  const colorClass = {
    indigo: "from-indigo-600 to-violet-700",
    emerald: "from-emerald-600 to-green-700",
    blue: "from-blue-600 to-cyan-700",
    purple: "from-purple-600 to-fuchsia-700",
  };

  return (
    <div
      className={`rounded-3xl bg-gradient-to-br ${
        colorClass[color] || colorClass.indigo
      } p-5 shadow-xl text-white`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-3xl font-extrabold">{value}</p>
          <p className="text-sm font-bold text-white/80">{label}</p>
        </div>

        <div className="h-12 w-12 rounded-2xl bg-white/15 flex items-center justify-center text-2xl">
          {icon}
        </div>
      </div>
    </div>
  );
};

const TableHead = ({ children }) => (
  <th className="px-5 py-4 text-left text-xs font-extrabold text-slate-500 uppercase tracking-wider">
    {children}
  </th>
);

const DetailBox = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <p className="text-xs font-extrabold uppercase text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-bold text-slate-800 break-words">
      {value || "-"}
    </p>
  </div>
);

export default LoggerPage;
