import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://192.168.11.39:7000";

function RealizationPage() {
  const [activeModal, setActiveModal] = useState(null);
  const [selectedRealizationGroup, setSelectedRealizationGroup] = useState(null);
  const [exportViewMode, setExportViewMode] = useState("deptBuyer");
  const [expectedViewMode, setExpectedViewMode] = useState("deptBuyer");
  const [realizedViewMode, setRealizedViewMode] = useState("deptBuyer");
  const [upcomingViewMode, setUpcomingViewMode] = useState("deptBuyer");
  const [overdueViewMode, setOverdueViewMode] = useState("deptBuyer");
  const [realizationSearchText, setRealizationSearchText] = useState({
    exportValue: "",
    expected: "",
    realized: "",
    upcoming: "",
    overdue: "",
  });
  const [groupDetailSearchText, setGroupDetailSearchText] = useState("");

  // Document number popup for month/factory drill-down rows
  const [selectedDocumentPopup, setSelectedDocumentPopup] = useState(null);
  const [documentPopupSearchText, setDocumentPopupSearchText] = useState("");

  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [exportDetailLoading, setExportDetailLoading] = useState(false);
  const [exportDetailRows, setExportDetailRows] = useState([]);
  const [fromDate, setFromDate] = useState("2026-01-01");
  const [toDate, setToDate] = useState("2026-12-31");
  const [dashboardStats, setDashboardStats] = useState({
    exportValueAmount: 0,
    totalAmount: 0,
    realizedAmount: 0,
    expectedAmount: 0,
    overdueAmount: 0,

    exportDocumentCount: 0,
    expectedDocumentCount: 0,
    realizedDocumentCount: 0,
    upcomingDocumentCount: 0,
    overdueDocumentCount: 0,

    exportRows: [],
    expectedRows: [],
    realizedRows: [],
    upcomingRows: [],
    overdueRows: [],

    invoices: 0,
    realizedPercent: 0,
    lastUpdated: "-",
  });

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.items)) return data.items;
    if (data && typeof data === "object") return [data];
    return [];
  };

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const getUniqueRowKey = (item, index) => {
    const monthValue =
      item?.expectedMonth ||
      item?.realizationMonth ||
      item?.upcomingMonth ||
      item?.overDueMonth ||
      "";

    const keyParts = [
      item?.recId,
      item?.id,
      item?.exportDocumentNo,
      item?.expDocumentNo,
      item?.invoiceNo,
      item?.departmentCode,
      item?.departmentName,
      item?.customerCode,
      item?.customerName,
      item?.factoryCode,
      item?.factoryName,
      monthValue,
      item?.totalValue,
      item?.completedExportCount,
      item?.expectedMonthlyTotalDocumentsCount,
      item?.completedRealizationDateCount,
      item?.upcomingMonthlyTotalDocumentsCount,
      item?.overDueMonthlyTotalDocumentsCount,
    ]
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join("|");

    return keyParts || `row-${index}`;
  };

  const removeDuplicateRows = (rows) => {
    const seen = new Set();

    return normalizeArray(rows).filter((item, index) => {
      const key = getUniqueRowKey(item, index);

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
  };

  const getStoredJsonValue = (key) => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch {
      return null;
    }
  };

  const decodeJwtPayload = (token) => {
    try {
      if (!token || !token.includes(".")) return {};

      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map((char) => "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );

      return JSON.parse(jsonPayload);
    } catch {
      return {};
    }
  };

  const getAccessTokenFromPayload = (payload) => {
    if (!payload) return "";

    if (typeof payload === "string" && payload.includes(".")) return payload;

    return (
      payload?.accessToken ||
      payload?.token ||
      payload?.jwtToken ||
      payload?.data?.accessToken ||
      payload?.user?.accessToken ||
      ""
    );
  };

  const getToken = () => {
    const user = getStoredJsonValue("user");
    const userData = getStoredJsonValue("userData");
    const authData = getStoredJsonValue("authData");

    return (
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      localStorage.getItem("jwtToken") ||
      localStorage.getItem("authToken") ||
      getAccessTokenFromPayload(user) ||
      getAccessTokenFromPayload(userData) ||
      getAccessTokenFromPayload(authData) ||
      ""
    );
  };

  const getUserIdFromPayload = (payload) => {
    if (!payload || typeof payload === "string") return null;

    return (
      payload?.recId ||
      payload?.userId ||
      payload?.id ||
      payload?.profile?.recId ||
      payload?.profile?.userId ||
      payload?.profile?.id ||
      payload?.user?.recId ||
      payload?.user?.userId ||
      payload?.user?.id ||
      payload?.data?.recId ||
      payload?.data?.userId ||
      payload?.data?.id ||
      null
    );
  };

  const getProfileFromPayload = (payload) => {
    if (!payload || typeof payload === "string") return null;

    if (normalizeArray(payload?.departments).length) return payload;
    if (normalizeArray(payload?.profile?.departments).length) return payload.profile;
    if (normalizeArray(payload?.user?.departments).length) return payload.user;
    if (normalizeArray(payload?.data?.departments).length) return payload.data;

    return null;
  };

  const getStoredAuthPayload = () => {
    const storageKeys = [
      "userData",
      "userInfo",
      "user",
      "authUser",
      "authData",
      "loginUser",
      "loggedInUser",
      "currentUser",
      "profile",
      "userProfile",
    ];

    for (const key of storageKeys) {
      const payload = getStoredJsonValue(key);
      if (payload) return payload;
    }

    return null;
  };

  const fetchLoggedInUserProfile = async () => {
    const storedPayload = getStoredAuthPayload();
    const profileFromPayload = getProfileFromPayload(storedPayload);

    if (profileFromPayload) return profileFromPayload;

    const token = getToken();
    const tokenPayload = decodeJwtPayload(token);

    const userId =
      localStorage.getItem("userId") ||
      localStorage.getItem("recId") ||
      localStorage.getItem("id") ||
      localStorage.getItem("loggedInUserId") ||
      localStorage.getItem("currentUserId") ||
      tokenPayload.sub ||
      tokenPayload.nameid ||
      tokenPayload.userId ||
      getUserIdFromPayload(storedPayload);

    if (!userId) {
      console.warn("Realization access: logged-in user id not found");
      return storedPayload || null;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/User/${encodeURIComponent(userId)}/profile`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (profileError) {
      console.error("Error fetching logged-in user profile:", profileError);
      return storedPayload || null;
    }
  };

  const getAssignedDepartments = (profile) =>
    normalizeArray(
      profile?.departments ||
        profile?.department ||
        profile?.assignedDepartments ||
        profile?.profile?.departments ||
        profile?.user?.departments ||
        profile?.data?.departments ||
        []
    );

  const getDepartmentQueryValues = (department) => {
    const values = [
      department?.departmentCode,
      department?.deptCode,
      department?.depCode,
      department?.departmentName,
      department?.deptName,
      department?.depName,
      department?.name,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return values.filter(
      (value, index, allValues) =>
        allValues.findIndex(
          (item) => normalizeText(item) === normalizeText(value)
        ) === index
    );
  };

  const getAuthorizedDepartments = async () => {
    const profile = await fetchLoggedInUserProfile();
    const assignedDepartments = getAssignedDepartments(profile);

    if (assignedDepartments.length) return assignedDepartments;

    return [];
  };

  const appendDateQueryParams = (url, fromDateValue, toDateValue) => {
    let finalUrl = url;
    const separator = finalUrl.includes("?") ? "&" : "?";
    const params = [];

    if (fromDateValue) {
      params.push(`fromDate=${encodeURIComponent(fromDateValue)}`);
    }
    if (toDateValue) {
      params.push(`toDate=${encodeURIComponent(toDateValue)}`);
    }

    if (params.length) {
      finalUrl += separator + params.join("&");
    }

    return finalUrl;
  };

  const fetchRowsWithoutDepartment = async (endpoint, fromDateValue, toDateValue) => {
    const fullUrl = appendDateQueryParams(`${API_BASE_URL}${endpoint}`, fromDateValue, toDateValue);

    try {
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`fetchRowsWithoutDepartment warning: HTTP ${response.status} for ${endpoint}`);
        return [];
      }

      return normalizeArray(await response.json());
    } catch (error) {
      console.warn("fetchRowsWithoutDepartment failed:", error?.message);
      return [];
    }
  };

  const fetchRowsForDepartment = async (endpoint, department, fromDateValue, toDateValue) => {
    const queryValues = getDepartmentQueryValues(department);
    const finalQueryValues = queryValues.length ? [...queryValues, ""] : [""];

    let lastError = null;

    for (const queryValue of finalQueryValues) {
      let url = queryValue
        ? `${API_BASE_URL}${endpoint}${
            endpoint.includes("?") ? "&" : "?"
          }depName=${encodeURIComponent(queryValue)}`
        : `${API_BASE_URL}${endpoint}`;

      url = appendDateQueryParams(url, fromDateValue, toDateValue);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          lastError = new Error(`HTTP error! status: ${response.status}`);
          continue;
        }

        const rows = normalizeArray(await response.json());

        if (rows.length || !queryValue) return rows;
      } catch (error) {
        console.warn(`fetchRowsForDepartment warning for ${queryValue || "(no dep)"}:`, error?.message);
        lastError = error;
      }
    }

    try {
      const fallbackUrl = appendDateQueryParams(`${API_BASE_URL}${endpoint}`, fromDateValue, toDateValue);
      const response = await fetch(fallbackUrl, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const allRows = normalizeArray(await response.json());
        const deptFilters = queryValues.map((v) => normalizeText(v)).filter(Boolean);

        if (!deptFilters.length) return removeDuplicateRows(allRows);

        const filteredRows = allRows.filter((row) => {
          const rowDeptValues = [
            row?.departmentCode,
            row?.deptCode,
            row?.depCode,
            row?.departmentName,
            row?.deptName,
            row?.depName,
          ].map((v) => normalizeText(v));

          return deptFilters.some((filter) =>
            rowDeptValues.some((rowVal) => rowVal === filter)
          );
        });

        return removeDuplicateRows(filteredRows);
      }
    } catch (fallbackError) {
      console.warn("fetchRowsForDepartment fallback also failed:", fallbackError?.message);
    }

    if (lastError) {
      console.warn("fetchRowsForDepartment returning empty, last error:", lastError?.message);
    }

    return [];
  };

  const fetchRowsForAuthorizedDepartments = async (endpoint, fromDateValue, toDateValue) => {
    const authorizedDepartments = await getAuthorizedDepartments();

    if (!authorizedDepartments.length) {
      const rows = await fetchRowsWithoutDepartment(endpoint, fromDateValue, toDateValue);
      return removeDuplicateRows(rows);
    }

    let mergedRows = [];

    for (const department of authorizedDepartments) {
      const rows = await fetchRowsForDepartment(endpoint, department, fromDateValue, toDateValue);
      mergedRows = [...mergedRows, ...rows];
    }

    return removeDuplicateRows(mergedRows);
  };

  const fetchPendingRealizationRowsByDepartment = async (
    endpoint,
    departmentCode,
    departmentName,
    fromDateValue,
    toDateValue
  ) => {
    const candidates = [
      String(departmentCode || "").trim(),
      String(departmentName || "").trim(),
    ].filter(Boolean);

    for (const candidate of candidates) {
      let url = `${API_BASE_URL}${endpoint}?depName=${encodeURIComponent(candidate)}`;
      url = appendDateQueryParams(url, fromDateValue, toDateValue);

      try {
        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) continue;

        const rows = removeDuplicateRows(normalizeArray(await response.json()));
        if (rows.length) return rows;
      } catch (error) {
        console.warn("Pending realization detail request failed:", error?.message);
      }
    }

    return [];
  };

  const fetchUpcomingDocumentRows = async (fromDateValue, toDateValue) => {
    try {
      const rows = await fetchRowsForAuthorizedDepartments(
        "/api/Export/Get-Pending-Realization-Upcomming-Date-Count-List",
        fromDateValue,
        toDateValue
      );

      return removeDuplicateRows(rows);
    } catch (error) {
      console.warn("fetchUpcomingDocumentRows failed, returning empty:", error?.message);
      return [];
    }
  };

  const fetchOverdueDocumentRows = async (fromDateValue, toDateValue) => {
    try {
      const rows = await fetchRowsForAuthorizedDepartments(
        "/api/Export/Get-Pending-Realization-OverDue-Date-Count-List",
        fromDateValue,
        toDateValue
      );

      return removeDuplicateRows(rows);
    } catch (error) {
      console.warn("fetchOverdueDocumentRows failed, returning empty:", error?.message);
      return [];
    }
  };

  const fetchExportValueDetailRows = async (fromDateValue, toDateValue) => {
    /*
      FIX:
      Export Value summary API returns one total row with departmentCode/null.
      That row is only for the top card value.

      The modal must use the detail API:
      /api/Export/Get-By-Dept-Completed-Export-Docment-List

      This is why Unknown Department was showing before.
    */
    const rows = await fetchRowsForAuthorizedDepartments(
      "/api/Export/Get-By-Dept-Completed-Export-Docment-List",
      fromDateValue,
      toDateValue
    );

    return removeDuplicateRows(rows);
  };

  const fetchPendingRealizationRowsByFactory = async (
    endpoint,
    factoryCode,
    fromDateValue,
    toDateValue
  ) => {
    const queryText = String(factoryCode || "").trim();

    if (!queryText) return [];

    try {
      /*
        IMPORTANT FIX:
        depName is a DEPARTMENT filter, not a factory filter.
        So this is WRONG for factory wise details:
          ?depName=TDL

        Instead, load the pending realization rows through the normal
        authorized-department flow, then filter the returned rows by
        factoryCode.
      */
      const rows = await fetchRowsForAuthorizedDepartments(
        endpoint,
        fromDateValue,
        toDateValue
      );

      return removeDuplicateRows(
        normalizeArray(rows).filter(
          (row) =>
            normalizeText(row?.factoryCode) === normalizeText(queryText)
        )
      );
    } catch (error) {
      console.warn(
        `Pending realization factory filtering failed for ${queryText}:`,
        error?.message
      );
      return [];
    }
  };

  const fetchRowsForFactory = async (endpoint, factoryCode, fromDateValue, toDateValue) => {
    const queryText = String(factoryCode || "").trim();

    if (!queryText) return [];

    let url = `${API_BASE_URL}${endpoint}${
      endpoint.includes("?") ? "&" : "?"
    }depName=${encodeURIComponent(queryText)}`;

    url = appendDateQueryParams(url, fromDateValue, toDateValue);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        console.warn(`fetchRowsForFactory warning: HTTP ${response.status} for ${endpoint}?factory=${queryText}`);
        return [];
      }

      const rows = normalizeArray(await response.json());

      return removeDuplicateRows(
        rows.filter(
          (item) => normalizeText(item?.factoryCode) === normalizeText(queryText)
        )
      );
    } catch (error) {
      console.warn("fetchRowsForFactory failed:", error?.message);
      return [];
    }
  };

  const getNumber = (value) => {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const sumField = (data, fieldName) => {
    return normalizeArray(data).reduce(
      (sum, item) => sum + getNumber(item?.[fieldName]),
      0
    );
  };

  const sumValueFields = (data) => {
    return normalizeArray(data).reduce(
      (sum, item) =>
        sum +
        (getNumber(item?.totalValue) ||
          getNumber(item?.totalExportValue) ||
          getNumber(item?.totalNetValue) ||
          getNumber(item?.pendingRealizationAmount) ||
          0),
      0
    );
  };

  const getRealizedValue = (data) => {
    return normalizeArray(data).reduce(
      (sum, item) => sum + getNumber(item?.totalValue),
      0
    );
  };

  const fetchJson = async (endpoint, fromDateValue, toDateValue) => {
    return fetchRowsForAuthorizedDepartments(endpoint, fromDateValue, toDateValue);
  };

  const fetchRealizationDashboardStats = async (fromDateValue, toDateValue) => {
    setDashboardLoading(true);

    try {
      const [exportData, expectedData, realizedData, upcomingData, overdueData] =
        await Promise.all([
          fetchJson("/api/Export/Get-Completed-Export-Document-Count", fromDateValue, toDateValue),
          fetchJson("/api/Export/Get-Pending-Realization-Expected-Date-Count", fromDateValue, toDateValue),
          fetchJson("/api/Export/Get-Completed-Realization-Date-Count", fromDateValue, toDateValue),
          fetchJson("/api/Export/Get-Pending-Realization-Upcomming-Date-Count", fromDateValue, toDateValue),
          fetchJson("/api/Export/Get-Pending-Realization-OverDue-Date-Count", fromDateValue, toDateValue),
        ]);

      const exportRows = normalizeArray(exportData);
      const expectedRows = normalizeArray(expectedData);
      const realizedRows = normalizeArray(realizedData);
      const upcomingRows = normalizeArray(upcomingData);
      const overdueRows = normalizeArray(overdueData);

      const exportTotal = sumValueFields(exportRows);
      const exportDocumentCount = sumField(exportRows, "completedExportCount");

      const expectedTotal = sumValueFields(expectedRows);
      const expectedDocumentCount = sumField(
        expectedRows,
        "expectedMonthlyTotalDocumentsCount"
      );

      const realizedTotal = getRealizedValue(realizedRows);
      const realizedDocumentCount = sumField(
        realizedRows,
        "completedRealizationDateCount"
      );

      const upcomingTotal = sumValueFields(upcomingRows);
      const upcomingDocumentCount = sumField(
        upcomingRows,
        "upcomingMonthlyTotalDocumentsCount"
      );

      const overdueTotal = sumValueFields(overdueRows);
      const overdueDocumentCount = sumField(
        overdueRows,
        "overDueMonthlyTotalDocumentsCount"
      );

      const realizedPercent = expectedTotal
        ? Math.min(100, Math.round((realizedTotal / expectedTotal) * 100))
        : 0;

      setDashboardStats({
        exportValueAmount: exportTotal,
        totalAmount: expectedTotal,
        realizedAmount: realizedTotal,
        expectedAmount: upcomingTotal,
        overdueAmount: overdueTotal,

        exportDocumentCount,
        expectedDocumentCount,
        realizedDocumentCount,
        upcomingDocumentCount,
        overdueDocumentCount,

        exportRows,
        expectedRows,
        realizedRows,
        upcomingRows,
        overdueRows,

        invoices: overdueDocumentCount || overdueRows.length,
        realizedPercent,
        lastUpdated: new Date().toLocaleString(),
      });
    } catch (error) {
      console.error("Error fetching realization dashboard stats:", error);
      setDashboardStats({
        exportValueAmount: 0,
        totalAmount: 0,
        realizedAmount: 0,
        expectedAmount: 0,
        overdueAmount: 0,

        exportDocumentCount: 0,
        expectedDocumentCount: 0,
        realizedDocumentCount: 0,
        upcomingDocumentCount: 0,
        overdueDocumentCount: 0,

        exportRows: [],
        expectedRows: [],
        realizedRows: [],
        upcomingRows: [],
        overdueRows: [],

        invoices: 0,
        realizedPercent: 0,
        lastUpdated: "-",
      });
    } finally {
      setDashboardLoading(false);
    }
  };

  useEffect(() => {
    fetchRealizationDashboardStats(fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const pendingAmount = dashboardStats.expectedAmount + dashboardStats.overdueAmount;

  const money = (value) =>
    `USD ${Number(value || 0).toLocaleString("en-US", {
      maximumFractionDigits: 0,
    })}`;

  const compactMoney = (value) => {
    const numberValue = Number(value || 0);

    if (numberValue >= 1000000000) return `${(numberValue / 1000000000).toFixed(1)}B`;
    if (numberValue >= 1000000) return `${(numberValue / 1000000).toFixed(1)}M`;
    if (numberValue >= 1000) return `${Math.round(numberValue / 1000)}K`;

    return `${numberValue}`;
  };

  const closeModal = () => {
    setActiveModal(null);
    setSelectedRealizationGroup(null);
    setGroupDetailSearchText("");
  };

  const getMonthOrderNumber = (monthValue) => {
    const monthText = String(monthValue || "").trim().toLowerCase();

    const monthOrder = {
      january: 1,
      jan: 1,
      february: 2,
      feb: 2,
      march: 3,
      mar: 3,
      april: 4,
      apr: 4,
      may: 5,
      june: 6,
      jun: 6,
      july: 7,
      jul: 7,
      august: 8,
      aug: 8,
      september: 9,
      sep: 9,
      october: 10,
      oct: 10,
      november: 11,
      nov: 11,
      december: 12,
      dec: 12,
    };

    return monthOrder[monthText] || 99;
  };

  const joinUniqueText = (values) => {
    const uniqueValues = [];

    values.forEach((value) => {
      const textValue = String(value || "").trim();

      if (
        textValue &&
        !uniqueValues.some(
          (item) => item.toLowerCase() === textValue.toLowerCase()
        )
      ) {
        uniqueValues.push(textValue);
      }
    });

    return uniqueValues.join(", ");
  };

  const getRealizationConfig = (type) => {
    if (type === "exportValue") {
      return {
        monthField: "exportMonth",
        docsField: "completedExportCount",
        pcsField: "totalExportNoOfPcsQnty",
        emptyTitle: "No completed export value data found",
        icon: "📦",
        accent: "#06b6d4",
        softBg: "rgba(6,182,212,0.14)",
        badge: "Export",
      };
    }

    if (type === "expected") {
      return {
        monthField: "expectedMonth",
        docsField: "expectedMonthlyTotalDocumentsCount",
        pcsField: "expectedMonthlyTotalTotalPcsCount",
        emptyTitle: "No expected realization data found",
        icon: "💼",
        accent: "#3b82f6",
        softBg: "rgba(59,130,246,0.14)",
        badge: "Expected",
      };
    }

    if (type === "realized") {
      return {
        monthField: "realizationMonth",
        docsField: "completedRealizationDateCount",
        pcsField: "completedRealizationPcsCount",
        emptyTitle: "No realized realization data found",
        icon: "📈",
        accent: "#10b981",
        softBg: "rgba(16,185,129,0.14)",
        badge: "Realized",
      };
    }

    if (type === "upcoming") {
      return {
        monthField: "upcomingMonth",
        docsField: "upcomingMonthlyTotalDocumentsCount",
        pcsField: "upcomingMonthlyTotalTotalPcsCount",
        emptyTitle: "No upcoming realization data found",
        icon: "🗓️",
        accent: "#f59e0b",
        softBg: "rgba(245,158,11,0.14)",
        badge: "Upcoming",
      };
    }

    return {
      monthField: "overDueMonth",
      docsField: "overDueMonthlyTotalDocumentsCount",
      pcsField: "overDueMonthlyTotalTotalPcsCount",
      emptyTitle: "No overdue realization data found",
      icon: "⏰",
      accent: "#ef4444",
      softBg: "rgba(239,68,68,0.14)",
      badge: "Overdue",
    };
  };

  const getFactoryRealizationEndpoint = (type) => {
    if (type === "exportValue") {
      return "/api/Export/Get-By-Factory-Completed-Export-Docment-List";
    }

    if (type === "expected") {
      return "/api/Export/Get-By-Factory-Pending-Realization-Expected-Date-Count";
    }

    if (type === "realized") {
      return "/api/Export/Get-By-Factory-Completed-Realization-Date-Count";
    }

    if (type === "upcoming") {
      return "/api/Export/Get-By-Factory-Pending-Realization-Upcomming-Date-Count";
    }

    if (type === "overdue") {
      return "/api/Export/Get-By-Factory-Pending-Realization-OverDue-Date-Count";
    }

    return "";
  };

  const getDetailEndpointByType = (type) => {
    if (type === "exportValue") {
      return "/api/Export/Get-By-Dept-Completed-Export-Docment-List";
    }

    if (type === "expected") {
      return "/api/Export/Get-Pending-Realization-Expected-Date-Count";
    }

    if (type === "realized") {
      return "/api/Export/Get-Completed-Realization-Date-Count";
    }

    if (type === "upcoming") {
      return "/api/Export/Get-Pending-Realization-Upcomming-Date-Count";
    }

    if (type === "overdue") {
      return "/api/Export/Get-Pending-Realization-OverDue-Date-Count";
    }

    return "";
  };

  const shouldUseDirectFactoryEndpoint = (type) => {
    return false;
  };

  const fetchRowsForFactorySafe = async (type, factoryCode, fromDateValue, toDateValue) => {
    const queryText = String(factoryCode || "").trim();

    if (!queryText) return [];

    if (shouldUseDirectFactoryEndpoint(type)) {
      const factoryRows = await fetchRowsForFactory(getFactoryRealizationEndpoint(type), queryText, fromDateValue, toDateValue);
      if (factoryRows.length) return factoryRows;
    }

    const getCachedDashboardRows = () => {
      if (type === "exportValue") return exportDetailRows;
      if (type === "expected") return dashboardStats.expectedRows;
      if (type === "realized") return dashboardStats.realizedRows;
      if (type === "upcoming") return dashboardStats.upcomingRows;
      if (type === "overdue") return dashboardStats.overdueRows;
      return [];
    };

    const cachedRows = normalizeArray(getCachedDashboardRows());
    if (cachedRows.length) {
      const filteredCached = removeDuplicateRows(
        cachedRows.filter(
          (item) => normalizeText(item?.factoryCode) === normalizeText(queryText)
        )
      );
      if (filteredCached.length) return filteredCached;
    }

    const endpoint = getDetailEndpointByType(type);
    if (!endpoint) return [];

    let rows = [];
    if (type === "exportValue") {
      rows = exportDetailRows.length
        ? exportDetailRows
        : await fetchExportValueDetailRows(fromDateValue, toDateValue);
    } else {
      rows = await fetchRowsForAuthorizedDepartments(endpoint, fromDateValue, toDateValue);
    }

    return removeDuplicateRows(
      normalizeArray(rows).filter(
        (item) => normalizeText(item?.factoryCode) === normalizeText(queryText)
      )
    );
  };

  const getRealizationGroupMeta = (viewMode) => {
    if (viewMode === "deptBuyer") {
      return {
        label: "Dept/Buyer",
        badge: "D/B",
        codeLabel: "Codes",
        icon: "🏢",
      };
    }

    if (viewMode === "department") {
      return {
        label: "Department",
        badge: "Dept",
        codeLabel: "Department Code",
        icon: "🏢",
      };
    }

    if (viewMode === "buyer") {
      return {
        label: "Buyer",
        badge: "Buyer",
        codeLabel: "Buyer Code",
        icon: "👤",
      };
    }

    if (viewMode === "factory") {
      return {
        label: "Factory",
        badge: "Factory",
        codeLabel: "Factory Code",
        icon: "🏭",
      };
    }

    return {
      label: "Month",
      badge: "Month",
      codeLabel: "",
      icon: "📅",
    };
  };

  const buildGroupedRealizationRows = (data, type, viewMode) => {
    const config = getRealizationConfig(type);
    const groupMap = {};

    normalizeArray(data).forEach((item) => {
      const monthName = String(
        item?.[config.monthField] ||
          item?.expectedMonth ||
          item?.realizationMonth ||
          item?.upcomingMonth ||
          item?.overDueMonth ||
          item?.expDate?.split?.("T")?.[0]?.slice?.(0, 7) ||
          item?.invoiceDate?.split?.("T")?.[0]?.slice?.(0, 7) ||
          "Unknown Month"
      ).trim();
      const departmentName = String(
        item?.departmentName ||
          item?.departmentCode ||
          item?.deptName ||
          item?.deptCode ||
          "Unknown Department"
      ).trim();
      const buyerName = String(
        item?.customerName ||
          item?.customerCode ||
          item?.buyerName ||
          item?.buyerNameCode ||
          "Unknown Buyer"
      ).trim();
      const departmentCode = String(item?.departmentCode || "").trim();
      const customerCode = String(item?.customerCode || "").trim();
      const factoryCode = String(item?.factoryCode || "").trim();
      const factoryName = String(item?.factoryName || item?.factoryCode || "").trim();

      const groupName =
        viewMode === "month"
          ? monthName || "Unknown Month"
          : viewMode === "deptBuyer"
          ? `${departmentName || "Unknown Department"} • ${
              buyerName || "Unknown Buyer"
            }`
          : viewMode === "department"
          ? departmentName
          : viewMode === "buyer"
          ? buyerName
          : factoryCode || factoryName || "Unknown Factory";

      const groupCode =
        viewMode === "month"
          ? ""
          : viewMode === "deptBuyer"
          ? `${departmentCode}|${customerCode}`
          : viewMode === "department"
          ? departmentCode
          : viewMode === "buyer"
          ? customerCode
          : factoryCode;

      const key = `${viewMode}-${groupCode || groupName}`.toLowerCase();

      if (!groupMap[key]) {
        groupMap[key] = {
          label: groupName || "Unknown",
          code:
            viewMode === "deptBuyer"
              ? joinUniqueText([
                  departmentCode ? `Dept: ${departmentCode}` : "",
                  customerCode ? `Buyer: ${customerCode}` : "",
                ])
              : groupCode,
          departmentName,
          departmentCode,
          buyerName,
          customerCode,
          factoryCode,
          factoryName,
          months: [],
          sourceRows: [],
          documentRows: [],
          documentNos: new Set(),
          documents: 0,
          pcs: 0,
          value: 0,
          viewMode,
        };
      }

      const hasDocumentNo = Boolean(
        String(item?.expDocumentNo || item?.exportDocumentNo || "").trim()
      );

      if (type === "upcoming" || type === "overdue") {
        const documentNo = String(
          item?.expDocumentNo || item?.exportDocumentNo || ""
        ).trim();

        if (documentNo) {
          groupMap[key].documentNos.add(normalizeText(documentNo));
        }

        groupMap[key].documents = groupMap[key].documentNos.size;
      } else {
        groupMap[key].documents +=
          getNumber(item?.[config.docsField]) ||
          (type === "exportValue" ? 1 : 0);
      }

      groupMap[key].pcs +=
        getNumber(item?.totalPcs) ||
        getNumber(item?.[config.pcsField]);

      groupMap[key].value += sumValueFields([item]);
      groupMap[key].sourceRows.push(item);

      if (type === "upcoming" || type === "overdue") {
        groupMap[key].documentRows.push(item);
      }

      if (monthName) groupMap[key].months.push(monthName);
    });

    return Object.values(groupMap)
      .map((item) => {
        const { documentNos, ...rest } = item;

        return {
          ...rest,
          monthsText: joinUniqueText(item.months),
        };
      })
      .sort((a, b) => {
        if (viewMode === "month") {
          const leftOrder = getMonthOrderNumber(a.label);
          const rightOrder = getMonthOrderNumber(b.label);

          if (leftOrder !== rightOrder) return leftOrder - rightOrder;

          return a.label.localeCompare(b.label);
        }

        return b.value - a.value;
      });
  };

  const buildRealizationGroupMonthDetails = (groupItem, type) => {
    const config = getRealizationConfig(type);
    const monthMap = {};

    normalizeArray(groupItem?.sourceRows).forEach((item) => {
      const monthName = String(
        item?.[config.monthField] ||
          item?.expectedMonth ||
          item?.realizationMonth ||
          item?.upcomingMonth ||
          item?.overDueMonth ||
          "Unknown Month"
      ).trim();

      const monthKey = normalizeText(monthName) || "unknown-month";

      if (!monthMap[monthKey]) {
        monthMap[monthKey] = {
          month: monthName || "Unknown Month",
          documentNos: new Set(),
          documentRows: [],
          documents: 0,
          pcs: 0,
          value: 0,
        };
      }

      const documentNo = String(
        item?.expDocumentNo || item?.exportDocumentNo || ""
      ).trim();

      if (type === "upcoming" || type === "overdue") {
        if (documentNo) {
          monthMap[monthKey].documentNos.add(normalizeText(documentNo));
        }

        monthMap[monthKey].documents =
          monthMap[monthKey].documentNos.size;
        monthMap[monthKey].pcs += getNumber(item?.totalPcs);
        monthMap[monthKey].documentRows.push(item);
      } else {
        monthMap[monthKey].documents +=
          getNumber(item?.[config.docsField]) ||
          (type === "exportValue" ? 1 : 0);
        monthMap[monthKey].pcs += getNumber(item?.[config.pcsField]);
      }

      monthMap[monthKey].value += sumValueFields([item]);
    });

    return Object.values(monthMap)
      .map(({ documentNos, ...item }) => item)
      .sort((a, b) => {
        const leftOrder = getMonthOrderNumber(a.month);
        const rightOrder = getMonthOrderNumber(b.month);
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return a.month.localeCompare(b.month);
      });
  };

  const getUpcomingDocumentMonth = (row) => {
    const dateValue =
      row?.shipmentDate ||
      row?.expectedDate ||
      row?.realizationDate ||
      row?.invoiceDate ||
      row?.expDate ||
      row?.exFacDate ||
      null;

    if (!dateValue) return "Unknown Month";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "Unknown Month";

    return date.toLocaleString("en-US", { month: "long" });
  };

  const filterUpcomingDocumentsForGroup = (rows, item, viewMode) => {
    const sourceRows = normalizeArray(rows);

    if (viewMode === "deptBuyer") {
      return sourceRows.filter(
        (row) =>
          normalizeText(row?.departmentCode) === normalizeText(item?.departmentCode) &&
          normalizeText(row?.customerCode) === normalizeText(item?.customerCode)
      );
    }

    if (viewMode === "factory") {
      return sourceRows.filter(
        (row) =>
          normalizeText(row?.factoryCode) ===
          normalizeText(item?.factoryCode || item?.code || item?.label)
      );
    }

    if (viewMode === "month") {
      return sourceRows.filter(
        (row) =>
          normalizeText(getUpcomingDocumentMonth(row)) ===
          normalizeText(item?.label || item?.month)
      );
    }

    return sourceRows;
  };

  const openRealizationGroupDetails = async ({
    item,
    type,
    viewMode,
    config,
    groupMeta,
  }) => {
    setGroupDetailSearchText("");

    const isPendingListType =
      type === "upcoming" || type === "overdue";

    /*
      Keep the same drill-down hierarchy:
      Dept/Buyer -> Month details
      Factory    -> Dept/Buyer details

      But for Upcoming/Overdue the source is now the List API.
    */
    const detailViewMode =
      viewMode === "factory" || viewMode === "month"
        ? "deptBuyer"
        : "month";

    setSelectedRealizationGroup({
      ...item,
      type,
      viewMode,
      groupLabel: groupMeta.label,
      codeLabel: groupMeta.codeLabel,
      accent: config.accent,
      softBg: config.softBg,
      detailRows: [],
      detailViewMode,
      loading: true,
    });

    try {
      let detailSourceRows = [];

      if (
        (type === "upcoming" || type === "overdue") &&
        viewMode === "deptBuyer"
      ) {
        const endpoint =
          type === "upcoming"
            ? "/api/Export/Get-Pending-Realization-Upcomming-Date-Count"
            : "/api/Export/Get-Pending-Realization-OverDue-Date-Count";

        detailSourceRows = await fetchPendingRealizationRowsByDepartment(
          endpoint,
          item?.departmentCode,
          item?.departmentName,
          fromDate,
          toDate
        );
      } else if (
        (type === "upcoming" || type === "overdue") &&
        viewMode === "month"
      ) {
        const endpoint =
          type === "upcoming"
            ? "/api/Export/Get-Pending-Realization-Upcomming-Date-Count"
            : "/api/Export/Get-Pending-Realization-OverDue-Date-Count";

        detailSourceRows = await fetchRowsForAuthorizedDepartments(
          endpoint,
          fromDate,
          toDate
        );
      } else if (
        (type === "upcoming" || type === "overdue") &&
        viewMode === "factory"
      ) {
        const endpoint =
          type === "upcoming"
            ? "/api/Export/Get-Pending-Realization-Upcomming-Date-Count"
            : "/api/Export/Get-Pending-Realization-OverDue-Date-Count";

        detailSourceRows = await fetchPendingRealizationRowsByFactory(
          endpoint,
          item?.factoryCode || item?.code || item?.label,
          fromDate,
          toDate
        );
      } else if (type === "upcoming") {
        detailSourceRows = await fetchUpcomingDocumentRows(fromDate, toDate);
      } else if (type === "overdue") {
        detailSourceRows = await fetchOverdueDocumentRows(fromDate, toDate);
      } else if (viewMode === "factory") {
        const factoryCode = item?.factoryCode || item?.code || item?.label || "";
        const sourceRowsFromItem = normalizeArray(item?.sourceRows);

        if (sourceRowsFromItem.length) {
          detailSourceRows = removeDuplicateRows(
            sourceRowsFromItem.filter(
              (row) =>
                normalizeText(row?.factoryCode) === normalizeText(factoryCode)
            )
          );
        }

        if (!detailSourceRows.length) {
          detailSourceRows = await fetchRowsForFactorySafe(
            type,
            factoryCode,
            fromDate,
            toDate
          );
        }
      } else if (type === "exportValue") {
        detailSourceRows = exportDetailRows.length
          ? exportDetailRows
          : await fetchExportValueDetailRows(fromDate, toDate);
      } else {
        detailSourceRows = normalizeArray(item?.sourceRows);
      }

      let filteredRows = detailSourceRows;

      if (viewMode === "deptBuyer") {
        if (isPendingListType) {
          const depCode = normalizeText(item?.departmentCode);
          const depName = normalizeText(item?.departmentName);
          const buyerCode = normalizeText(item?.customerCode);

          const depRows = detailSourceRows.filter((row) => {
            const rowDepCode = normalizeText(row?.departmentCode);
            const rowDepName = normalizeText(row?.departmentName);

            return (
              (depCode && rowDepCode === depCode) ||
              (depName && rowDepName === depName)
            );
          });

          const buyerRows = buyerCode
            ? depRows.filter(
                (row) => normalizeText(row?.customerCode) === buyerCode
              )
            : [];

          filteredRows = buyerRows.length
            ? buyerRows
            : depRows.length
            ? depRows
            : detailSourceRows;
        } else {
          filteredRows = detailSourceRows.filter(
            (row) =>
              normalizeText(row?.departmentCode) === normalizeText(item?.departmentCode) &&
              normalizeText(row?.customerCode) === normalizeText(item?.customerCode)
          );
        }
      } else if (viewMode === "factory") {
        const selectedFactory = normalizeText(
          item?.factoryCode || item?.code || item?.label
        );

        const factoryMatchedRows = detailSourceRows.filter(
          (row) =>
            normalizeText(row?.factoryCode) === selectedFactory
        );

        filteredRows = factoryMatchedRows;
      } else if (viewMode === "month") {
        const selectedMonth = normalizeText(item?.label || item?.month);

        filteredRows = detailSourceRows.filter((row) => {
          const rowMonth =
            type === "overdue"
              ? row?.overDueMonth
              : row?.upcomingMonth;

          return normalizeText(rowMonth) === selectedMonth;
        });
      } else if (viewMode === "department") {
        filteredRows = detailSourceRows.filter(
          (row) =>
            normalizeText(row?.departmentCode) === normalizeText(item?.departmentCode)
        );
      } else if (viewMode === "buyer") {
        filteredRows = detailSourceRows.filter(
          (row) =>
            normalizeText(row?.customerCode) === normalizeText(item?.customerCode)
        );
      }

      const detailRows =
        viewMode === "factory" || viewMode === "month"
          ? buildGroupedRealizationRows(filteredRows, type, "deptBuyer")
          : buildRealizationGroupMonthDetails(
              {
                ...item,
                sourceRows: filteredRows,
              },
              type
            );

      setSelectedRealizationGroup((prev) => ({
        ...(prev || item),
        ...item,
        type,
        viewMode,
        groupLabel: groupMeta.label,
        codeLabel: groupMeta.codeLabel,
        accent: config.accent,
        softBg: config.softBg,
        detailRows,
        detailViewMode,
        loading: false,
      }));
    } catch (error) {
      console.error("Realization detail error:", error);

      setSelectedRealizationGroup((prev) => ({
        ...(prev || item),
        ...item,
        type,
        viewMode,
        groupLabel: groupMeta.label,
        codeLabel: groupMeta.codeLabel,
        accent: config.accent,
        softBg: config.softBg,
        detailRows: [],
        detailViewMode,
        loading: false,
        error: error?.message || "Failed to load details",
      }));
    }
  };

  const openDocumentPopup = ({
    title,
    subtitle,
    rows,
    type,
  }) => {
    const uniqueRows = removeDuplicateRows(rows);

    setDocumentPopupSearchText("");
    setSelectedDocumentPopup({
      title,
      subtitle,
      rows: uniqueRows,
      type,
    });
  };

  const getDocumentPopupMonth = (row, type) => {
    return String(
      type === "overdue"
        ? row?.overDueMonth || "Unknown Month"
        : row?.upcomingMonth || "Unknown Month"
    ).trim();
  };

  const getSearchableValue = (value) => String(value || "").trim().toLowerCase();

  const rowMatchesSearch = (row, searchText) => {
    const normalizedSearch = getSearchableValue(searchText);

    if (!normalizedSearch) return true;

    return [
      row?.label,
      row?.code,
      row?.departmentName,
      row?.departmentCode,
      row?.buyerName,
      row?.customerCode,
      row?.factoryCode,
      row?.factoryName,
      row?.monthsText,
      row?.month,
      row?.value,
      row?.expDocumentNo,
      row?.packagingListNo,
      row?.shipmentDate,
      row?.noOfPcs,
      row?.totalPcs,
      row?.expDocumentNo,
      row?.upcomingMonth,
      row?.overDueMonth,
      row?.totalValue,
    ].some((value) => getSearchableValue(value).includes(normalizedSearch));
  };

  const getRealizationSearchText = (type) => realizationSearchText[type] || "";

  const updateRealizationSearchText = (type, value) => {
    setRealizationSearchText((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const renderRealizationMonthRows = (data, type) => {
    const rows = normalizeArray(data);
    const config = getRealizationConfig(type);

    if (!rows.length) {
      return <EmptyModalCard text={config.emptyTitle} />;
    }

    return (
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f172a]">
        <table className="min-w-full">
          <thead className="bg-[#16213d]">
            <tr>
              <Th>Month</Th>
              <Th>Documents</Th>
              <Th>Total Pcs</Th>
              <Th>Value</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr
                key={`${item?.[config.monthField] || "month"}-${index}`}
                className={`border-b border-white/5 ${
                  index % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111c31]"
                }`}
              >
                <Td strong>{item?.[config.monthField] || "-"}</Td>
                <Td>{getNumber(item?.[config.docsField]).toLocaleString()}</Td>
                <Td>{getNumber(item?.[config.pcsField]).toLocaleString()}</Td>
                <Td value>{compactMoney(sumValueFields([item]))}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRealizedMonthRows = (data) => {
    const rows = normalizeArray(data);

    if (!rows.length) return <EmptyModalCard text="No realized data found" />;

    return (
      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0f172a]">
        <table className="min-w-full">
          <thead className="bg-[#123224]">
            <tr>
              <Th>Month</Th>
              <Th>Documents</Th>
              <Th>Value</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item, index) => (
              <tr
                key={`${item?.realizationMonth || "month"}-${index}`}
                className={`border-b border-white/5 ${
                  index % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111c31]"
                }`}
              >
                <Td strong>{item?.realizationMonth || "-"}</Td>
                <Td>{getNumber(item?.completedRealizationDateCount).toLocaleString()}</Td>
                <Td value>{money(item?.totalValue)}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderRealizationViewFilter = (type) => {
    const activeMode =
      type === "exportValue"
        ? exportViewMode
        : type === "expected"
        ? expectedViewMode
        : type === "realized"
        ? realizedViewMode
        : type === "upcoming"
        ? upcomingViewMode
        : overdueViewMode;

    const setActiveMode =
      type === "exportValue"
        ? setExportViewMode
        : type === "expected"
        ? setExpectedViewMode
        : type === "realized"
        ? setRealizedViewMode
        : type === "upcoming"
        ? setUpcomingViewMode
        : setOverdueViewMode;

    return (
      <div className="mb-3 grid grid-cols-3 gap-1.5 rounded-xl border border-white/10 bg-[#111827] p-1">
        {[
          { key: "deptBuyer", label: "Dept / Buyer" },
          { key: "month", label: "Month" },
          { key: "factory", label: "Factory Wise" },
        ].map((option) => {
          const isActive = activeMode === option.key;

          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setActiveMode(option.key)}
              className={`rounded-lg px-3 py-1.5 text-[10px] font-black transition ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:bg-white/5"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  };

  const renderRealizationSearchBox = (type) => {
    const searchValue = getRealizationSearchText(type);

    return (
      <div className="mb-3 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
          <input
            value={searchValue}
            onChange={(event) => updateRealizationSearchText(type, event.target.value)}
            placeholder="Search month, department, buyer, factory, code..."
            className="w-full rounded-lg bg-[#0f172a] border border-white/10 pl-7 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {searchValue ? (
          <button
            type="button"
            onClick={() => updateRealizationSearchText(type, "")}
            className="rounded-lg bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 text-[10px] font-black text-pink-300"
          >
            ✕ Clear
          </button>
        ) : null}
      </div>
    );
  };

  const renderSmartRealizationCards = (data, type) => {
    const activeMode =
      type === "exportValue"
        ? exportViewMode
        : type === "expected"
        ? expectedViewMode
        : type === "realized"
        ? realizedViewMode
        : type === "upcoming"
        ? upcomingViewMode
        : overdueViewMode;
    const rows = buildGroupedRealizationRows(data, type, activeMode);
    const config = getRealizationConfig(type);
    const groupMeta = getRealizationGroupMeta(activeMode);
    const searchText = getRealizationSearchText(type);
    const filteredRows = rows.filter((row) => rowMatchesSearch(row, searchText));

    if (!rows.length) return <EmptyModalCard text={config.emptyTitle} />;
    if (!filteredRows.length) return <EmptyModalCard text="No matching data found" />;

    const maxValue = Math.max(...filteredRows.map((item) => item.value), 1);

    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-2.5">
        {filteredRows.map((item, index) => {
          const percentage = Math.min(100, Math.round((item.value / maxValue) * 100));
          const icon = activeMode === "month" ? config.icon : groupMeta.icon;
          const canOpenDetails =
            activeMode !== "month" ||
            type === "upcoming" ||
            type === "overdue";

          return (
            <button
              key={`${activeMode}-${item.code || item.label}-${index}`}
              type="button"
              disabled={!canOpenDetails}
              onClick={() =>
                openRealizationGroupDetails({
                  item,
                  type,
                  viewMode: activeMode,
                  config,
                  groupMeta,
                })
              }
              className={`relative overflow-hidden rounded-xl border bg-[#111827] p-3 text-left shadow-lg ${
                canOpenDetails ? "hover:bg-[#162033]" : "cursor-default"
              }`}
              style={{
                borderLeftWidth: 3,
                borderLeftColor: config.accent,
                borderColor: "rgba(148,163,184,0.12)",
              }}
            >
              <div
                className="absolute -top-6 -right-6 h-16 w-16 rounded-full"
                style={{ backgroundColor: config.softBg }}
              />

              <div className="relative flex items-start gap-2 mb-2">
                <div
                  className="h-7 w-7 rounded-lg flex items-center justify-center text-sm"
                  style={{ backgroundColor: config.softBg }}
                >
                  {icon}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[8px] uppercase font-black text-slate-400">
                    {config.badge} {groupMeta.label}
                  </p>

                  {activeMode === "deptBuyer" ? (
                    <>
                      <p className="text-[8px] mt-1 uppercase font-black text-slate-500">Dept</p>
                      <h4 className="text-xs font-bold text-white truncate">
                        {item.departmentName || "-"}
                      </h4>
                      <p className="text-[8px] mt-1 uppercase font-black text-slate-500">Buyer</p>
                      <h4 className="text-xs font-bold text-white truncate">
                        {item.buyerName || "-"}
                      </h4>
                    </>
                  ) : activeMode === "factory" ? (
                    <>
                      <p className="text-[8px] mt-1 uppercase font-black text-slate-500">Factory</p>
                      <h4 className="text-xs font-bold text-white truncate">
                        {item.factoryCode || item.label || "-"}
                      </h4>
                      {item.factoryName && item.factoryName !== item.factoryCode ? (
                        <p className="mt-0.5 text-[9px] font-bold text-slate-400 truncate">
                          {item.factoryName}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <h4 className="mt-0.5 text-xs font-bold text-white truncate">
                      {item.label || "-"}
                    </h4>
                  )}

                  {activeMode !== "month" && item.code ? (
                    <p className="mt-1 text-[9px] font-bold text-slate-400 truncate">
                      {groupMeta.codeLabel}: {item.code}
                    </p>
                  ) : null}

                  {activeMode !== "month" && item.monthsText ? (
                    <p className="mt-0.5 text-[8px] font-bold text-slate-400 truncate">
                      Months: {item.monthsText}
                    </p>
                  ) : null}
                </div>

                <span
                  className="rounded-full border px-1.5 py-0.5 text-[8px] font-black flex-shrink-0"
                  style={{
                    backgroundColor: config.softBg,
                    borderColor: `${config.accent}55`,
                    color: config.accent,
                  }}
                >
                  {groupMeta.badge}
                </span>
              </div>

              <p className="relative mb-2 text-sm font-bold" style={{ color: config.accent }}>
                {money(item.value)}
              </p>

              {(type === "upcoming" || type === "overdue") && (
                <div className="relative mb-2 grid grid-cols-2 gap-1.5">
                  <div className="rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5">
                    <p className="text-[8px] font-black uppercase text-slate-500">
                      Documents
                    </p>
                    <p className="mt-0.5 text-[10px] font-black text-blue-300">
                      {getNumber(item.documents).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg border border-white/10 bg-[#0f172a] px-2 py-1.5">
                    <p className="text-[8px] font-black uppercase text-slate-500">
                      PCS
                    </p>
                    <p className="mt-0.5 text-[10px] font-black text-emerald-300">
                      {getNumber(item.pcs).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              <div className="relative flex items-center gap-2">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-[#243041]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(8, percentage)}%`,
                      backgroundColor: config.accent,
                    }}
                  />
                </div>
                <span className="text-[8px] font-bold text-slate-300">
                  {percentage}%
                </span>
              </div>

              {canOpenDetails ? (
                <p className="relative mt-1.5 text-right text-[9px] font-bold text-blue-400">
                  {activeMode === "month"
                    ? "View month details →"
                    : "View details →"}
                </p>
              ) : null}
            </button>
          );
        })}
      </div>
    );
  };

  const renderModalContent = () => {
    if (activeModal === "exportValue") {
      return (
        <>
          <ModalSummaryCard
            title="Export Value"
            value={money(dashboardStats.exportValueAmount)}
            subtitle={`${dashboardStats.exportDocumentCount.toLocaleString()} completed export documents`}
            icon="📦"
            color="#06b6d4"
          />
          {renderRealizationViewFilter("exportValue")}
          {renderRealizationSearchBox("exportValue")}

          {exportDetailLoading ? (
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-6 text-center text-sm font-bold text-cyan-200">
              Loading export value details...
            </div>
          ) : (
            renderSmartRealizationCards(exportDetailRows, "exportValue")
          )}
        </>
      );
    }

    if (activeModal === "expectedTotal") {
      return (
        <>
          <ModalSummaryCard
            title="Expected Value"
            value={money(dashboardStats.totalAmount)}
            subtitle={`${dashboardStats.expectedDocumentCount.toLocaleString()} documents`}
            icon="💼"
            color="#3b82f6"
          />
          {renderRealizationViewFilter("expected")}
          {renderRealizationSearchBox("expected")}
          {renderSmartRealizationCards(dashboardStats.expectedRows, "expected")}
        </>
      );
    }

    if (activeModal === "realized") {
      return (
        <>
          <ModalSummaryCard
            title="Realized Value"
            value={money(dashboardStats.realizedAmount)}
            subtitle={`${dashboardStats.realizedDocumentCount.toLocaleString()} documents realized`}
            icon="📈"
            color="#10b981"
          />
          {renderRealizationViewFilter("realized")}
          {renderRealizationSearchBox("realized")}
          {renderSmartRealizationCards(dashboardStats.realizedRows, "realized")}
        </>
      );
    }

    if (activeModal === "upcoming") {
      return (
        <>
          <ModalSummaryCard
            title="Upcoming Value"
            value={money(dashboardStats.expectedAmount)}
            // subtitle={`${dashboardStats.upcomingDocumentCount.toLocaleString()} upcoming documents`}
            icon="🗓️"
            color="#f59e0b"
          />
          {renderRealizationViewFilter("upcoming")}
          {renderRealizationSearchBox("upcoming")}
          {renderSmartRealizationCards(dashboardStats.upcomingRows, "upcoming")}
        </>
      );
    }

    if (activeModal === "overdue") {
      return (
        <>
          <ModalSummaryCard
            title="Overdue Value"
            value={money(dashboardStats.overdueAmount)}
            // subtitle={`${dashboardStats.overdueDocumentCount.toLocaleString()} overdue documents`}
            icon="⏰"
            color="#ef4444"
          />
          {renderRealizationViewFilter("overdue")}
          {renderRealizationSearchBox("overdue")}
          {renderSmartRealizationCards(dashboardStats.overdueRows, "overdue")}
        </>
      );
    }

    return null;
  };

  const groupDetailRows = normalizeArray(selectedRealizationGroup?.detailRows);
  const filteredGroupDetailRows = groupDetailRows.filter((row) =>
    rowMatchesSearch(row, groupDetailSearchText)
  );
  const groupDetailTotalValue = groupDetailRows.reduce(
    (sum, item) => sum + getNumber(item?.value),
    0
  );

  const groupDetailTotalDocuments = groupDetailRows.reduce(
    (sum, item) => sum + getNumber(item?.documents),
    0
  );

  const groupDetailTotalPcs = groupDetailRows.reduce(
    (sum, item) => sum + getNumber(item?.pcs),
    0
  );

  const isPendingMonthDetailModal =
    (selectedRealizationGroup?.type === "upcoming" ||
      selectedRealizationGroup?.type === "overdue") &&
    selectedRealizationGroup?.detailViewMode === "month";

  const isFactoryDetailModal =
    selectedRealizationGroup?.viewMode === "factory";

  const isMonthDeptBuyerDetailModal =
    (selectedRealizationGroup?.type === "upcoming" ||
      selectedRealizationGroup?.type === "overdue") &&
    selectedRealizationGroup?.viewMode === "month" &&
    selectedRealizationGroup?.detailViewMode === "deptBuyer";

  const isDeptBuyerListDetailModal =
    isFactoryDetailModal || isMonthDeptBuyerDetailModal;

  const chartItems = [
    {
      key: "exportValue",
      label: "Export Value",
      value: dashboardStats.exportValueAmount,
      docs: dashboardStats.exportDocumentCount,
      icon: "📦",
      color: "#06b6d4",
      bg: "bg-cyan-500/10",
      border: "border-cyan-400/40",
      text: "text-cyan-300",
    },
    {
      key: "expectedTotal",
      label: "Expected",
      value: dashboardStats.totalAmount,
      docs: dashboardStats.expectedDocumentCount,
      icon: "💼",
      color: "#3b82f6",
      bg: "bg-blue-500/10",
      border: "border-blue-400/40",
      text: "text-blue-300",
    },
    {
      key: "realized",
      label: "Realized",
      value: dashboardStats.realizedAmount,
      docs: dashboardStats.realizedDocumentCount,
      icon: "📈",
      color: "#10b981",
      bg: "bg-emerald-500/10",
      border: "border-emerald-400/40",
      text: "text-emerald-300",
    },
    {
      key: "upcoming",
      label: "Upcoming",
      value: dashboardStats.expectedAmount,
      docs: dashboardStats.upcomingDocumentCount,
      icon: "🗓️",
      color: "#f97316",
      bg: "bg-orange-500/10",
      border: "border-orange-400/40",
      text: "text-orange-300",
    },
    {
      key: "overdue",
      label: "Overdue",
      value: dashboardStats.overdueAmount,
      docs: dashboardStats.overdueDocumentCount,
      icon: "⏰",
      color: "#ef4444",
      bg: "bg-red-500/10",
      border: "border-red-400/40",
      text: "text-red-300",
    },
  ];

  const maxChartValue = Math.max(
    ...chartItems.map((item) => Number(item.value || 0)),
    1
  );

  const pieTotalValue = Math.max(
    chartItems.reduce((sum, item) => sum + Number(item.value || 0), 0),
    1
  );

  const pendingUpcomingPercent = pendingAmount
    ? Math.round((dashboardStats.expectedAmount / pendingAmount) * 100)
    : 0;

  const pendingOverduePercent = pendingAmount
    ? Math.round((dashboardStats.overdueAmount / pendingAmount) * 100)
    : 0;

  const openCardModal = async (key) => {
    setActiveModal(key);

    if (key === "exportValue") {
      setExportDetailLoading(true);

      try {
        const rows = await fetchExportValueDetailRows(fromDate, toDate);
        setExportDetailRows(rows);
      } catch (error) {
        console.error("Export value detail loading error:", error);
        setExportDetailRows([]);
      } finally {
        setExportDetailLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#070b14] text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* Date Filter Section */}
        <div className="rounded-xl bg-gradient-to-r from-[#101620] via-[#131b2e] to-[#101620] border border-white/10 p-3 md:p-4 shadow-lg">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="h-8 w-8 rounded-lg bg-blue-500/15 border border-blue-400/30 flex items-center justify-center text-sm">
                  📅
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">
                    Date Range Filter
                  </h2>
                  <p className="text-[9px] text-slate-400">
                    Filter all realization data by from date and to date
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="rounded-lg bg-[#0f172a] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent min-w-[150px]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFromDate("2026-01-01");
                    setToDate("2026-12-31");
                  }}
                  className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-[11px] font-black text-blue-300 hover:bg-blue-500/20 transition"
                >
                  2026
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const now = new Date();
                    const year = now.getFullYear();
                    setFromDate(`${year}-01-01`);
                    setToDate(`${year}-12-31`);
                  }}
                  className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-[11px] font-black text-emerald-300 hover:bg-emerald-500/20 transition"
                >
                  Current Year
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg bg-[#0f172a] border border-white/10 px-2.5 py-1 text-[10px] font-bold text-slate-400">
                Selected:
              </span>
              <span className="rounded-lg bg-blue-500/10 border border-blue-400/30 px-2.5 py-1 text-[10px] font-black text-blue-300">
                {fromDate}
              </span>
              <span className="text-slate-500 text-[10px] font-bold">→</span>
              <span className="rounded-lg bg-blue-500/10 border border-blue-400/30 px-2.5 py-1 text-[10px] font-black text-blue-300">
                {toDate}
              </span>
            </div>
            <div className="rounded-lg bg-white/5 px-2.5 py-1 text-[9px] font-bold text-slate-400">
              {dashboardLoading ? "⏳ Loading data..." : `✓ Last updated: ${dashboardStats.lastUpdated}`}
            </div>
          </div>
        </div>

        {/* Main one-row web KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
          {chartItems.map((item) => {
            const percentage = Math.min(
              100,
              Math.round((Number(item.value || 0) / maxChartValue) * 100)
            );

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => openCardModal(item.key)}
                className={`min-h-[130px] rounded-xl border ${item.border} ${item.bg} p-3 text-left shadow-lg hover:bg-white/10 transition`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                    {item.icon}
                  </div>

                  <span className={`rounded-full border ${item.border} bg-white/5 px-1.5 py-0.5 text-[8px] font-black ${item.text}`}>
                    {percentage}%
                  </span>
                </div>

                <p className="mt-2 text-[9px] font-black uppercase text-slate-400">
                  {item.label}
                </p>

                <h2 className={`mt-1 text-base font-bold ${item.text} break-words`}>
                  {money(item.value)}
                </h2>

                <p className="mt-0.5 text-[9px] text-slate-400">
                  {Number(item.docs || 0).toLocaleString()} documents
                </p>

                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#1e293b]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(5, percentage)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Compact web chart section: bar chart + pie chart side by side */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-2.5">
          <div className="xl:col-span-7 rounded-xl bg-[#101620] border border-white/10 p-3 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Realization Value Comparison
                </h2>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Compact bar chart based on highest value
                </p>
              </div>

              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                <span className="text-[10px] font-bold text-emerald-300">
                  Realized: {dashboardStats.realizedPercent}% 
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {chartItems.map((item) => {
                const percentage = Math.min(
                  100,
                  Math.round((Number(item.value || 0) / maxChartValue) * 100)
                );

                return (
                  <button
                    key={`${item.key}-bar`}
                    type="button"
                    onClick={() => openCardModal(item.key)}
                    className="w-full rounded-lg bg-[#0f172a] border border-white/10 px-2.5 py-2 hover:bg-[#111c31] transition"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-[100px_1fr_100px] gap-1.5 lg:items-center text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="h-6 w-6 rounded-lg bg-white/10 flex items-center justify-center text-xs">
                          {item.icon}
                        </span>
                        <div>
                          <p className="text-[10px] font-bold text-white">
                            {item.label}
                          </p>
                          <p className="text-[8px] text-slate-500">
                            {Number(item.docs || 0).toLocaleString()} docs
                          </p>
                        </div>
                      </div>

                      <div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${Math.max(4, percentage)}%`,
                              backgroundColor: item.color,
                            }}
                          />
                        </div>
                      </div>

                      <div className="lg:text-right">
                        <p className={`text-[10px] font-bold ${item.text}`}>
                          {money(item.value)}
                        </p>
                        <p className="text-[8px] text-slate-500">
                          {percentage}%
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="xl:col-span-5 rounded-xl bg-[#101620] border border-white/10 p-3 shadow-lg">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-bold text-white">
                  Value Share
                </h2>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  Pie chart style share by value
                </p>
              </div>

              <div className="rounded-lg bg-white/5 px-2 py-1 text-right">
                <p className="text-[10px] font-bold text-white">
                  {money(pieTotalValue)}
                </p>
                <p className="text-[8px] text-slate-500">Total</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-3 items-center">
              <div className="mx-auto h-36 w-36 rounded-full p-2.5"
                style={{
                  background: `conic-gradient(
                    #3b82f6 0deg ${(dashboardStats.totalAmount / pieTotalValue) * 360}deg,
                    #10b981 ${(dashboardStats.totalAmount / pieTotalValue) * 360}deg ${((dashboardStats.totalAmount + dashboardStats.realizedAmount) / pieTotalValue) * 360}deg,
                    #f97316 ${((dashboardStats.totalAmount + dashboardStats.realizedAmount) / pieTotalValue) * 360}deg ${((dashboardStats.totalAmount + dashboardStats.realizedAmount + dashboardStats.expectedAmount) / pieTotalValue) * 360}deg,
                    #ef4444 ${((dashboardStats.totalAmount + dashboardStats.realizedAmount + dashboardStats.expectedAmount) / pieTotalValue) * 360}deg 360deg
                  )`,
                }}
              >
                <div className="h-full w-full rounded-full bg-[#101620] flex flex-col items-center justify-center text-center">
                  <p className="text-[8px] font-bold uppercase text-slate-500">
                    Pending
                  </p>
                  <p className="text-sm font-bold text-amber-300">
                    {compactMoney(pendingAmount)}
                  </p>
                  <p className="text-[8px] text-slate-500">
                    Up {pendingUpcomingPercent}% / Ov {pendingOverduePercent}%
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                {chartItems.map((item) => {
                  const share = Math.round((Number(item.value || 0) / pieTotalValue) * 100);

                  return (
                    <button
                      key={`${item.key}-legend`}
                      type="button"
                      onClick={() => openCardModal(item.key)}
                      className="w-full flex items-center justify-between gap-2 rounded-lg bg-[#0f172a] border border-white/10 px-2.5 py-1.5 hover:bg-[#111c31] transition"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-[10px] font-bold text-white">
                          {item.label}
                        </span>
                      </div>

                      <div className="text-right">
                        <p className={`text-[10px] font-bold ${item.text}`}>
                          {share}%
                        </p>
                        <p className="text-[8px] text-slate-500">
                          {compactMoney(item.value)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Pending breakdown under same design */}
        <div className="rounded-xl bg-[#101620] border border-white/10 p-3 shadow-lg">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 pb-3">
            <div>
              <p className="text-[9px] font-bold uppercase text-slate-300">
                Pending = Upcoming + Overdue
              </p>
              <h2 className="mt-0.5 text-xl font-bold text-white">
                {money(pendingAmount)}
              </h2>
              <p className="mt-0.5 text-[9px] text-slate-400">
                Pending amount is divided into upcoming and overdue
              </p>
            </div>

            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-base">
              ⏳
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setActiveModal("upcoming")}
              className="rounded-xl bg-[#2d210f] border border-amber-400/40 p-3 text-left hover:bg-[#3b2b13] transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Upcoming
                  </p>
                  <h3 className="mt-1 text-base font-bold text-amber-300">
                    {money(dashboardStats.expectedAmount)}
                  </h3>
                  {/* <p className="mt-1 text-[9px] text-slate-400">
                    {dashboardStats.upcomingDocumentCount.toLocaleString()} documents
                  </p> */}
                </div>
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                  🗓️
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setActiveModal("overdue")}
              className="rounded-xl bg-[#2d1519] border border-red-400/40 p-3 text-left hover:bg-[#3b1a20] transition"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[9px] font-bold uppercase text-slate-400">
                    Overdue
                  </p>
                  <h3 className="mt-1 text-base font-bold text-red-300">
                    {money(dashboardStats.overdueAmount)}
                  </h3>
                  {/* <p className="mt-1 text-[9px] text-slate-400">
                    {dashboardStats.overdueDocumentCount.toLocaleString()} documents
                  </p> */}
                </div>
                <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                  ⏰
                </div>
              </div>
            </button>
          </div>
        </div>

        {dashboardLoading && (
          <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-sm font-bold text-blue-200">
            Loading realization data...
          </div>
        )}
      </div>

      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
          <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1220] shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111c35] px-4 py-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  {activeModal === "exportValue"
                    ? "Export Value Details"
                    : activeModal === "expectedTotal"
                    ? "Expected Amount Details"
                    : activeModal === "overdue"
                    ? "Overdue Details"
                    : activeModal === "realized"
                    ? "Realized Details"
                    : activeModal === "upcoming"
                    ? "Upcoming Details"
                    : "Realization Details"}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Payment realization information
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {renderModalContent()}
              <div className="h-4" />
            </div>
          </div>
        </div>
      )}

      {selectedRealizationGroup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-xl border border-white/10 bg-[#0b1220] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-[#111c35] p-3">
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate">
                  {selectedRealizationGroup.label || "-"}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {isFactoryDetailModal
                    ? "Factory wise Dept/Buyer details"
                    : isMonthDeptBuyerDetailModal
                    ? `${selectedRealizationGroup.label || "-"} • Month wise Dept/Buyer details`
                    : `${selectedRealizationGroup.groupLabel} wise month details`}
                </p>

                {selectedRealizationGroup.code ? (
                  <p className="text-[10px] font-bold text-blue-300 mt-0.5 truncate">
                    {selectedRealizationGroup.codeLabel}: {selectedRealizationGroup.code}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => setSelectedRealizationGroup(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20 flex-shrink-0"
              >
                ✕
              </button>
            </div>

            <div className="p-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                <div className="rounded-lg bg-[#111827] border border-white/10 p-3">
                  <p className="text-lg font-bold text-white">
                    {money(groupDetailTotalValue)}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">
                    Total Value
                  </p>
                </div>

                <div className="rounded-lg bg-[#111827] border border-white/10 p-3">
                  <p className="text-lg font-bold text-blue-300">
                    {groupDetailTotalDocuments.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">
                    Documents
                  </p>
                </div>

                <div className="rounded-lg bg-[#111827] border border-white/10 p-3">
                  <p className="text-lg font-bold text-emerald-300">
                    {groupDetailTotalPcs.toLocaleString()}
                  </p>
                  <p className="text-[9px] font-bold uppercase text-slate-400 mt-0.5">
                    PCS
                  </p>
                </div>
              </div>

              <div className="mb-3 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                  <input
                    value={groupDetailSearchText}
                    onChange={(e) => setGroupDetailSearchText(e.target.value)}
                    placeholder={
                      isDeptBuyerListDetailModal
                        ? "Search department, buyer, month, code or value..."
                        : "Search month, documents, pcs or value..."
                    }
                    className="w-full rounded-lg bg-[#111827] border border-white/10 pl-7 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {groupDetailSearchText ? (
                  <button
                    type="button"
                    onClick={() => setGroupDetailSearchText("")}
                    className="rounded-lg bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 text-[10px] font-bold text-pink-300"
                  >
                    ✕ Clear
                  </button>
                ) : null}
              </div>

              <div className="max-h-[350px] overflow-y-auto rounded-lg border border-white/10 bg-[#0f172a]">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-[#16213d]">
                    <tr>
                      {isDeptBuyerListDetailModal ? (
                        <>
                          <Th>Documents</Th>
                          <Th>Department / Buyer</Th>
                          <Th>Month</Th>
                          <Th>PCS</Th>
                          <Th>Value</Th>
                        </>
                      ) : isPendingMonthDetailModal ? (
                        <>
                          <Th>Month</Th>
                          <Th>Documents</Th>
                          <Th>PCS</Th>
                          <Th>Value</Th>
                        </>
                      ) : (
                        <>
                          <Th>Month</Th>
                          <Th>Value</Th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {selectedRealizationGroup?.loading ? (
                      <tr>
                        <td
                          colSpan={isDeptBuyerListDetailModal ? 5 : isPendingMonthDetailModal ? 4 : 2}
                          className="px-3 py-8 text-center text-sm text-slate-400"
                        >
                          {isFactoryDetailModal
                            ? "Loading factory details..."
                            : isMonthDeptBuyerDetailModal
                            ? "Loading month Dept/Buyer details..."
                            : "Loading details..."}
                        </td>
                      </tr>
                    ) : selectedRealizationGroup?.error ? (
                      <tr>
                        <td
                          colSpan={isDeptBuyerListDetailModal ? 5 : isPendingMonthDetailModal ? 4 : 2}
                          className="px-3 py-8 text-center text-sm text-red-300"
                        >
                          {selectedRealizationGroup.error}
                        </td>
                      </tr>
                    ) : filteredGroupDetailRows.length ? (
                      filteredGroupDetailRows.map((item, index) => (
                        <tr
                          key={`${
                            item?.code || item?.label || item?.month || "detail"
                          }-${index}`}
                          className={`border-b border-white/5 ${
                            index % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111c31]"
                          }`}
                        >
                          {isDeptBuyerListDetailModal ? (
                            <>
                              <Td>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openDocumentPopup({
                                      title: `${item.departmentName || "-"} • ${item.buyerName || "-"}`,
                                      subtitle:
                                        selectedRealizationGroup?.viewMode === "factory"
                                          ? `Factory ${
                                              selectedRealizationGroup?.factoryCode ||
                                              selectedRealizationGroup?.code ||
                                              selectedRealizationGroup?.label ||
                                              "-"
                                            } • ${item.monthsText || "-"}`
                                          : `${selectedRealizationGroup?.label || "-"} • ${item.monthsText || "-"}`,
                                      rows: item.documentRows || item.sourceRows || [],
                                      type: selectedRealizationGroup?.type,
                                    })
                                  }
                                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-300 hover:bg-blue-500/20"
                                >
                                  {getNumber(item.documents).toLocaleString()} docs
                                </button>
                              </Td>
                              <Td strong>
                                <div>
                                  <p>{item.departmentName || "-"}</p>
                                  <p className="mt-0.5 text-[10px] font-bold text-blue-300">
                                    {item.buyerName || "-"}
                                  </p>
                                  <p className="mt-0.5 text-[9px] font-bold text-slate-500">
                                    {item.code || "-"}
                                  </p>
                                </div>
                              </Td>
                              <Td>{item.monthsText || selectedRealizationGroup?.label || "-"}</Td>
                              <Td>{getNumber(item.pcs).toLocaleString()}</Td>
                              <Td value>{compactMoney(getNumber(item.value))}</Td>
                            </>
                          ) : isPendingMonthDetailModal ? (
                            <>
                              <Td strong>{item.month || "-"}</Td>
                              <Td>
                                <button
                                  type="button"
                                  onClick={() =>
                                    openDocumentPopup({
                                      title: `${selectedRealizationGroup?.label || "-"} • ${item.month || "-"}`,
                                      subtitle: `${getNumber(item.documents).toLocaleString()} documents`,
                                      rows: item.documentRows || [],
                                      type: selectedRealizationGroup?.type,
                                    })
                                  }
                                  className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-2 py-1 text-[10px] font-black text-blue-300 hover:bg-blue-500/20"
                                >
                                  {getNumber(item.documents).toLocaleString()} docs
                                </button>
                              </Td>
                              <Td>{getNumber(item.pcs).toLocaleString()}</Td>
                              <Td value>{compactMoney(getNumber(item.value))}</Td>
                            </>
                          ) : (
                            <>
                              <Td strong>{item.month || "-"}</Td>
                              <Td value>{compactMoney(getNumber(item.value))}</Td>
                            </>
                          )}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={isDeptBuyerListDetailModal ? 5 : isPendingMonthDetailModal ? 4 : 2}
                          className="px-3 py-8 text-center text-sm text-slate-400"
                        >
                          {isFactoryDetailModal
                            ? "No Dept/Buyer rows returned for the selected factory"
                            : isMonthDeptBuyerDetailModal
                            ? "No Dept/Buyer rows returned for the selected month"
                            : "No matching month found"}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedDocumentPopup && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/95 p-3 backdrop-blur-sm">
          <div className="flex max-h-[82vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0b1220] shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 bg-[#111c35] p-3">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-bold text-white">
                  {selectedDocumentPopup.title}
                </h3>
                <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                  {selectedDocumentPopup.subtitle}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedDocumentPopup(null);
                  setDocumentPopupSearchText("");
                }}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20"
              >
                ✕
              </button>
            </div>

            <div className="p-3">
              <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-[#111827] p-3">
                  <p className="text-lg font-bold text-blue-300">
                    {
                      new Set(
                        normalizeArray(selectedDocumentPopup.rows)
                          .map((row) =>
                            normalizeText(
                              row?.expDocumentNo || row?.exportDocumentNo
                            )
                          )
                          .filter(Boolean)
                      ).size
                    }
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase text-slate-400">
                    Documents
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#111827] p-3">
                  <p className="text-lg font-bold text-emerald-300">
                    {normalizeArray(selectedDocumentPopup.rows)
                      .reduce(
                        (sum, row) => sum + getNumber(row?.totalPcs),
                        0
                      )
                      .toLocaleString()}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase text-slate-400">
                    PCS
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-[#111827] p-3">
                  <p className="text-lg font-bold text-amber-300">
                    {money(
                      normalizeArray(selectedDocumentPopup.rows).reduce(
                        (sum, row) => sum + getNumber(row?.totalValue),
                        0
                      )
                    )}
                  </p>
                  <p className="mt-0.5 text-[9px] font-bold uppercase text-slate-400">
                    Value
                  </p>
                </div>
              </div>

              <div className="relative mb-3">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  🔍
                </span>
                <input
                  value={documentPopupSearchText}
                  onChange={(event) =>
                    setDocumentPopupSearchText(event.target.value)
                  }
                  placeholder="Search document, factory, department, buyer..."
                  className="w-full rounded-lg border border-white/10 bg-[#111827] py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="max-h-[440px] overflow-auto rounded-lg border border-white/10 bg-[#0f172a]">
                <table className="min-w-full">
                  <thead className="sticky top-0 bg-[#16213d]">
                    <tr>
                      <Th>Document No</Th>
                      <Th>Month</Th>
                      <Th>Factory</Th>
                      <Th>Department / Buyer</Th>
                      <Th>PCS</Th>
                      <Th>Value</Th>
                    </tr>
                  </thead>

                  <tbody>
                    {removeDuplicateRows(
                      normalizeArray(selectedDocumentPopup.rows)
                    )
                      .filter((row) =>
                        [
                          row?.expDocumentNo,
                          row?.exportDocumentNo,
                          row?.factoryCode,
                          row?.departmentCode,
                          row?.departmentName,
                          row?.customerCode,
                          row?.customerName,
                          getDocumentPopupMonth(
                            row,
                            selectedDocumentPopup.type
                          ),
                        ].some((value) =>
                          normalizeText(value).includes(
                            normalizeText(documentPopupSearchText)
                          )
                        )
                      )
                      .map((row, index) => (
                        <tr
                          key={`document-${
                            row?.expDocumentNo ||
                            row?.exportDocumentNo ||
                            index
                          }-${index}`}
                          className={`border-b border-white/5 ${
                            index % 2 === 0
                              ? "bg-[#0f172a]"
                              : "bg-[#111c31]"
                          }`}
                        >
                          <Td strong>
                            {row?.expDocumentNo ||
                              row?.exportDocumentNo ||
                              "-"}
                          </Td>
                          <Td>
                            {getDocumentPopupMonth(
                              row,
                              selectedDocumentPopup.type
                            )}
                          </Td>
                          <Td>{row?.factoryCode || "-"}</Td>
                          <Td>
                            <div>
                              <p>{row?.departmentName || row?.departmentCode || "-"}</p>
                              <p className="mt-0.5 text-[10px] font-bold text-blue-300">
                                {row?.customerName || row?.customerCode || "-"}
                              </p>
                            </div>
                          </Td>
                          <Td>{getNumber(row?.totalPcs).toLocaleString()}</Td>
                          <Td value>
                            {compactMoney(getNumber(row?.totalValue))}
                          </Td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ModalSummaryCard({ title, value, subtitle, icon, color }) {
  return (
    <div
      className="mb-3 flex items-center gap-3 rounded-xl bg-[#111827] border p-3"
      style={{ borderColor: `${color}55` }}
    >
      <div
        className="h-10 w-10 rounded-lg flex items-center justify-center text-base"
        style={{ backgroundColor: `${color}22` }}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[9px] font-bold uppercase text-slate-400">{title}</p>
        <h3 className="mt-0.5 text-base font-bold" style={{ color }}>
          {value}
        </h3>
        <p className="mt-0.5 text-[9px] text-slate-300">{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyModalCard({ text }) {
  return (
    <div className="rounded-lg border border-white/10 bg-[#0f172a] p-6 text-center text-xs font-bold text-slate-400">
      {text}
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-3 py-2 text-left text-[9px] font-bold uppercase tracking-wide text-slate-300">
      {children}
    </th>
  );
}

function Td({ children, strong, value }) {
  return (
    <td
      className={`px-3 py-2.5 text-xs ${
        strong
          ? "font-bold text-white"
          : value
          ? "font-bold text-emerald-300"
          : "font-bold text-slate-300"
      }`}
    >
      {children}
    </td>
  );
}

export default RealizationPage;