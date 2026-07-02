import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://192.168.9.45:7000";

function BankSubmitPage() {
  const [refreshing, setRefreshing] = useState(false);

  const [summaryStats, setSummaryStats] = useState({
    totalValue: 0,
    totalPending: 0,
    totalSubmitted: 0,
    totalFiles: 0,
  });

  const [bankSummaryData, setBankSummaryData] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankCurrentPage, setBankCurrentPage] = useState(1);
  const [bankItemsPerPage, setBankItemsPerPage] = useState(20);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalBankData, setModalBankData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalSearchText, setModalSearchText] = useState("");

  const [departmentAccess, setDepartmentAccess] = useState({
    loaded: false,
    accessToken: "",
    departments: [],
    userProfile: null,
  });

  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    initializeBankSubmitScreen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const safeLength = Array.isArray(modalFilteredData)
      ? modalFilteredData.length
      : 0;
    const safeTotalPages = Math.max(
      1,
      Math.ceil(safeLength / modalItemsPerPage)
    );

    if (modalCurrentPage > safeTotalPages) {
      setModalCurrentPage(safeTotalPages);
    }
  }, [modalFilteredData, modalItemsPerPage, modalCurrentPage]);

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

  const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

  const getStoredJsonValue = (key) => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch (storageError) {
      console.error(`localStorage read error for ${key}:`, storageError);
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
    if (typeof payload === "string") return payload;

    return (
      payload?.accessToken ||
      payload?.token ||
      payload?.jwtToken ||
      payload?.authToken ||
      payload?.data?.accessToken ||
      payload?.data?.token ||
      payload?.user?.accessToken ||
      payload?.profile?.accessToken ||
      ""
    );
  };

  const getToken = () => {
    const storageKeys = [
      "accessToken",
      "token",
      "user",
      "userData",
      "authData",
      "loginResponse",
    ];

    for (const key of storageKeys) {
      const raw = key === "accessToken" || key === "token"
        ? localStorage.getItem(key)
        : getStoredJsonValue(key);

      const token = typeof raw === "string" ? raw : getAccessTokenFromPayload(raw);
      if (token) return token;
    }

    return "";
  };

  const getUserIdFromPayload = (payload) => {
    if (!payload || typeof payload === "string") return null;

    return (
      payload?.recId ||
      payload?.userId ||
      payload?.id ||
      payload?.data?.recId ||
      payload?.data?.userId ||
      payload?.data?.id ||
      payload?.user?.recId ||
      payload?.user?.userId ||
      payload?.user?.id ||
      payload?.profile?.recId ||
      payload?.profile?.userId ||
      payload?.profile?.id ||
      null
    );
  };

  const getProfileCandidate = (payload) => {
    if (!payload || typeof payload === "string") return null;

    return (
      payload?.profile ||
      payload?.userProfile ||
      payload?.user ||
      payload?.data?.profile ||
      payload?.data?.user ||
      payload?.data ||
      payload
    );
  };

  const getDepartmentsFromProfile = (profile) => {
    return normalizeArray(
      profile?.departments ||
        profile?.department ||
        profile?.assignedDepartments ||
        profile?.userDepartments ||
        profile?.user?.departments ||
        profile?.profile?.departments ||
        []
    );
  };

  const getBuyersFromProfile = (profile) => {
    return normalizeArray(
      profile?.buyers ||
        profile?.buyer ||
        profile?.assignedBuyers ||
        profile?.userBuyers ||
        profile?.user?.buyers ||
        profile?.profile?.buyers ||
        []
    );
  };

  const normalizeDepartmentAccessItem = (department, buyer = null) => {
    const departmentCode = String(
      department?.departmentCode ||
        department?.deptCode ||
        department?.depCode ||
        department?.departmentName ||
        department?.deptName ||
        department?.name ||
        ""
    ).trim();

    const departmentName = String(
      department?.departmentName ||
        department?.deptName ||
        department?.depName ||
        department?.departmentCode ||
        department?.name ||
        ""
    ).trim();

    const buyerName = String(
      department?.buyerName ||
        buyer?.buyerName ||
        department?.customerName ||
        departmentName ||
        departmentCode ||
        ""
    ).trim();

    const buyerCode = String(
      department?.buyerNameCode ||
        buyer?.buyerNameCode ||
        department?.customerCode ||
        buyer?.buyerRecId ||
        departmentCode ||
        ""
    ).trim();

    return {
      recId: department?.recId || department?.id || department?.departmentId,
      departmentCode,
      departmentName,
      customerName: buyerName || departmentName || departmentCode,
      customerCode: buyerCode,
    };
  };

  const getDepartmentQueryCandidates = (department) => {
    const candidates = [
      department?.departmentCode,
      department?.departmentName,
      department?.deptCode,
      department?.deptName,
      department?.customerCode,
      department?.customerName,
    ];

    const uniqueCandidates = [];

    candidates.forEach((value) => {
      const textValue = String(value || "").trim();
      if (
        textValue &&
        !uniqueCandidates.some(
          (item) => item.toLowerCase() === textValue.toLowerCase()
        )
      ) {
        uniqueCandidates.push(textValue);
      }
    });

    return uniqueCandidates;
  };

  const attachDepartmentFallback = (row, department) => ({
    ...row,
    departmentCode:
      row?.departmentCode || row?.deptCode || department?.departmentCode || "",
    departmentName:
      row?.departmentName ||
      row?.deptName ||
      department?.departmentName ||
      department?.departmentCode ||
      "-",
    customerCode:
      row?.customerCode || department?.customerCode || department?.departmentCode || "",
    customerName:
      row?.customerName ||
      department?.customerName ||
      department?.departmentName ||
      department?.departmentCode ||
      "Unknown",
  });

  const getRowsScore = (rows, metricFields = []) => {
    const metricScore = rows.reduce(
      (sum, item) =>
        sum +
        metricFields.reduce(
          (fieldSum, field) => fieldSum + getNumber(item?.[field]),
          0
        ),
      0
    );

    return metricScore > 0 ? metricScore : rows.length;
  };

  const buildDepartmentUrl = (endpoint, depName) => {
    const separator = endpoint.includes("?") ? "&" : "?";
    return `${API_BASE_URL}${endpoint}${separator}depName=${encodeURIComponent(
      depName || ""
    )}`;
  };

  const fetchJson = async (url, accessToken = "") => {
    const headers = {
      Accept: "application/json",
      "Content-Type": "application/json",
    };

    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    const response = await fetch(url, {
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
          : data?.message || `HTTP error! status: ${response.status}`
      );
    }

    return data;
  };

  const fetchDepartmentRows = async (
    endpoint,
    department,
    metricFields = [],
    accessOverride = departmentAccess
  ) => {
    const candidates = getDepartmentQueryCandidates(department);
    let bestRows = [];
    let bestScore = -1;

    for (const depName of candidates) {
      try {
        const data = await fetchJson(
          buildDepartmentUrl(endpoint, depName),
          accessOverride?.accessToken || ""
        );

        const rows = normalizeArray(data).map((row) =>
          attachDepartmentFallback(row, department)
        );

        const score = getRowsScore(rows, metricFields);

        if (score > bestScore || (score === bestScore && !bestRows.length)) {
          bestRows = rows;
          bestScore = score;
        }
      } catch (fetchError) {
        console.error(`Bank department API error for ${depName}:`, fetchError);
      }
    }

    return bestRows;
  };

  const fetchRowsForAssignedDepartments = async (
    endpoint,
    accessOverride,
    metricFields = []
  ) => {
    const departments = normalizeArray(accessOverride?.departments);

    if (!departments.length) {
      const data = await fetchJson(
        `${API_BASE_URL}${endpoint}`,
        accessOverride?.accessToken || ""
      );
      return normalizeArray(data);
    }

    const nestedRows = await Promise.all(
      departments.map((department) =>
        fetchDepartmentRows(endpoint, department, metricFields, accessOverride)
      )
    );

    return nestedRows.flat();
  };

  const loadDepartmentAccess = async () => {
    const storageKeys = [
      "userData",
      "userInfo",
      "user",
      "authUser",
      "loginUser",
      "loggedInUser",
      "currentUser",
      "profile",
      "userProfile",
      "authData",
      "loginResponse",
    ];

    const storedPayloads = [];

    for (const key of storageKeys) {
      const value = getStoredJsonValue(key);
      if (value) storedPayloads.push(value);
    }

    const allPayloads = [...storedPayloads].filter(Boolean);
    const accessToken = getToken();

    const profileFromStorage = allPayloads
      .map(getProfileCandidate)
      .find((profile) => getDepartmentsFromProfile(profile).length > 0);

    let userProfile = profileFromStorage || null;

    if (!userProfile) {
      const tokenPayload = decodeJwtPayload(accessToken);
      const userId =
        localStorage.getItem("userId") ||
        tokenPayload.sub ||
        tokenPayload.nameid ||
        tokenPayload.userId ||
        allPayloads.map(getUserIdFromPayload).find(Boolean);

      if (userId) {
        try {
          userProfile = await fetchJson(
            `${API_BASE_URL}/api/User/${encodeURIComponent(userId)}/profile`,
            accessToken
          );
        } catch (profileError) {
          console.error("Error fetching logged-in user profile:", profileError);
        }
      }
    }

    const profileDepartments = getDepartmentsFromProfile(userProfile);
    const profileBuyers = getBuyersFromProfile(userProfile);
    const firstBuyer = profileBuyers[0] || null;

    const departments = profileDepartments
      .map((department) => normalizeDepartmentAccessItem(department, firstBuyer))
      .filter((department) => department.departmentCode || department.departmentName);

    return {
      loaded: true,
      accessToken,
      departments,
      userProfile,
    };
  };

  const initializeBankSubmitScreen = async () => {
    const access = await loadDepartmentAccess();
    setDepartmentAccess(access);
    await Promise.all([fetchSummaryStats(access), fetchBankSummary(access)]);
  };

  const fetchSummaryStats = async (accessOverride = departmentAccess) => {
    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      const [pendingArray, completedArray] = await Promise.all([
        fetchRowsForAssignedDepartments(
          "/api/Export/Get-Pending-Bank-Submission-Date-Count",
          activeAccess,
          [
            "pendingBankSubmissionDateCount",
            "pendingBank",
            "totalValue",
            "totalExportValue",
            "pendingValue",
          ]
        ),
        fetchRowsForAssignedDepartments(
          "/api/Export/Get-Completed-Bank-Submission-Date-Count",
          activeAccess,
          [
            "completedBankSubmissionDateCount",
            "completedBank",
            "totalPackagingCount",
          ]
        ),
      ]);

      const pendingCount = pendingArray.reduce(
        (sum, item) =>
          sum +
          getNumber(item?.pendingBankSubmissionDateCount || item?.pendingBank),
        0
      );

      const totalValue = pendingArray.reduce(
        (sum, item) =>
          sum +
          (getNumber(item?.totalValue) ||
            getNumber(item?.totalExportValue) ||
            getNumber(item?.pendingValue) ||
            0),
        0
      );

      const completedCount = completedArray.reduce(
        (sum, item) =>
          sum +
          (getNumber(item?.completedBankSubmissionDateCount) ||
            getNumber(item?.completedBank) ||
            getNumber(item?.totalPackagingCount) ||
            0),
        0
      );

      setSummaryStats({
        totalValue,
        totalPending: pendingCount,
        totalSubmitted: completedCount,
        totalFiles: pendingCount + completedCount,
      });
    } catch (statsError) {
      console.error("Error fetching bank dashboard stats:", statsError);
      setSummaryStats({
        totalValue: 0,
        totalPending: 0,
        totalSubmitted: 0,
        totalFiles: 0,
      });
    }
  };

  const fetchBankSummary = async (accessOverride = departmentAccess) => {
    setBankLoading(true);
    setError("");

    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      const dataArray = await fetchRowsForAssignedDepartments(
        "/api/Export/Get-Pending-Bank-Submission-Date-Count",
        activeAccess,
        [
          "pendingBankSubmissionDateCount",
          "pendingBank",
          "totalValue",
          "totalExportValue",
          "pendingValue",
        ]
      );

      const pendingBankDepartments = dataArray
        .filter((item) => getNumber(item?.pendingBankSubmissionDateCount) > 0)
        .map((item) => ({
          ...item,
          pendingBank: getNumber(item?.pendingBankSubmissionDateCount),
          customerName: item?.customerName || item?.departmentName || "Unknown",
          departmentName: item?.departmentName || item?.departmentCode || "-",
          departmentCode: item?.departmentCode || "",
          totalValue: getNumber(item?.totalValue),
        }))
        .sort((a, b) => (b?.pendingBank || 0) - (a?.pendingBank || 0));

      setBankSummaryData(pendingBankDepartments);
      setBankCurrentPage(1);
    } catch (fetchError) {
      console.error("Error fetching pending bank summary:", fetchError);
      setBankSummaryData([]);
      setBankCurrentPage(1);
      setError(`Network error: ${fetchError.message}`);
    } finally {
      setBankLoading(false);
    }
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return null;

    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return new Date(parts[2], parts[1] - 1, parts[0]);
    }

    return null;
  };

  const getDateOnly = (date) => {
    if (!date || Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getFilterDateValue = (item) => {
    return (
      item?.bankSubmissionDate ||
      item?.shippingDate ||
      item?.blDate ||
      item?.exFacDate ||
      null
    );
  };

  const filterBySelectedDates = (data) => {
    if (!Array.isArray(data)) return [];

    const fromDateObj = getDateOnly(parseDateString(fromDate));
    const toDateObj = getDateOnly(parseDateString(toDate));

    if (!fromDateObj && !toDateObj) return data;

    return data.filter((item) => {
      const dateValue = getFilterDateValue(item);
      if (!dateValue) return false;

      const itemDate = getDateOnly(new Date(dateValue));
      if (!itemDate) return false;

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
        item?.packagingListNo?.toString().toLowerCase().includes(searchLower) ||
        item?.expDocumentNo?.toString().toLowerCase().includes(searchLower) ||
        item?.customerName?.toLowerCase().includes(searchLower) ||
        item?.departmentName?.toLowerCase().includes(searchLower) ||
        item?.totalValue?.toString().toLowerCase().includes(searchLower)
    );
  };

  const fetchModalBankData = async (item) => {
    setModalLoading(true);
    setModalSearchText("");

    try {
      const activeAccess = departmentAccess?.loaded
        ? departmentAccess
        : await loadDepartmentAccess();

      const dataArray = await fetchDepartmentRows(
        "/api/Export/Get-By-Dept-Bank-Submission-Date-List",
        item,
        ["totalValue", "noOfPcs", "noOfCarton"],
        activeAccess
      );

      const pendingRows = dataArray.filter((row) => !row?.bankSubmissionDate);
      const rowsForModal = pendingRows.length > 0 ? pendingRows : dataArray;
      const dateFilteredData = filterBySelectedDates(rowsForModal);

      setModalBankData(dateFilteredData);
      setModalFilteredData(dateFilteredData);
      setModalCurrentPage(1);
      setModalDepartmentName(getFullDisplayName(item));
    } catch (fetchError) {
      console.error("Bank modal fetch error:", fetchError);
      setModalBankData([]);
      setModalFilteredData([]);
      setModalCurrentPage(1);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = async (item) => {
    setModalDepartmentName(getFullDisplayName(item));
    setShowDetailsModal(true);
    await fetchModalBankData(item);
  };

  const handleModalSearch = (text) => {
    setModalSearchText(text);
    setModalCurrentPage(1);

    if (!Array.isArray(modalBankData)) {
      setModalFilteredData([]);
      return;
    }

    setModalFilteredData(filterDataBySearch(modalBankData, text));
  };

  const onRefresh = async () => {
    setRefreshing(true);

    try {
      const activeAccess = departmentAccess?.loaded
        ? departmentAccess
        : await loadDepartmentAccess();

      if (!departmentAccess?.loaded) {
        setDepartmentAccess(activeAccess);
      }

      await Promise.all([
        fetchSummaryStats(activeAccess),
        fetchBankSummary(activeAccess),
      ]);
    } finally {
      setRefreshing(false);
    }
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

  const bankSafeData = Array.isArray(bankSummaryData) ? bankSummaryData : [];

  const filteredBankData = useMemo(() => {
    if (!searchText.trim()) return bankSafeData;

    const key = searchText.toLowerCase();

    return bankSafeData.filter(
      (item) =>
        item?.customerName?.toLowerCase().includes(key) ||
        item?.departmentName?.toLowerCase().includes(key) ||
        item?.departmentCode?.toLowerCase().includes(key)
    );
  }, [bankSafeData, searchText]);

  const bankTotalPages =
    Math.ceil(filteredBankData.length / bankItemsPerPage) || 1;

  const bankCurrentPageData = filteredBankData.slice(
    (bankCurrentPage - 1) * bankItemsPerPage,
    bankCurrentPage * bankItemsPerPage
  );

  const totalPendingBank = filteredBankData.reduce(
    (sum, item) => sum + (item?.pendingBank || 0),
    0
  );

  const totalDepartmentCount = filteredBankData.length;

  const displayTotalValue = summaryStats.totalValue || 0;
  const displaySubmittedCount = summaryStats.totalSubmitted || 0;
  const displayPendingCount = summaryStats.totalPending || 0;
  const displayTotalFiles = summaryStats.totalFiles || 0;

  const formatNumber = (value) => {
    const numericValue = Number(value || 0);
    return Number.isFinite(numericValue) ? numericValue.toLocaleString() : "0";
  };

  const maxPendingBank =
    filteredBankData.length > 0
      ? Math.max(...filteredBankData.map((item) => item?.pendingBank || 0))
      : 0;

  const sortedPendingBankData = [...filteredBankData].sort(
    (a, b) => (b?.pendingBank || 0) - (a?.pendingBank || 0)
  );

  const highestPendingItem = sortedPendingBankData[0] || null;
  const lowestPendingItem = sortedPendingBankData.length
    ? sortedPendingBankData[sortedPendingBankData.length - 1]
    : null;

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];

  const modalTotalPages = Math.max(
    1,
    Math.ceil(modalSafeFilteredData.length / modalItemsPerPage)
  );

  const modalCurrentPageData = modalSafeFilteredData.slice(
    (modalCurrentPage - 1) * modalItemsPerPage,
    modalCurrentPage * modalItemsPerPage
  );

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

  const cardIcons = ["🏦", "📦", "🏬", "📄", "🛒", "🏭", "🧾", "💳"];

  const getDisplayName = (item) =>
    item?.customerName || item?.departmentName || "Unknown";

  const getDepartmentSubText = (item) =>
    item?.departmentName || item?.departmentCode || "-";

  const getFullDisplayName = (item) => {
    const customer = item?.customerName || "Unknown";
    const department = item?.departmentName || item?.departmentCode || "";
    return department && department !== customer
      ? `${customer} • ${department}`
      : customer;
  };

  const getPendingPercentage = (pending) => {
    if (!maxPendingBank || maxPendingBank <= 0) return 0;
    return Math.min(100, Math.round((pending / maxPendingBank) * 100));
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

  const getBankStatus = (bankSubmissionDate) => {
    return bankSubmissionDate ? "Submitted" : "Pending";
  };

  const getBankStatusClass = (bankSubmissionDate) => {
    return bankSubmissionDate
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
      : "bg-red-500/10 border-red-500/30 text-red-300";
  };

  const hasActiveFilters = fromDate !== "" || toDate !== "";

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-[#101827] border border-white/10 p-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-white">🏦 Bank Submit</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Converted from React Native BankSubmit screen using same APIs
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || bankLoading}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition whitespace-nowrap"
            >
              {refreshing ? "Refreshing..." : "🔄 Refresh"}
            </button>
          </div>

          {/* Date Filters - Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                From Date
              </label>
              <input
                type="date"
                value={formatDateForInput(fromDate)}
                onChange={(e) => setFromDate(formatInputDateToDisplay(e.target.value))}
                className="w-full rounded-xl bg-[#0b1220] border border-slate-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                To Date
              </label>
              <input
                type="date"
                value={formatDateForInput(toDate)}
                onChange={(e) => setToDate(formatInputDateToDisplay(e.target.value))}
                className="w-full rounded-xl bg-[#0b1220] border border-slate-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-end gap-2">
              {hasActiveFilters && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
                      setTimeout(() => {
                        onRefresh();
                      }, 100);
                    }}
                    className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
                  >
                    ✕ Reset
                  </button>
                  
                  <div className="flex flex-wrap gap-1">
                    {fromDate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-2 py-1 text-[10px] font-bold text-blue-300 border border-blue-500/20">
                        From: {fromDate}
                        <button onClick={() => setFromDate("")} className="hover:text-white">✕</button>
                      </span>
                    )}
                    {toDate && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-2 py-1 text-[10px] font-bold text-blue-300 border border-blue-500/20">
                        To: {toDate}
                        <button onClick={() => setToDate("")} className="hover:text-white">✕</button>
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-pink-500/10 border border-pink-500/30 px-4 py-2 text-sm text-pink-300">
            ⚠️ {error}
          </div>
        )}

        {/* Main Section */}
        <section className="rounded-2xl bg-[#0f111a] border border-white/10 shadow-2xl overflow-hidden">
          {/* Stats Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black text-white">📊 Bank Submission Summary</h2>
              <span className="text-xs text-slate-400">Overview by active department</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-500/10 rounded-full px-3 py-1 border border-blue-500/20">
                <span className="text-xs font-bold text-blue-300">Departments</span>
                <span className="text-sm font-black text-white">{totalDepartmentCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 rounded-full px-3 py-1 border border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-300">Pending</span>
                <span className="text-sm font-black text-white">{totalPendingBank}</span>
              </div>
            </div>
          </div>

          {/* Dashboard Cards - Compact */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
            <div className="rounded-xl bg-[#1c1733] border border-violet-500/25 px-3 py-2">
              <div className="text-lg font-black text-violet-200">${formatNumber(displayTotalValue)}</div>
              <div className="text-[10px] font-bold text-violet-300/60">Total Value</div>
            </div>
            <div className="rounded-xl bg-[#102a24] border border-emerald-500/25 px-3 py-2">
              <div className="text-lg font-black text-emerald-200">{formatNumber(displaySubmittedCount)}</div>
              <div className="text-[10px] font-bold text-emerald-300/60">Completed</div>
            </div>
            <div className="rounded-xl bg-[#2b2112] border border-amber-500/25 px-3 py-2">
              <div className="text-lg font-black text-amber-200">{formatNumber(displayPendingCount)}</div>
              <div className="text-[10px] font-bold text-amber-300/60">Pending</div>
            </div>
            <div className="rounded-xl bg-[#132238] border border-blue-500/25 px-3 py-2">
              <div className="text-lg font-black text-blue-200">{formatNumber(displayTotalFiles)}</div>
              <div className="text-[10px] font-bold text-blue-300/60">Total Files</div>
            </div>
          </div>

          {/* Search & Cards */}
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black text-white">Pending Bank Submission</h3>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setBankCurrentPage(1);
                  }}
                  placeholder="Search department..."
                  className="w-full sm:w-56 rounded-xl bg-[#1e293b] border border-white/10 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {bankLoading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading pending bank submissions...</div>
            ) : bankCurrentPageData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {bankCurrentPageData.map((item, index) => {
                    const pending = item?.pendingBank || 0;
                    const accentColor = cardAccentColors[index % cardAccentColors.length];
                    const icon = cardIcons[index % cardIcons.length];
                    const statusMeta = getStatusMeta(pending);

                    return (
                      <button
                        key={`${item?.departmentCode || item?.customerName || index}-${index}`}
                        type="button"
                        onClick={() => handleCardClick(item)}
                        className="relative overflow-hidden rounded-xl bg-[#161b26] border border-[#293244] p-3 text-left shadow-lg hover:border-blue-500/50 hover:bg-[#1a2232] transition-all group"
                        style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
                      >
                        <div
                          className="absolute -top-6 -right-6 h-16 w-16 rounded-full opacity-20"
                          style={{ backgroundColor: accentColor }}
                        />

                        <div className="relative flex items-start gap-2 mb-2">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ backgroundColor: `${accentColor}2b` }}
                          >
                            {icon}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-white truncate">
                              {getDisplayName(item)}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate">
                              {getDepartmentSubText(item)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex-1 h-1 rounded-full bg-[#243041] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: getProgressWidth(pending),
                                backgroundColor: accentColor,
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-slate-300">
                            {getPendingPercentage(pending)}%
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="rounded-lg px-2 py-0.5 text-[10px] font-bold text-white"
                            style={{ backgroundColor: accentColor }}
                          >
                            {pending} pending
                          </span>

                          <span
                            className={`rounded-full border px-2 py-0.5 text-[8px] font-bold uppercase ${statusMeta.bgColor} ${statusMeta.borderColor} ${statusMeta.textColor}`}
                          >
                            {statusMeta.label}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <Pagination
                  currentPage={bankCurrentPage}
                  totalPages={bankTotalPages}
                  itemsPerPage={bankItemsPerPage}
                  setItemsPerPage={setBankItemsPerPage}
                  onPageChange={setBankCurrentPage}
                  totalItems={filteredBankData.length}
                />
              </>
            ) : (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-sm font-bold text-slate-200">No pending bank submission found</h3>
                <p className="text-xs text-slate-500 mt-1">All departments are up to date</p>
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
            setModalFilteredData(modalBankData);
            setModalCurrentPage(1);
          }}
          getBankStatus={getBankStatus}
          getBankStatusClass={getBankStatusClass}
        />
      )}
    </div>
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
    <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-white/10 pt-3">
      <p className="text-[10px] text-slate-400">
        {startItem}-{endItem} of {totalItems}
      </p>

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40 hover:bg-slate-700 transition"
        >
          ◀
        </button>

        {pageNumbers.map((page) => (
          <button
            type="button"
            key={page}
            onClick={() => onPageChange(page)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
              currentPage === page
                ? "bg-blue-600 text-white"
                : "bg-slate-800 text-slate-200 hover:bg-slate-700"
            }`}
          >
            {page}
          </button>
        ))}

        <button
          type="button"
          disabled={currentPage === safeTotalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-40 hover:bg-slate-700 transition"
        >
          ▶
        </button>

        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            onPageChange(1);
          }}
          className="rounded-lg bg-slate-800 border border-white/10 px-2 py-1 text-xs font-bold text-white"
        >
          <option value={20}>20</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select>
      </div>
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
  getBankStatus,
  getBankStatusClass,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111c35] px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-base flex-shrink-0">
              🏦
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-white">{title}</h3>
              <p className="truncate text-[10px] text-slate-400">
                {fromDate || toDate ? `${fromDate || "Start"} → ${toDate || "Today"}` : "All pending bank submission records"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-300 hover:bg-red-500/20 transition flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pt-3">
          <div className="rounded-xl bg-[#132238] border border-blue-500/20 px-3 py-2">
            <div className="text-lg font-black text-white">{totalRecords}</div>
            <div className="text-[10px] font-bold text-blue-300">Records</div>
          </div>
          <div className="rounded-xl bg-[#102a24] border border-emerald-500/20 px-3 py-2">
            <div className="text-xs font-bold text-emerald-200 truncate">
              {fromDate || toDate ? `${fromDate || "Start"} - ${toDate || "Today"}` : "All dates"}
            </div>
            <div className="text-[10px] font-bold text-emerald-300/60">Date range</div>
          </div>
        </div>

        {totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row gap-2 px-4 py-3">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search packing, export no, department..."
                className="w-full rounded-xl bg-[#111827] border border-white/10 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {searchText && (
              <button
                type="button"
                onClick={onClearSearch}
                className="rounded-xl bg-pink-500/10 border border-pink-500/30 px-3 py-1.5 text-xs font-bold text-pink-300 hover:bg-pink-500/20 transition whitespace-nowrap"
              >
                ✕ Clear
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="mx-4 flex flex-1 items-center justify-center rounded-xl bg-[#111827] text-slate-400 text-sm">
            Loading bank records...
          </div>
        ) : data.length > 0 ? (
          <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]">
            <div className="grid grid-cols-[1.55fr_0.9fr_1.05fr] bg-[#16213d] border-b border-white/10 text-[10px] font-bold uppercase text-slate-300">
              <div className="px-3 py-2">Document</div>
              <div className="px-3 py-2">Qty / Value</div>
              <div className="px-3 py-2">Dates / Status</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {data.map((item, index) => {
                const status = getBankStatus(item?.bankSubmissionDate);
                const statusClass = getBankStatusClass(item?.bankSubmissionDate);

                return (
                  <div
                    key={`${item?.packagingListNo || item?.expDocumentNo || index}-${index}`}
                    className={`grid grid-cols-[1.55fr_0.9fr_1.05fr] border-b border-white/5 ${
                      index % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111c31]"
                    }`}
                  >
                    <div className="px-3 py-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-bold text-blue-300 flex-shrink-0">
                          {(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                        <span className="truncate text-xs font-bold text-white">
                          {item?.packagingListNo || "-"}
                        </span>
                      </div>
                      <p className="truncate text-[10px] font-bold text-violet-300 mt-0.5">
                        {item?.expDocumentNo || "-"}
                      </p>
                      <p className="truncate text-[10px] font-bold text-blue-300 mt-0.5">
                        {item?.customerName || "-"}
                      </p>
                      <p className="truncate text-[9px] font-bold text-slate-400">
                        {item?.departmentName || "-"}
                      </p>
                    </div>

                    <div className="px-3 py-2">
                      <p className="text-xs font-bold text-white">
                        {item?.noOfCarton ? Number(item.noOfCarton).toLocaleString() : "0"} ctn
                      </p>
                      <p className="text-[10px] font-bold text-slate-300">
                        {item?.noOfPcs ? Number(item.noOfPcs).toLocaleString() : "0"} pcs
                      </p>
                      <p className="text-[10px] font-bold text-emerald-300 mt-0.5">
                        {item?.totalValue ? Number(item.totalValue).toLocaleString() : "0"}
                      </p>
                    </div>

                    <div className="px-3 py-2">
                      <DateLine label="B/L" value={item?.blDate} />
                      <DateLine label="Ship" value={item?.shippingDate} />
                      <DateLine label="Bank" value={item?.bankSubmissionDate} />
                      <span
                        className={`inline-flex mt-1 rounded-full border px-1.5 py-0.5 text-[8px] font-bold ${statusClass}`}
                      >
                        {status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="px-3 py-2 border-t border-white/10">
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
          <div className="mx-4 mb-4 flex flex-1 flex-col items-center justify-center rounded-xl bg-[#111827] text-center">
            <div className="text-3xl mb-2">🏦</div>
            <h3 className="text-sm font-bold text-white">No bank records found</h3>
            <p className="text-xs text-slate-400 mt-0.5">Try changing the selected date range.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DateLine({ label, value }) {
  return (
    <div className="mb-0.5">
      <p className="text-[7px] font-black uppercase text-slate-500">{label}</p>
      <p className="text-[9px] font-bold text-emerald-200">
        {value ? value.split("T")[0] : "-"}
      </p>
    </div>
  );
}

export default BankSubmitPage;