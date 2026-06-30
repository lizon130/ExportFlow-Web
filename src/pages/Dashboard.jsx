import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

const API_BASE_URL = "http://192.168.9.45:7000";

function Dashboard() {
  const isMounted = useRef(true);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");

  const [exportStats, setExportStats] = useState({
    totalPackagingCount: 0,
    totalExportCount: 0,
    exportPendingCount: 0,
    exportCompletedCount: 0,
    completedExportCount: 0,
    shipmentValue: 0,
    totalBLDateCount: 0,
    totalPendingBLDate: 0,
    completedBLDateCount: 0,
    totalShippingDateCount: 0,
    pendingShippingDateCount: 0,
    completedExportShippingDateCount: 0,
    totalBankSubmissionDateCount: 0,
    completedBankSubmissionDateCount: 0,
    pendingBankSubmissionDateCount: 0,
  });

  const [realizationStats, setRealizationStats] = useState({
    expectedValue: 0,
    realizedValue: 0,
    pendingValue: 0,
    upcomingValue: 0,
    overdueValue: 0,
    realizedPercent: 0,
  });

  const getAuthHeaders = () => {
    const token =
      localStorage.getItem("accessToken") || localStorage.getItem("token") || "";

    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.items)) return data.items;
    if (data && typeof data === "object") return [data];
    return [];
  };

  const getNumber = (value) => {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const sumCountFields = (data, fieldNames) => {
    const fields = Array.isArray(fieldNames) ? fieldNames : [fieldNames];

    return normalizeArray(data).reduce((sum, item) => {
      const rowValue = fields.reduce((value, fieldName) => {
        return value || getNumber(item?.[fieldName]);
      }, 0);

      return sum + rowValue;
    }, 0);
  };

  const sumTotalValue = (data) => {
    return normalizeArray(data).reduce(
      (sum, item) =>
        sum +
        (getNumber(item?.totalValue) ||
          getNumber(item?.totalExportValue) ||
          getNumber(item?.totalNetValue) ||
          0),
      0
    );
  };

  const normalizeKey = (value) => String(value ?? "").trim().toLowerCase();

  const addUniqueText = (list, value) => {
    const textValue = String(value ?? "").trim();
    const key = normalizeKey(textValue);

    if (
      textValue &&
      key &&
      key !== "0" &&
      key !== "null" &&
      key !== "undefined" &&
      !list.some((item) => normalizeKey(item) === key)
    ) {
      list.push(textValue);
    }
  };

  const getLoggedInUserId = () => {
    try {
      const savedUser = JSON.parse(localStorage.getItem("user") || "{}");

      return (
        localStorage.getItem("userId") ||
        savedUser?.recId ||
        savedUser?.userId ||
        savedUser?.id ||
        savedUser?.profile?.recId ||
        savedUser?.profile?.userId ||
        savedUser?.user?.recId ||
        savedUser?.user?.userId ||
        null
      );
    } catch {
      return localStorage.getItem("userId") || null;
    }
  };

  const getAssignedDepartments = (profileData) => {
    const currentUser = profileData || {};

    return normalizeArray(
      currentUser?.departments ||
        currentUser?.department ||
        currentUser?.profile?.departments ||
        currentUser?.user?.departments ||
        currentUser?.assignedDepartments ||
        []
    );
  };

  const getDepartmentApiNames = (profileData) => {
    const assignedDepartments = getAssignedDepartments(profileData);
    const departmentNames = [];

    assignedDepartments.forEach((department) => {
      const primaryDepartmentName =
        department?.departmentCode ||
        department?.deptCode ||
        department?.depCode ||
        department?.departmentName ||
        department?.deptName ||
        department?.depName ||
        department?.name ||
        department?.custDept;

      addUniqueText(departmentNames, primaryDepartmentName);
    });

    return departmentNames;
  };

  const buildEndpointWithDepName = (endpoint, depName) => {
    const separator = endpoint.includes("?") ? "&" : "?";
    return `${endpoint}${separator}depName=${encodeURIComponent(depName)}`;
  };

  const apiGet = async (endpoint, headers = getAuthHeaders()) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers,
    });

    const text = await response.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!response.ok) {
      throw new Error(
        typeof data === "string"
          ? data
          : data?.message || `API failed: ${response.status}`
      );
    }

    return data;
  };

  const fetchEndpointRowsByDepartment = async (
    endpoint,
    headers,
    userProfileData
  ) => {
    const departmentApiNames = getDepartmentApiNames(userProfileData);

    if (departmentApiNames.length) {
      const departmentResponses = await Promise.all(
        departmentApiNames.map(async (depName) => {
          try {
            const data = await apiGet(
              buildEndpointWithDepName(endpoint, depName),
              headers
            );

            return normalizeArray(data);
          } catch (error) {
            console.error(
              `Dashboard depName API failed: ${endpoint}, depName=${depName}`,
              error
            );
            return [];
          }
        })
      );

      return departmentResponses.flat();
    }

    const data = await apiGet(endpoint, headers);
    return normalizeArray(data);
  };

  const fetchUserProfileData = useCallback(async () => {
    const loggedInUserId = getLoggedInUserId();

    if (!loggedInUserId) {
      console.warn("Dashboard: logged-in user ID not found");
      return {};
    }

    try {
      const profile = await apiGet(`/api/User/${loggedInUserId}/profile`);
      return profile || {};
    } catch (error) {
      console.error("Error fetching logged-in user profile:", error);
      return {};
    }
  }, []);

  const fetchExportDocsStats = useCallback(async (userProfileData = null) => {
    const headers = getAuthHeaders();

    const [packingRows, completedRows, pendingRows] = await Promise.all([
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Packing-No-Total-count",
        headers,
        userProfileData
      ),
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Completed-Export-Document-Count",
        headers,
        userProfileData
      ),
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Pending-Export-Document-Count",
        headers,
        userProfileData
      ),
    ]);

    const packingCount = sumCountFields(packingRows, [
      "totalPackagingCount",
      "totalPackingCount",
    ]);

    const completedCount = sumCountFields(completedRows, [
      "completedExportCount",
      "completedExpDocument",
    ]);

    const pendingCount = sumCountFields(pendingRows, [
      "pendingExportCount",
      "pendingExpDocument",
    ]);

    const shipmentValue = sumTotalValue(completedRows);

    if (isMounted.current) {
      setExportStats((prev) => ({
        ...prev,
        totalPackagingCount: packingCount,
        exportCompletedCount: completedCount,
        exportPendingCount: pendingCount,
        totalExportCount: completedCount + pendingCount,
        completedExportCount: completedCount,
        shipmentValue,
      }));
    }
  }, []);

  const fetchBLDateStats = useCallback(async (userProfileData = null) => {
    const headers = getAuthHeaders();

    const [completedRows, pendingRows] = await Promise.all([
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Completed-BL-Date-Count",
        headers,
        userProfileData
      ),
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Pending-BL-Date-Count",
        headers,
        userProfileData
      ),
    ]);

    const completedCount = sumCountFields(completedRows, [
      "completedBLDateCount",
      "completedBL",
    ]);

    const pendingCount = sumCountFields(pendingRows, [
      "pendingBLDateCount",
      "pendingBL",
    ]);

    if (isMounted.current) {
      setExportStats((prev) => ({
        ...prev,
        completedBLDateCount: completedCount,
        totalPendingBLDate: pendingCount,
        totalBLDateCount: completedCount + pendingCount,
      }));
    }
  }, []);

  const fetchShippingStats = useCallback(async (userProfileData = null) => {
    const headers = getAuthHeaders();

    const [completedRows, pendingRows] = await Promise.all([
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Completed-Export-Shipping-Date-Count",
        headers,
        userProfileData
      ),
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Pending-Shipping-Date-Count",
        headers,
        userProfileData
      ),
    ]);

    const completedCount = sumCountFields(completedRows, [
      "completedExportShippingDateCount",
      "completedShipping",
    ]);

    const pendingCount = sumCountFields(pendingRows, [
      "pendingShippingDateCount",
      "pendingShipping",
    ]);

    if (isMounted.current) {
      setExportStats((prev) => ({
        ...prev,
        completedExportShippingDateCount: completedCount,
        pendingShippingDateCount: pendingCount,
        totalShippingDateCount: completedCount + pendingCount,
      }));
    }
  }, []);

  const fetchBankSubmitStats = useCallback(async (userProfileData = null) => {
    const headers = getAuthHeaders();

    const [completedRows, pendingRows] = await Promise.all([
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Completed-Bank-Submission-Date-Count",
        headers,
        userProfileData
      ),
      fetchEndpointRowsByDepartment(
        "/api/Export/Get-Pending-Bank-Submission-Date-Count",
        headers,
        userProfileData
      ),
    ]);

    const completedCount = sumCountFields(completedRows, [
      "completedBankSubmissionDateCount",
      "completedBank",
    ]);

    const pendingCount = sumCountFields(pendingRows, [
      "pendingBankSubmissionDateCount",
      "pendingBank",
    ]);

    if (isMounted.current) {
      setExportStats((prev) => ({
        ...prev,
        completedBankSubmissionDateCount: completedCount,
        pendingBankSubmissionDateCount: pendingCount,
        totalBankSubmissionDateCount: completedCount + pendingCount,
      }));
    }
  }, []);

  const fetchRealizationStats = useCallback(async (userProfileData = null) => {
    const headers = getAuthHeaders();

    const [expectedRows, realizedRows, upcomingRows, overdueRows] =
      await Promise.all([
        fetchEndpointRowsByDepartment(
          "/api/Export/Get-Pending-Realization-Expected-Date-Count",
          headers,
          userProfileData
        ),
        fetchEndpointRowsByDepartment(
          "/api/Export/Get-Completed-Realization-Date-Count",
          headers,
          userProfileData
        ),
        fetchEndpointRowsByDepartment(
          "/api/Export/Get-Pending-Realization-Upcomming-Date-Count",
          headers,
          userProfileData
        ),
        fetchEndpointRowsByDepartment(
          "/api/Export/Get-Pending-Realization-OverDue-Date-Count",
          headers,
          userProfileData
        ),
      ]);

    const expectedValue = sumTotalValue(expectedRows);
    const realizedValue = sumTotalValue(realizedRows);
    const upcomingValue = sumTotalValue(upcomingRows);
    const overdueValue = sumTotalValue(overdueRows);
    const pendingValue = upcomingValue + overdueValue;

    const realizedPercent = expectedValue
      ? Math.min(100, Math.round((realizedValue / expectedValue) * 100))
      : 0;

    if (isMounted.current) {
      setRealizationStats({
        expectedValue,
        realizedValue,
        pendingValue,
        upcomingValue,
        overdueValue,
        realizedPercent,
      });
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setMessage("");

      const userProfileData = await fetchUserProfileData();

      await Promise.all([
        fetchExportDocsStats(userProfileData),
        fetchBLDateStats(userProfileData),
        fetchShippingStats(userProfileData),
        fetchBankSubmitStats(userProfileData),
        fetchRealizationStats(userProfileData),
      ]);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setMessage("Failed to load dashboard data. Please check API, token, or CORS.");
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [
    fetchUserProfileData,
    fetchExportDocsStats,
    fetchBLDateStats,
    fetchShippingStats,
    fetchBankSubmitStats,
    fetchRealizationStats,
  ]);

  useEffect(() => {
    isMounted.current = true;
    fetchDashboardData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchDashboardData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  const formatCurrency = (value) => {
    const numberValue = Number(value || 0);

    if (!Number.isFinite(numberValue)) return "$0";

    const absValue = Math.abs(numberValue);

    if (absValue >= 1000000000) {
      return `$${(numberValue / 1000000000)
        .toFixed(1)
        .replace(/\.0$/, "")}B`;
    }

    if (absValue >= 1000000) {
      return `$${(numberValue / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
    }

    if (absValue >= 1000) {
      return `$${(numberValue / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    }

    return `$${numberValue.toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;
  };

  const cards = useMemo(
    () => [
      {
        id: 1,
        title: "Export Docs",
        icon: "📄",
        completed: exportStats.completedExportCount,
        pending: exportStats.exportPendingCount,
        total: exportStats.totalExportCount,
        note: `Packing List: ${exportStats.totalPackagingCount}`,
        extra: `Export Value: ${formatCurrency(exportStats.shipmentValue)}`,
        color: "from-blue-500 to-cyan-400",
      },
      {
        id: 2,
        title: "B/L Date Check",
        icon: "📋",
        completed: exportStats.completedBLDateCount,
        pending: exportStats.totalPendingBLDate,
        total: exportStats.totalBLDateCount,
        note: `Total: ${exportStats.totalBLDateCount}`,
        color: "from-violet-500 to-purple-400",
      },
      {
        id: 3,
        title: "Shipping",
        icon: "🚚",
        completed: exportStats.completedExportShippingDateCount,
        pending: exportStats.pendingShippingDateCount,
        total: exportStats.totalShippingDateCount,
        note: `Total: ${exportStats.totalShippingDateCount}`,
        color: "from-cyan-500 to-sky-400",
      },
      {
        id: 4,
        title: "Bank Submit",
        icon: "🏦",
        completed: exportStats.completedBankSubmissionDateCount,
        pending: exportStats.pendingBankSubmissionDateCount,
        total: exportStats.totalBankSubmissionDateCount,
        note: `Total: ${exportStats.totalBankSubmissionDateCount}`,
        color: "from-pink-500 to-rose-400",
      },
    ],
    [exportStats]
  );

  const realizationTracking = {
    title: "Realization Tracking",
    shipment: formatCurrency(exportStats.shipmentValue),
    expected: formatCurrency(realizationStats.expectedValue),
    realized: formatCurrency(realizationStats.realizedValue),
    pending: formatCurrency(realizationStats.pendingValue),
    percentage: realizationStats.realizedPercent,
    trend: `${realizationStats.realizedPercent}% realized`,
    upcoming: formatCurrency(realizationStats.upcomingValue),
    overdue: formatCurrency(realizationStats.overdueValue),
  };

  const monthlyData = [
    { month: "Export", value: exportStats.shipmentValue / 1000 },
    { month: "Expected", value: realizationStats.expectedValue / 1000 },
    { month: "Realized", value: realizationStats.realizedValue / 1000 },
    { month: "Pending", value: realizationStats.pendingValue / 1000 },
    { month: "Upcoming", value: realizationStats.upcomingValue / 1000 },
    { month: "Overdue", value: realizationStats.overdueValue / 1000 },
  ];

  const totalDocs =
    exportStats.totalExportCount +
    exportStats.totalBLDateCount +
    exportStats.totalShippingDateCount +
    exportStats.totalBankSubmissionDateCount;

  const totalPending =
    exportStats.exportPendingCount +
    exportStats.totalPendingBLDate +
    exportStats.pendingShippingDateCount +
    exportStats.pendingBankSubmissionDateCount;

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 px-3 py-4 sm:p-5 lg:p-6">
        <div className="w-full my-12 space-y-5 animate-pulse">
          <div className="h-36 rounded-3xl bg-slate-800" />
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-40 rounded-2xl bg-slate-800" />
              ))}
            </div>
            <div className="xl:col-span-4 h-80 rounded-2xl bg-slate-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white px-3 py-4 sm:p-5 lg:p-6">
      <div className="space-y-5 my-12">
        <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-indigo-950 p-5 sm:p-6 border border-white/10 shadow-xl">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1 text-xs text-cyan-100 border border-white/10 mb-3">
                ⚡ Export Intelligence
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-white">
                ExportFlow Dashboard
              </h1>

              <p className="text-slate-300 mt-1 text-sm">
                API based export document, B/L, shipping, bank submit and realization summary.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <HeaderStat label="Total Docs" value={totalDocs} />
              <HeaderStat label="Pending" value={totalPending} />
              <HeaderStat label="Realized" value={`${realizationStats.realizedPercent}%`} />
            </div>
          </div>
        </div>

        {message && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/20 text-red-300 px-5 py-3 text-sm font-bold">
            {message}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-2xl bg-white/10 border border-white/10 text-white px-5 py-2.5 text-sm font-bold hover:bg-white/15 disabled:opacity-60"
          >
            {refreshing ? "Refreshing..." : "Refresh Dashboard"}
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
          <div className="xl:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card) => {
              const percent = card.total
                ? Math.min(100, Math.round((card.completed / card.total) * 100))
                : 0;

              return (
                <div
                  key={card.id}
                  className={`rounded-2xl bg-gradient-to-br ${card.color} p-4 shadow-lg text-white hover:scale-[1.01] transition`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center text-lg">
                        {card.icon}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold">{card.title}</h3>
                        <p className="text-xs text-white/80">Total: {card.total}</p>
                      </div>
                    </div>

                    <span className="rounded-full bg-white/20 text-white px-2.5 py-1 text-[11px] font-bold">
                      Pending: {card.pending}
                    </span>
                  </div>

                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <p className="text-xs text-white/80">Completed</p>
                      <h2 className="text-2xl font-black">{card.completed}</h2>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-white/80">Progress</p>
                      <p className="text-sm font-bold">{percent}%</p>
                    </div>
                  </div>

                  {card.extra && (
                    <p className="text-xs font-bold text-white/95 mb-3">
                      {card.extra}
                    </p>
                  )}

                  <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-white"
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <p className="text-xs text-white/80 border-t border-white/20 pt-3">
                    {card.note}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="xl:col-span-4 rounded-2xl bg-[#1e1b4b] border border-violet-500/40 p-5 shadow-lg text-white">
            <div className="flex justify-between items-start gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 rounded-xl bg-violet-500/20 flex items-center justify-center text-xl">
                  💰
                </div>
                <div>
                  <h2 className="text-lg font-bold">{realizationTracking.title}</h2>
                  <p className="text-xs text-violet-200 mt-1">
                    Export value and realization status
                  </p>
                </div>
              </div>

              <span className="rounded-full bg-violet-500/20 text-violet-200 px-3 py-1 text-xs font-bold">
                {realizationTracking.trend}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <MoneyBox label="Export" value={realizationTracking.shipment} />
              <MoneyBox label="Expected" value={realizationTracking.expected} />
              <MoneyBox label="Realized" value={realizationTracking.realized} />
              <MoneyBox label="Pending" value={realizationTracking.pending} />
            </div>

            <div className="mb-4">
              <div className="h-2.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${realizationTracking.percentage}%` }}
                />
              </div>

              <p className="text-center text-violet-200 text-xs mt-2">
                {realizationTracking.percentage}% Realized
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-violet-500/20 pt-4">
              <MiniBox label="Upcoming" value={realizationTracking.upcoming} />
              <MiniBox label="Overdue" value={realizationTracking.overdue} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <ChartCard title="📈 Realization Value Overview">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#243247" />
                <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <YAxis stroke="#94a3b8" tickFormatter={(value) => `${Math.round(value)}K`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value) * 1000)} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  fill="url(#valueGradient)"
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
}

const HeaderStat = ({ label, value }) => (
  <div className="rounded-2xl bg-white/10 border border-white/10 px-4 py-3 text-center">
    <div className="text-lg font-black text-white">{value}</div>
    <div className="text-[10px] text-slate-300">{label}</div>
  </div>
);

const MoneyBox = ({ label, value }) => (
  <div className="rounded-xl bg-slate-950/70 border border-white/10 px-4 py-3 text-center">
    <p className="text-[11px] text-slate-400">{label}</p>
    <h3 className="text-base font-black text-white mt-1">{value}</h3>
  </div>
);

const MiniBox = ({ label, value }) => (
  <div className="rounded-xl bg-slate-950/70 border border-white/10 p-3 text-center">
    <p className="text-[11px] text-slate-400">{label}</p>
    <h3 className="text-sm font-black text-white mt-1">{value}</h3>
  </div>
);

const ChartCard = ({ title, children }) => (
  <div className="rounded-2xl bg-[#101b2d] border border-white/10 p-5 shadow-lg">
    <h2 className="text-lg font-bold text-white mb-1">{title}</h2>
    <p className="text-xs text-slate-400 mb-4">Live API dashboard overview</p>
    <div className="h-72">{children}</div>
  </div>
);

export default Dashboard;
