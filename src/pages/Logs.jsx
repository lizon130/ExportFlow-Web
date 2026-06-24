import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://192.168.9.45:7000/api/Logger";

function LoggerPage() {
  const [logs, setLogs] = useState([]);
  const [mode, setMode] = useState("today");
  const [lines, setLines] = useState(200);
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getHeaders = () => {
    const token = localStorage.getItem("accessToken");

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

  const fetchTodayLogs = async () => {
    try {
      setLoading(true);
      setMessage("");
      setMode("today");

      const res = await fetch(`${API_BASE}/today`, {
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

      const res = await fetch(`${API_BASE}/tail?lines=${lines}`, {
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

  const clearLogs = async () => {
    const confirmClear = window.confirm(
      "Are you sure you want to clear log files?"
    );

    if (!confirmClear) return;

    try {
      setLoading(true);
      setMessage("");

      const res = await fetch(`${API_BASE}/clear`, {
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

  const levelOptions = ["ALL", "INF", "WRN", "ERR", "FTL", "DBG", "OTHER"];

  return (
    <div className="min-h-screen w-full bg-slate-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-950 via-gray-900 to-indigo-950 p-5 sm:p-8 mb-6 shadow-2xl">
          <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-indigo-500/30 blur-3xl" />
          <div className="absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />

          <div className="relative flex flex-col lg:flex-row justify-between lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 border border-white/10 rounded-full px-4 py-1 text-xs text-indigo-100 mb-4">
                🧾 System Logger
              </div>

              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white">
                Application Logs
              </h1>

              <p className="text-indigo-100 mt-2 text-sm sm:text-base">
                View today logs, tail logs, search, filter and clear log files.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <InfoBox value={counts.ALL} label="Total" />
              <InfoBox value={counts.INF} label="Info" />
              <InfoBox value={counts.FTL + counts.ERR} label="Critical" />
            </div>
          </div>
        </div>

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
      </div>
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

export default LoggerPage;