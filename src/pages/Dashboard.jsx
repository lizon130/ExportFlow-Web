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
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-300",
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
        bg: "bg-violet-500/10",
        border: "border-violet-500/20",
        text: "text-violet-300",
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
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
        text: "text-cyan-300",
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
        bg: "bg-pink-500/10",
        border: "border-pink-500/20",
        text: "text-pink-300",
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
      <div className="min-h-screen w-full bg-[#0a0c12] p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-4 animate-pulse">
          <div className="h-28 rounded-xl bg-[#101827]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 rounded-xl bg-[#101827]" />
            ))}
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className="h-64 rounded-xl bg-[#101827]" />
            <div className="h-64 rounded-xl bg-[#101827]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-xl bg-gradient-to-r from-[#101827] via-[#1a1f35] to-[#101827] border border-white/10 p-4 shadow-lg">
          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[9px] font-bold text-blue-300 border border-blue-500/20 mb-1.5">
                ⚡ Export Intelligence
              </div>

              <h1 className="text-xl font-black text-white">
                ExportFlow Dashboard
              </h1>

              <p className="text-[10px] text-slate-400 mt-0.5">
                API based export document, B/L, shipping, bank submit and realization summary
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-center">
                <div className="text-sm font-bold text-white">{totalDocs}</div>
                <div className="text-[8px] text-slate-400">Total Docs</div>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-center">
                <div className="text-sm font-bold text-amber-300">{totalPending}</div>
                <div className="text-[8px] text-slate-400">Pending</div>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-center">
                <div className="text-sm font-bold text-emerald-300">{realizationStats.realizedPercent}%</div>
                <div className="text-[8px] text-slate-400">Realized</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 text-[10px] text-slate-400">
              <span>📊 Last updated: {new Date().toLocaleString()}</span>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="rounded-lg bg-white/10 border border-white/10 text-white px-3 py-1.5 text-[10px] font-bold hover:bg-white/15 disabled:opacity-60 transition whitespace-nowrap"
            >
              {refreshing ? "⟳ Refreshing..." : "⟳ Refresh"}
            </button>
          </div>
        </div>

        {message && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 px-3 py-2 text-xs font-bold">
            ⚠️ {message}
          </div>
        )}

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {cards.map((card) => {
            const percent = card.total
              ? Math.min(100, Math.round((card.completed / card.total) * 100))
              : 0;

            return (
              <div
                key={card.id}
                className={`rounded-xl bg-[#101827] border ${card.border} p-3 shadow-lg hover:scale-[1.02] transition-all duration-200`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-lg ${card.bg} flex items-center justify-center text-base`}>
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white">{card.title}</h3>
                      <p className="text-[8px] text-slate-400">Total: {card.total}</p>
                    </div>
                  </div>
                  <span className={`rounded-full ${card.bg} ${card.text} px-1.5 py-0.5 text-[8px] font-bold border ${card.border}`}>
                    P: {card.pending}
                  </span>
                </div>

                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[8px] text-slate-400">Completed</p>
                    <h2 className="text-xl font-bold text-white">{card.completed}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] text-slate-400">Progress</p>
                    <p className="text-xs font-bold text-white">{percent}%</p>
                  </div>
                </div>

                {card.extra && (
                  <p className="text-[9px] font-bold text-white/80 mb-1.5 truncate">
                    {card.extra}
                  </p>
                )}

                <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r ${card.color}"
                    style={{ 
                      width: `${percent}%`,
                      background: `linear-gradient(to right, ${card.color.split(' ')[0].replace('from-', '')}, ${card.color.split(' ')[1].replace('to-', '')})`
                    }}
                  />
                </div>

                <p className="text-[8px] text-slate-400 border-t border-white/5 pt-1.5">
                  {card.note}
                </p>
              </div>
            );
          })}
        </div>

        {/* Realization Card & Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          {/* Realization Card */}
          <div className="xl:col-span-4 rounded-xl bg-[#101827] border border-violet-500/20 p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-violet-500/20 flex items-center justify-center text-base">
                  💰
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Realization</h2>
                  <p className="text-[8px] text-violet-300">Export value & status</p>
                </div>
              </div>
              <span className="rounded-full bg-violet-500/20 text-violet-200 px-1.5 py-0.5 text-[8px] font-bold">
                {realizationTracking.trend}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 mb-3">
              <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
                <p className="text-[8px] text-slate-400">Export</p>
                <h3 className="text-xs font-bold text-white">{realizationTracking.shipment}</h3>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
                <p className="text-[8px] text-slate-400">Expected</p>
                <h3 className="text-xs font-bold text-blue-300">{realizationTracking.expected}</h3>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
                <p className="text-[8px] text-slate-400">Realized</p>
                <h3 className="text-xs font-bold text-emerald-300">{realizationTracking.realized}</h3>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
                <p className="text-[8px] text-slate-400">Pending</p>
                <h3 className="text-xs font-bold text-amber-300">{realizationTracking.pending}</h3>
              </div>
            </div>

            <div className="mb-3">
              <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-400"
                  style={{ width: `${realizationTracking.percentage}%` }}
                />
              </div>
              <p className="text-center text-[9px] text-violet-300 mt-1">
                {realizationTracking.percentage}% Realized
              </p>
            </div>

            <div className="grid grid-cols-2 gap-1.5 border-t border-violet-500/20 pt-2">
              <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
                <p className="text-[8px] text-slate-400">Upcoming</p>
                <h3 className="text-xs font-bold text-orange-300">{realizationTracking.upcoming}</h3>
              </div>
              <div className="rounded-lg bg-white/5 border border-white/10 px-2 py-1.5 text-center">
                <p className="text-[8px] text-slate-400">Overdue</p>
                <h3 className="text-xs font-bold text-red-300">{realizationTracking.overdue}</h3>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="xl:col-span-8 grid grid-cols-1 gap-3">
            <ChartCard title="Realization Value Overview">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                  <YAxis stroke="#94a3b8" tickFormatter={(value) => `${Math.round(value)}K`} tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value) * 1000)} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="url(#valueGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>

        {/* Document Pipeline Chart */}
        <div className="rounded-xl bg-[#101827] border border-white/10 p-3 shadow-lg">
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <h2 className="text-sm font-bold text-white">📦 Document Pipeline</h2>
              <p className="text-[8px] text-slate-400">Complete, Pending breakdown by category</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-[8px] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Complete
              </span>
              <span className="flex items-center gap-1 text-[8px] text-orange-300">
                <span className="h-2 w-2 rounded-full bg-orange-500" /> Pending
              </span>
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cards}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="title" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <Tooltip />
                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

const ChartCard = ({ title, children }) => (
  <div className="rounded-xl bg-[#101827] border border-white/10 p-3 shadow-lg">
    <h2 className="text-sm font-bold text-white mb-0.5">{title}</h2>
    <p className="text-[8px] text-slate-400 mb-2">Live API dashboard overview</p>
    <div className="h-52">{children}</div>
  </div>
);

export default Dashboard;