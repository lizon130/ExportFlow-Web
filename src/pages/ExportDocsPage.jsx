import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://192.168.9.45:7000";

function ExportDocsPage() {
  const [loading, setLoading] = useState(false);
  const [buyerLoading, setBuyerLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [buyerSummaryData, setBuyerSummaryData] = useState([]);
  const [filteredBuyerData, setFilteredBuyerData] = useState([]);
  const [buyerSearchText, setBuyerSearchText] = useState("");
  const [buyerCurrentPage, setBuyerCurrentPage] = useState(1);
  const [buyerItemsPerPage, setBuyerItemsPerPage] = useState(20);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [departmentAccess, setDepartmentAccess] = useState({
    loaded: false,
    isRestricted: true,
    assignedDepartments: [],
    queryValues: [],
    keyValues: [],
    profile: null,
  });

  const [error, setError] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalExportData, setModalExportData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState("");
  const [modalSearchText, setModalSearchText] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const normalizeArray = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    if (Array.isArray(data?.items)) return data.items;
    if (data && typeof data === "object") return [data];
    return [];
  };

  const addUniqueText = (list, value) => {
    const textValue = String(value || "").trim();
    const key = normalizeText(textValue);

    if (
      textValue &&
      key !== "0" &&
      key !== "null" &&
      key !== "undefined" &&
      !list.some((item) => normalizeText(item) === key)
    ) {
      list.push(textValue);
    }
  };

  const getStoredJsonValue = (key) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
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

  const getToken = () => {
    return (
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      getStoredJsonValue("user")?.accessToken ||
      getStoredJsonValue("auth")?.accessToken ||
      ""
    );
  };

  const getUserIdFromTokenOrStorage = () => {
    const token = getToken();
    const payload = decodeJwtPayload(token);

    return (
      localStorage.getItem("userId") ||
      payload.sub ||
      payload.nameid ||
      payload.userId ||
      getStoredJsonValue("user")?.recId ||
      getStoredJsonValue("user")?.userId ||
      getStoredJsonValue("user")?.id ||
      null
    );
  };

  const buildRequestHeaders = () => {
    const token = getToken();

    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const fetchJsonWithAuth = async (url) => {
    const response = await fetch(url, {
      method: "GET",
      headers: buildRequestHeaders(),
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
          : data?.message || `HTTP error! status: ${response.status}`
      );
    }

    return data;
  };

  const getDepartmentsFromPayload = (payload) => {
    return normalizeArray(
      payload?.departments ||
        payload?.department ||
        payload?.assignedDepartments ||
        payload?.data?.departments ||
        payload?.user?.departments ||
        payload?.profile?.departments ||
        []
    );
  };

  const getRolesFromPayload = (payload) => {
    return normalizeArray(
      payload?.roles ||
        payload?.role ||
        payload?.data?.roles ||
        payload?.user?.roles ||
        payload?.profile?.roles ||
        []
    );
  };

  const hasAdminRole = (payload) => {
    const roleText = getRolesFromPayload(payload)
      .map((role) =>
        normalizeText(
          role?.roleName || role?.name || role?.userTypeName || role?.title || role
        )
      )
      .join(" ");

    const tokenRole = normalizeText(decodeJwtPayload(getToken())?.role);

    return (
      roleText.includes("super-admin") ||
      roleText.includes("super admin") ||
      roleText.includes("superadmin") ||
      roleText.includes("admin") ||
      tokenRole.includes("super-admin") ||
      tokenRole.includes("super admin") ||
      tokenRole.includes("superadmin") ||
      tokenRole.includes("admin")
    );
  };

  const fetchDepartmentMasterData = async () => {
    const endpoints = [
      "/api/Department/get-all-department",
      "/api/Export/get-all-department",
      "/api/Export/Get-All-Department",
      "/api/Export/Get-All-Departments",
      "/api/Export/GetAllDepartment",
    ];

    for (const endpoint of endpoints) {
      try {
        const data = await fetchJsonWithAuth(`${API_BASE_URL}${endpoint}`);
        const rows = normalizeArray(data);

        if (rows.length) return rows;
      } catch {
        // try next endpoint
      }
    }

    return [];
  };

  const resolveLoggedInUserProfile = async () => {
    const localUser = getStoredJsonValue("user") || {};
    const localDepartments = getDepartmentsFromPayload(localUser);

    if (localDepartments.length > 0) return localUser;

    const userId = getUserIdFromTokenOrStorage();

    if (!userId) {
      return localUser || {};
    }

    try {
      const profileData = await fetchJsonWithAuth(
        `${API_BASE_URL}/api/User/${encodeURIComponent(userId)}/profile`
      );

      return profileData || localUser || {};
    } catch (error) {
      console.error("Error loading logged-in user profile:", error);
      return localUser || {};
    }
  };

  const getDepartmentTokenValues = (item) => {
    return [
      item?.recId,
      item?.id,
      item?.departmentId,
      item?.departmentRecId,
      item?.deptId,
      item?.departmentCode,
      item?.deptCode,
      item?.depCode,
      item?.departmentName,
      item?.deptName,
      item?.depName,
      item?.name,
      item?.custDept,
      item?.customerCode,
      item?.customerName,
      item?.buyerNameCode,
      item?.buyerName,
      item?.__queryDepName,
    ];
  };

  const getDepartmentQueryValuesFromItem = (item) => {
    const values = [];

    [
      item?.departmentCode,
      item?.deptCode,
      item?.depCode,
      item?.departmentName,
      item?.deptName,
      item?.depName,
      item?.name,
      item?.custDept,
      item?.__queryDepName,
    ].forEach((value) => addUniqueText(values, value));

    return values;
  };

  const buildDepartmentAccessFromProfile = (profileData, departmentMasterData) => {
    const assignedDepartments = getDepartmentsFromPayload(profileData);
    const masterRows = normalizeArray(departmentMasterData);
    const keyValues = [];
    const queryValues = [];

    assignedDepartments.forEach((department) => {
      getDepartmentTokenValues(department).forEach((value) =>
        addUniqueText(keyValues, value)
      );

      getDepartmentQueryValuesFromItem(department).forEach((value) =>
        addUniqueText(queryValues, value)
      );

      const departmentKeys = getDepartmentTokenValues(department).map(normalizeText);

      masterRows.forEach((masterDepartment) => {
        const masterKeys = getDepartmentTokenValues(masterDepartment).map(
          normalizeText
        );

        const isSame = departmentKeys.some(
          (key) => key && masterKeys.includes(key)
        );

        if (isSame) {
          getDepartmentTokenValues(masterDepartment).forEach((value) =>
            addUniqueText(keyValues, value)
          );

          getDepartmentQueryValuesFromItem(masterDepartment).forEach((value) =>
            addUniqueText(queryValues, value)
          );
        }
      });
    });

    // WEB FIX:
    // React Native receives userData directly, but web often only has token/localStorage.
    // If no assigned departments are found, do NOT block data.
    // This makes the page show all data instead of 0.
    const isRestricted = assignedDepartments.length > 0;

    return {
      loaded: true,
      isRestricted,
      assignedDepartments,
      queryValues,
      keyValues: keyValues.map(normalizeText),
      profile: profileData,
    };
  };

  const loadDepartmentAccess = async () => {
    const [profileData, departmentMasterData] = await Promise.all([
      resolveLoggedInUserProfile(),
      fetchDepartmentMasterData(),
    ]);

    const access = buildDepartmentAccessFromProfile(
      profileData,
      departmentMasterData
    );

    console.log("ExportDocsPage department access:", {
      isRestricted: access.isRestricted,
      assignedDepartments: access.assignedDepartments,
      queryValues: access.queryValues,
      keyValues: access.keyValues,
      profile: access.profile,
      userId: getUserIdFromTokenOrStorage(),
      hasToken: Boolean(getToken()),
    });

    setDepartmentAccess(access);
    return access;
  };

  const isRowAllowedForAccess = (row, access = departmentAccess) => {
    if (!access?.isRestricted) return true;
    if (!access?.keyValues?.length) return false;

    const rowKeys = getDepartmentTokenValues(row).map(normalizeText);
    return rowKeys.some((key) => key && access.keyValues.includes(key));
  };

  const getAllowedDepartmentQueries = (
    access = departmentAccess,
    deptCode = "",
    deptName = ""
  ) => {
    const requestedValues = [];
    addUniqueText(requestedValues, deptCode);
    addUniqueText(requestedValues, deptName);

    if (!access?.isRestricted) {
      return requestedValues.length ? requestedValues : [""];
    }

    const allowedValues = [];

    if (requestedValues.length) {
      requestedValues.forEach((value) => {
        if (access.keyValues?.includes(normalizeText(value))) {
          addUniqueText(allowedValues, value);
        }
      });

      return allowedValues;
    }

    (access?.queryValues || []).forEach((value) =>
      addUniqueText(allowedValues, value)
    );

    return allowedValues;
  };

  const fetchRowsFromEndpointByDepName = async (
    endpoint,
    access = departmentAccess,
    deptCode = "",
    deptName = ""
  ) => {
    const queryValues = getAllowedDepartmentQueries(access, deptCode, deptName);

    // WEB FIX:
    // If no department query can be built, fall back to all-data API.
    // Without this, all cards show 0.
    const safeQueryValues = queryValues.length ? queryValues : [""];

    let mergedRows = [];

    for (const queryValue of safeQueryValues) {
      const queryText = String(queryValue || "").trim();

      const url = queryText
        ? `${API_BASE_URL}${endpoint}?depName=${encodeURIComponent(queryText)}`
        : `${API_BASE_URL}${endpoint}`;

      try {
        const data = await fetchJsonWithAuth(url);
        const rows = normalizeArray(data).map((item) => ({
          ...item,
          __queryDepName: queryText,
        }));

        mergedRows = [...mergedRows, ...rows];
      } catch (error) {
        console.error("API failed:", url, error);
      }
    }

    if (access?.isRestricted && access?.keyValues?.length) {
      return mergedRows.filter((row) => isRowAllowedForAccess(row, access));
    }

    return mergedRows;
  };

  const getUniqueExportDocumentKey = (item) => {
    const keyValue =
      item?.expDocumentNo ||
      item?.exportDocument ||
      item?.exportDocumentNo ||
      item?.packagingListNo ||
      item?.packingListNo ||
      item?.recId ||
      item?.id ||
      "";

    return normalizeText(keyValue);
  };

  const removeDuplicateExportDocuments = (data) => {
    const seenKeys = {};

    return (Array.isArray(data) ? data : []).filter((item, index) => {
      const key = getUniqueExportDocumentKey(item) || `row-${index}`;

      if (seenKeys[key]) return false;

      seenKeys[key] = true;
      return true;
    });
  };

  const isSameDepartment = (item, deptCode, deptName) => {
    const selectedValues = [];
    addUniqueText(selectedValues, deptCode);
    addUniqueText(selectedValues, deptName);

    if (!selectedValues.length) return true;

    const rowKeys = getDepartmentTokenValues(item).map(normalizeText);
    return selectedValues.some((value) => rowKeys.includes(normalizeText(value)));
  };

  const fetchDepartmentExportDocuments = async (
    deptCode,
    deptName,
    accessOverride = departmentAccess
  ) => {
    const rows = await fetchRowsFromEndpointByDepName(
      "/api/Export/Get-By-Dept-Export-Docment-List",
      accessOverride,
      deptCode,
      deptName
    );

    return removeDuplicateExportDocuments(
      rows.filter((item) => isSameDepartment(item, deptCode, deptName))
    );
  };

  const parseDateString = (dateStr) => {
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }
    return null;
  };

  const formatDateForInput = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const [dd, mm, yyyy] = ddmmyyyy.split("-");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm}-${dd}`;
  };

  const formatInputDateToDisplay = (yyyymmdd) => {
    if (!yyyymmdd) return "";
    const [yyyy, mm, dd] = yyyymmdd.split("-");
    return `${dd}-${mm}-${yyyy}`;
  };

  const filterBySelectedDates = (data) => {
    if (!Array.isArray(data)) return [];

    const fromDateObj = fromDate ? parseDateString(fromDate) : null;
    const toDateObj = toDate ? parseDateString(toDate) : null;

    if (!fromDateObj && !toDateObj) return data;

    return data.filter((item) => {
      if (!item?.exFacDate) return false;

      const itemDate = new Date(item.exFacDate);

      if (fromDateObj && itemDate < fromDateObj) return false;
      if (toDateObj && itemDate > toDateObj) return false;

      return true;
    });
  };

  const filterDataBySearch = (data, text) => {
    if (!text || !Array.isArray(data)) return data;

    const searchLower = text.toLowerCase();

    return data.filter(
      (item) =>
        item.packagingListNo?.toString().toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.styleCode?.toLowerCase().includes(searchLower) ||
        item.expDocumentNo?.toLowerCase().includes(searchLower) ||
        item.departmentName?.toLowerCase().includes(searchLower)
    );
  };

  const updateDepartmentPendingCount = (deptCode, deptName, count) => {
    const updater = (list) =>
      (Array.isArray(list) ? list : [])
        .map((item) =>
          isSameDepartment(item, deptCode, deptName)
            ? { ...item, pendingExpDocument: count, pendingExportCount: count }
            : item
        )
        .filter((item) => (item?.pendingExpDocument || 0) > 0);

    setBuyerSummaryData((prev) => updater(prev));
    setFilteredBuyerData((prev) => updater(prev));
  };

  const buildPendingDepartmentsFromActualDocs = async (
    dataArray,
    accessOverride = departmentAccess
  ) => {
    const baseDepartments = normalizeArray(dataArray)
      .filter((item) => (item?.pendingExportCount || item?.pendingExpDocument || 0) > 0)
      .filter((item) => isRowAllowedForAccess(item, accessOverride))
      .map((item, index) => ({
        ...item,
        departmentId:
          item?.departmentId ||
          item?.recId ||
          item?.departmentCode ||
          item?.__queryDepName ||
          index + 1,
        pendingExpDocument:
          item?.pendingExpDocument || item?.pendingExportCount || 0,
        apiPendingExpDocument:
          item?.pendingExportCount || item?.pendingExpDocument || 0,
        customerName:
          item?.customerName ||
          item?.buyerName ||
          item?.departmentName ||
          "Unknown",
        departmentName:
          item?.departmentName || item?.departmentCode || item?.__queryDepName || "-",
        departmentCode: item?.departmentCode || item?.__queryDepName || "",
      }));

    const departmentsWithActualCount = await Promise.all(
      baseDepartments.map(async (department) => {
        try {
          const departmentDocuments = await fetchDepartmentExportDocuments(
            department.departmentCode,
            department.departmentName,
            accessOverride
          );

          const dateFilteredDocuments = filterBySelectedDates(departmentDocuments);
          const actualPendingCount = dateFilteredDocuments.length;

          return {
            ...department,
            pendingExpDocument: actualPendingCount,
            pendingExportCount: actualPendingCount,
          };
        } catch (error) {
          console.error("Error syncing pending count:", error);
          return department;
        }
      })
    );

    return departmentsWithActualCount
      .filter((item) => (item?.pendingExpDocument || 0) > 0)
      .sort((a, b) => (b?.pendingExpDocument || 0) - (a?.pendingExpDocument || 0));
  };

  const fetchDepartmentsAndSummary = async (accessOverride = departmentAccess) => {
    setBuyerLoading(true);
    setError("");

    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      const dataArray = await fetchRowsFromEndpointByDepName(
        "/api/Export/Get-Pending-Export-Document-Count",
        activeAccess
      );

      const pendingDepartments = await buildPendingDepartmentsFromActualDocs(
        dataArray,
        activeAccess
      );

      setBuyerSummaryData(pendingDepartments);
      setFilteredBuyerData(pendingDepartments);
    } catch (error) {
      console.error("Error fetching pending summary:", error);
      setError(`Failed to load Export Document data: ${error.message}`);
      setBuyerSummaryData([]);
      setFilteredBuyerData([]);
    } finally {
      setBuyerLoading(false);
    }
  };

  const fetchExportData = async (accessOverride = departmentAccess) => {
    setLoading(true);
    setError("");

    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      await fetchDepartmentExportDocuments("", "", activeAccess);
    } catch (error) {
      console.error("Fetch error:", error);
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const initScreen = async () => {
    setLoading(true);
    setError("");

    try {
      const access = await loadDepartmentAccess();
      await Promise.all([
        fetchDepartmentsAndSummary(access),
        fetchExportData(access),
      ]);
    } catch (error) {
      console.error("Init error:", error);
      setError(`Failed to initialize page: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (departmentAccess.loaded) {
      fetchDepartmentsAndSummary(departmentAccess);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate]);

  const handleBuyerSearch = (text) => {
    setBuyerSearchText(text);
    setBuyerCurrentPage(1);

    if (!Array.isArray(buyerSummaryData)) {
      setFilteredBuyerData([]);
      return;
    }

    const searchLower = text.toLowerCase();
    const filtered = buyerSummaryData.filter(
      (item) =>
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.departmentCode?.toLowerCase().includes(searchLower) ||
        item.departmentName?.toLowerCase().includes(searchLower)
    );

    setFilteredBuyerData(filtered);
  };

  const clearBuyerSearch = () => {
    setBuyerSearchText("");
    setFilteredBuyerData(buyerSummaryData);
    setBuyerCurrentPage(1);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await initScreen();
    setRefreshing(false);
  };

  const handleReset = () => {
    setFromDate("");
    setToDate("");
    setBuyerSearchText("");
    setBuyerCurrentPage(1);

    setTimeout(() => {
      fetchDepartmentsAndSummary(departmentAccess);
    }, 100);
  };

  const fetchModalExportData = async (
    deptCode,
    deptName,
    accessOverride = departmentAccess
  ) => {
    setModalLoading(true);

    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      const dataArray = await fetchDepartmentExportDocuments(
        deptCode,
        deptName,
        activeAccess
      );

      const dateFilteredArray = filterBySelectedDates(dataArray);

      updateDepartmentPendingCount(deptCode, deptName, dateFilteredArray.length);

      setModalExportData(dateFilteredArray);
      setModalFilteredData(dateFilteredArray);
      setModalCurrentPage(1);
      setModalSearchText("");
    } catch (error) {
      console.error("Fetch modal error:", error);
      setModalExportData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBadgeClick = async (item) => {
    const displayTitle =
      item?.customerName && item?.departmentName
        ? `${item.customerName} • ${item.departmentName}`
        : item?.customerName || item?.departmentName || "Unknown";

    setModalDepartmentName(displayTitle);
    setShowDetailsModal(true);

    await fetchModalExportData(
      item?.departmentCode || item?.__queryDepName,
      item?.departmentName || item?.customerName || item?.__queryDepName,
      departmentAccess
    );
  };

  const handleModalSearch = (text) => {
    setModalSearchText(text);
    setModalCurrentPage(1);

    if (!Array.isArray(modalExportData)) {
      setModalFilteredData([]);
      return;
    }

    setModalFilteredData(filterDataBySearch(modalExportData, text));
  };

  const buyerSafeFilteredData = Array.isArray(filteredBuyerData)
    ? filteredBuyerData
    : [];

  const buyerTotalPages =
    Math.ceil(buyerSafeFilteredData.length / buyerItemsPerPage) || 1;

  const buyerCurrentPageData = buyerSafeFilteredData.slice(
    (buyerCurrentPage - 1) * buyerItemsPerPage,
    buyerCurrentPage * buyerItemsPerPage
  );

  const totalPendingBuyers = buyerSafeFilteredData.reduce(
    (sum, item) => sum + (Number(item.pendingExpDocument) || 0),
    0
  );

  const totalBuyerCount = buyerSafeFilteredData.length;

  const maxPending =
    buyerSafeFilteredData.length > 0
      ? Math.max(
          ...buyerSafeFilteredData.map((item) => Number(item?.pendingExpDocument) || 0)
        )
      : 0;

  const sortedPendingData = [...buyerSafeFilteredData].sort(
    (a, b) => (Number(b?.pendingExpDocument) || 0) - (Number(a?.pendingExpDocument) || 0)
  );

  const highestPendingItem = sortedPendingData[0] || null;
  const lowestPendingItem = sortedPendingData.length
    ? sortedPendingData[sortedPendingData.length - 1]
    : null;

  const cardAccentColors = [
    "#8b5cf6",
    "#f59e0b",
    "#06b6d4",
    "#3b82f6",
    "#ec4899",
    "#22c55e",
    "#ef4444",
    "#14b8a6",
  ];

  const cardSoftColors = [
    "rgba(139,92,246,0.18)",
    "rgba(245,158,11,0.18)",
    "rgba(6,182,212,0.18)",
    "rgba(59,130,246,0.18)",
    "rgba(236,72,153,0.18)",
    "rgba(34,197,94,0.18)",
    "rgba(239,68,68,0.18)",
    "rgba(20,184,166,0.18)",
  ];

  const cardIcons = ["👥", "👔", "🏬", "👜", "🛒", "📦", "📑", "🏭"];

  const getDisplayName = (item) =>
    item?.customerName || item?.departmentName || "Unknown";

  const getDepartmentSubText = (item) =>
    item?.departmentName || item?.departmentCode || "-";

  const getPendingPercentage = (pending) => {
    if (!maxPending || maxPending <= 0) return 0;
    return Math.min(100, Math.round((pending / maxPending) * 100));
  };

  const getProgressWidth = (pending) => {
    const percentage = getPendingPercentage(pending);
    if (percentage === 0) return "8%";
    return `${Math.max(8, percentage)}%`;
  };

  const getStatusMeta = (pending) => {
    const percentage = getPendingPercentage(pending);

    if (percentage >= 70) {
      return {
        label: "High",
        textColor: "text-red-300",
        bgColor: "bg-red-500/10",
        borderColor: "border-red-500/30",
      };
    }

    if (percentage >= 40) {
      return {
        label: "Medium",
        textColor: "text-amber-300",
        bgColor: "bg-amber-500/10",
        borderColor: "border-amber-500/30",
      };
    }

    return {
      label: "Low",
      textColor: "text-emerald-300",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/30",
    };
  };

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];

  const modalTotalPages =
    Math.ceil(modalSafeFilteredData.length / modalItemsPerPage) || 1;

  const modalCurrentPageData = modalSafeFilteredData.slice(
    (modalCurrentPage - 1) * modalItemsPerPage,
    modalCurrentPage * modalItemsPerPage
  );

  const hasActiveFilters = fromDate !== "" || toDate !== "";

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] text-slate-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12 space-y-5">
        <div className="rounded-3xl bg-[#101827] border border-white/10 p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Export Documents
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Same React Native API logic converted to React web view
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || loading || buyerLoading}
              className="rounded-2xl bg-blue-600 px-5 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {refreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <DateInput
              label="From Date"
              value={formatDateForInput(fromDate)}
              onChange={(value) => setFromDate(formatInputDateToDisplay(value))}
            />

            <DateInput
              label="To Date"
              value={formatDateForInput(toDate)}
              onChange={(value) => setToDate(formatInputDateToDisplay(value))}
            />
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Active Filters:</span>

              {fromDate && (
                <FilterBadge
                  label={`From: ${fromDate}`}
                  onClear={() => setFromDate("")}
                />
              )}

              {toDate && (
                <FilterBadge
                  label={`To: ${toDate}`}
                  onClear={() => setToDate("")}
                />
              )}

              <button
                type="button"
                onClick={handleReset}
                className="rounded-full bg-red-500/10 border border-red-500/30 px-3 py-1 text-xs font-bold text-red-300 hover:bg-red-500/20"
              >
                Reset All
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-2xl bg-pink-500/10 border border-pink-500/30 px-4 py-3 text-sm text-pink-300">
            {error}
          </div>
        )}

        <section className="rounded-3xl bg-[#0f111a] border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-4 sm:p-5">
            <div>
              <h2 className="text-xl font-black text-white">📊 Pending Summary</h2>
              <p className="text-xs text-slate-400 mt-1">
                Only assigned department data. Admin without assigned departments can see all.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SummaryPill label="Departments" value={totalBuyerCount} />
              <SummaryPill label="Total Pending" value={totalPendingBuyers} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 sm:px-5 pb-4">
            <StatCard
              icon="🏢"
              value={totalBuyerCount}
              title="Departments"
              subtitle="Available active departments"
              variant="blue"
            />

            <StatCard
              icon="📄"
              value={totalPendingBuyers}
              title="Total Documents"
              subtitle="Pending export documents"
              variant="green"
            />
          </div>

          {!buyerLoading && buyerSafeFilteredData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mx-4 sm:mx-5 mb-5 rounded-3xl bg-[#101a3f] border border-white/10 p-3">
              <InsightCard
                title="Highest Pending"
                item={highestPendingItem}
                countClass="bg-red-500"
                onClick={() => highestPendingItem && handleBadgeClick(highestPendingItem)}
              />

              <InsightCard
                title="Lowest Pending"
                item={lowestPendingItem}
                countClass="bg-emerald-500"
                onClick={() => lowestPendingItem && handleBadgeClick(lowestPendingItem)}
              />
            </div>
          )}

          <div className="px-4 sm:px-5 pb-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-black text-white">
                  Pending by Department
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Click any card for details
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    🔍
                  </span>

                  <input
                    value={buyerSearchText}
                    onChange={(e) => handleBuyerSearch(e.target.value)}
                    placeholder="Search department..."
                    className="w-full sm:w-72 rounded-2xl bg-[#1e293b] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {buyerSearchText && (
                  <button
                    type="button"
                    onClick={clearBuyerSearch}
                    className="rounded-2xl bg-pink-500/10 border border-pink-500/30 px-4 py-2.5 text-sm font-bold text-pink-300"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {buyerLoading || loading ? (
              <div className="py-16 text-center text-slate-400">
                Loading pending summary...
              </div>
            ) : buyerCurrentPageData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {buyerCurrentPageData.map((item, index) => {
                    const pending = Number(item?.pendingExpDocument) || 0;
                    const accentColor = cardAccentColors[index % cardAccentColors.length];
                    const softColor = cardSoftColors[index % cardSoftColors.length];
                    const icon = cardIcons[index % cardIcons.length];
                    const percentage = getPendingPercentage(pending);
                    const statusMeta = getStatusMeta(pending);

                    return (
                      <button
                        key={`${item?.departmentCode || item?.customerName || index}-${index}`}
                        type="button"
                        onClick={() => handleBadgeClick(item)}
                        className="relative overflow-hidden rounded-2xl bg-[#161b26] border border-[#293244] p-4 text-left shadow-lg hover:border-blue-500/50 hover:bg-[#1a2232] transition"
                        style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
                      >
                        <div
                          className="absolute -top-8 -right-8 h-20 w-20 rounded-full"
                          style={{ backgroundColor: softColor }}
                        />

                        <div className="relative flex items-start gap-3 mb-4">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
                            style={{ backgroundColor: softColor }}
                          >
                            {icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-black text-white line-clamp-2">
                              {getDisplayName(item)}
                            </h4>

                            <p className="text-xs text-slate-400 truncate mt-1">
                              {getDepartmentSubText(item)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex-1 h-1.5 rounded-full bg-[#243041] overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: getProgressWidth(pending),
                                backgroundColor: accentColor,
                              }}
                            />
                          </div>

                          <span className="text-[11px] font-black text-slate-200">
                            {percentage}%
                          </span>
                        </div>

                        <div className="relative flex items-center justify-between gap-3">
                          <span
                            className="rounded-full px-3 py-1 text-xs font-black text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            Pending: {pending}
                          </span>

                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-1 text-[10px] font-black ${statusMeta.bgColor} ${statusMeta.borderColor} ${statusMeta.textColor}`}
                            >
                              {statusMeta.label}
                            </span>

                            <span className="text-xs font-black text-blue-400">
                              View →
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={buyerCurrentPage}
                  totalPages={buyerTotalPages}
                  itemsPerPage={buyerItemsPerPage}
                  setItemsPerPage={setBuyerItemsPerPage}
                  onPageChange={setBuyerCurrentPage}
                  totalItems={buyerSafeFilteredData.length}
                />
              </>
            ) : (
              <div className="py-16 text-center">
                <div className="text-4xl mb-2">✅</div>

                <h3 className="text-sm font-bold text-slate-200">
                  No pending documents found
                </h3>

                <p className="text-xs text-slate-500 mt-1">
                  If this is wrong, check login token, user profile departments, API CORS, and browser console network response.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showDetailsModal && (
        <DetailsModal
          title={modalDepartmentName}
          fromDate={fromDate}
          toDate={toDate}
          loading={modalLoading}
          data={modalCurrentPageData}
          totalRecords={modalSafeFilteredData.length}
          searchText={modalSearchText}
          setSearchText={handleModalSearch}
          onClose={() => setShowDetailsModal(false)}
          currentPage={modalCurrentPage}
          totalPages={modalTotalPages}
          itemsPerPage={modalItemsPerPage}
          setItemsPerPage={setModalItemsPerPage}
          onPageChange={setModalCurrentPage}
          onClearSearch={() => {
            setModalSearchText("");
            setModalFilteredData(modalExportData);
            setModalCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}

function DateInput({ label, value, onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-bold uppercase text-slate-400">
        {label}
      </label>

      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          📅
        </span>

        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[52px] rounded-2xl bg-[#0b1220] border border-slate-700/60 pl-11 pr-4 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>
  );
}

function FilterBadge({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-3 py-1 text-xs font-bold text-white">
      {label}

      <button type="button" onClick={onClear} className="font-black">
        ✕
      </button>
    </span>
  );
}

function SummaryPill({ label, value }) {
  return (
    <div className="rounded-full bg-blue-500/10 border border-blue-500/30 px-4 py-2 text-center">
      <div className="text-sm font-black text-blue-200">{value}</div>
      <div className="text-[10px] font-bold text-blue-300">{label}</div>
    </div>
  );
}

function StatCard({ icon, value, title, subtitle, variant }) {
  const isGreen = variant === "green";

  return (
    <div
      className={`relative min-h-[150px] overflow-hidden rounded-3xl border p-5 shadow-xl ${
        isGreen
          ? "bg-[#102a24] border-emerald-500/20"
          : "bg-[#132238] border-blue-500/20"
      }`}
    >
      <div
        className={`absolute -top-8 -right-8 h-28 w-28 rounded-full ${
          isGreen ? "bg-emerald-500/10" : "bg-blue-500/10"
        }`}
      />

      <div className="relative flex items-center justify-between mb-4">
        <div
          className={`h-12 w-12 rounded-2xl flex items-center justify-center text-2xl ${
            isGreen ? "bg-emerald-500/20" : "bg-blue-500/20"
          }`}
        >
          {icon}
        </div>

        <span
          className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
            isGreen
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
              : "bg-blue-500/10 border-blue-500/30 text-blue-200"
          }`}
        >
          {isGreen ? "Pending" : "Active"}
        </span>
      </div>

      <h3 className="relative text-4xl font-black text-white">{value}</h3>
      <p className="relative mt-1 text-sm font-black text-white">{title}</p>
      <p className="relative mt-1 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function InsightCard({ title, item, countClass, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4 text-left hover:bg-white/10 transition"
    >
      <div className="min-w-0">
        <p className="text-xs font-bold text-slate-400">{title}</p>

        <h4 className="mt-1 truncate text-sm font-black text-white">
          {item?.customerName || "Unknown"}
        </h4>

        <p className="mt-1 truncate text-xs font-bold text-slate-400">
          {item?.departmentName || item?.departmentCode || "-"}
        </p>
      </div>

      <span
        className={`min-w-12 rounded-2xl px-3 py-2 text-center text-sm font-black text-white ${countClass}`}
      >
        {item?.pendingExpDocument || 0}
      </span>
    </button>
  );
}

function Pagination({
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  onPageChange,
  totalItems,
}) {
  if (totalPages <= 1) return null;

  const safeTotalPages = Math.max(1, totalPages);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  const pageNumbers = [];

  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(safeTotalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  for (let i = startPage; i <= endPage; i += 1) {
    pageNumbers.push(i);
  }

  return (
    <div className="mt-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-t border-white/10 pt-4">
      <p className="text-xs text-slate-400">
        {startItem}-{endItem} of {totalItems}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          Previous
        </button>

        {pageNumbers.map((page) => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${
              currentPage === page
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-200"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          disabled={currentPage === safeTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          Next
        </button>
      </div>

      <select
        value={itemsPerPage}
        onChange={(e) => {
          setItemsPerPage(Number(e.target.value));
          onPageChange(1);
        }}
        className="rounded-xl bg-slate-800 border border-white/10 px-3 py-2 text-xs font-bold text-white"
      >
        <option value={20}>20 rows</option>
        <option value={50}>50 rows</option>
        <option value={100}>100 rows</option>
      </select>
    </div>
  );
}

function DetailsModal({
  title,
  fromDate,
  toDate,
  loading,
  data,
  totalRecords,
  searchText,
  setSearchText,
  onClose,
  currentPage,
  totalPages,
  itemsPerPage,
  setItemsPerPage,
  onPageChange,
  onClearSearch,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3">
      <div className="flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-[#111c35] px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/20 text-xl">
              📄
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-white">
                {title}
              </h3>

              <p className="truncate text-xs text-slate-400">
                {fromDate || toDate
                  ? `${fromDate || "Start"} → ${toDate || "Today"}`
                  : "All export documents"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[120px_1fr] gap-3 px-5 pt-4">
          <div className="rounded-2xl bg-[#132238] border border-blue-500/20 px-4 py-3">
            <div className="text-xl font-black text-white">{totalRecords}</div>
            <div className="text-xs font-bold text-blue-300">Records</div>
          </div>

          <div className="rounded-2xl bg-[#102a24] border border-emerald-500/20 px-4 py-4">
            <div className="truncate text-xs font-black text-emerald-200">
              {fromDate || toDate
                ? `${fromDate || "Start"} - ${toDate || "Today"}`
                : "No date filter"}
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 px-5 py-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
              🔍
            </span>

            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search packing, customer, style..."
              className="w-full rounded-2xl bg-[#111827] border border-white/10 pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {searchText && (
            <button
              type="button"
              onClick={onClearSearch}
              className="rounded-2xl bg-pink-500/10 border border-pink-500/30 px-4 py-3 text-sm font-black text-pink-300"
            >
              Clear
            </button>
          )}
        </div>

        {loading ? (
          <div className="m-5 flex flex-1 items-center justify-center rounded-3xl bg-[#111827] text-slate-400">
            Loading export documents...
          </div>
        ) : data.length > 0 ? (
          <div className="mx-5 mb-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a]">
            <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr] bg-[#16213d] border-b border-white/10">
              <div className="px-4 py-3 text-xs font-black uppercase text-slate-300">
                Document
              </div>
              <div className="px-4 py-3 text-xs font-black uppercase text-slate-300">
                Value / Pcs
              </div>
              <div className="px-4 py-3 text-xs font-black uppercase text-slate-300">
                Ex-Factory
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {data.map((item, index) => (
                <div
                  key={`${item?.packagingListNo || index}-${index}`}
                  className={`grid grid-cols-[1.6fr_0.9fr_0.8fr] border-b border-white/5 ${
                    index % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111c31]"
                  }`}
                >
                  <div className="px-4 py-3 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="rounded-full bg-blue-500/20 px-2 py-1 text-[10px] font-black text-blue-300">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>

                      <span className="truncate text-xs font-black text-white">
                        {item.packagingListNo || "-"}
                      </span>
                    </div>

                    <p className="truncate text-xs font-bold text-blue-300">
                      {item.customerName || "-"}
                    </p>

                    <p className="truncate text-[11px] font-bold text-slate-400">
                      {item.departmentName || "-"}
                    </p>
                  </div>

                  <div className="px-4 py-3">
                    <p className="text-xs font-black text-emerald-300">
                      {item.totalValue
                        ? Number(item.totalValue).toLocaleString()
                        : "0"}
                    </p>

                    <p className="mt-1 text-[11px] font-bold text-slate-300">
                      {item.noOfPcs ? Number(item.noOfPcs).toLocaleString() : "0"} pcs
                    </p>
                  </div>

                  <div className="px-4 py-3">
                    <p className="text-xs font-black text-emerald-200">
                      {item.exFacDate ? item.exFacDate.split("T")[0] : "-"}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                itemsPerPage={itemsPerPage}
                setItemsPerPage={setItemsPerPage}
                onPageChange={onPageChange}
                totalItems={totalRecords}
              />
            </div>
          </div>
        ) : (
          <div className="m-5 flex flex-1 flex-col items-center justify-center rounded-3xl bg-[#111827] text-center">
            <div className="text-4xl mb-3">📭</div>

            <h3 className="text-base font-black text-white">
              No export records found
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Try changing the selected date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportDocsPage;
