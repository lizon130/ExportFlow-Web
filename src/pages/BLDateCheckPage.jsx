import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://192.168.9.45:7000";

function BLDateCheckPage() {
  const [refreshing, setRefreshing] = useState(false);

  const [blSummaryData, setBlSummaryData] = useState([]);
  const [filteredBlData, setFilteredBlData] = useState([]);
  const [blLoading, setBlLoading] = useState(false);
  const [blCurrentPage, setBlCurrentPage] = useState(1);
  const [blItemsPerPage, setBlItemsPerPage] = useState(20);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalExportData, setModalExportData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalSearchText, setModalSearchText] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    fetchBlSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(modalFilteredData.length / modalItemsPerPage)
    );

    if (modalCurrentPage > totalPages) {
      setModalCurrentPage(totalPages);
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

  const normalizeText = (value) => String(value ?? "").trim().toLowerCase();

  const getNumber = (value) => {
    const numberValue = Number(value || 0);
    return Number.isFinite(numberValue) ? numberValue : 0;
  };

  const getStoredJsonValue = (key) => {
    try {
      const rawValue = localStorage.getItem(key);
      if (!rawValue) return null;

      try {
        return JSON.parse(rawValue);
      } catch {
        return rawValue;
      }
    } catch (error) {
      console.error(`Error reading ${key} from localStorage:`, error);
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
    if (!payload || typeof payload !== "object") return "";

    return (
      payload?.accessToken ||
      payload?.token ||
      payload?.access_token ||
      payload?.jwtToken ||
      payload?.data?.accessToken ||
      payload?.data?.token ||
      payload?.user?.accessToken ||
      payload?.profile?.accessToken ||
      ""
    );
  };

  const getToken = () => {
    const localUser = getStoredJsonValue("user");
    const auth = getStoredJsonValue("auth");

    return (
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      getAccessTokenFromPayload(localUser) ||
      getAccessTokenFromPayload(auth) ||
      ""
    );
  };

  const getUserIdFromPayload = (payload) => {
    if (!payload || typeof payload !== "object") return null;

    return (
      payload?.recId ||
      payload?.userId ||
      payload?.id ||
      payload?.userRecId ||
      payload?.profile?.recId ||
      payload?.profile?.userId ||
      payload?.user?.recId ||
      payload?.user?.userId ||
      payload?.data?.recId ||
      payload?.data?.userId ||
      payload?.data?.user?.recId ||
      payload?.data?.user?.userId ||
      null
    );
  };

  const getUserIdFromTokenOrStorage = () => {
    const tokenPayload = decodeJwtPayload(getToken());
    const localUser = getStoredJsonValue("user");

    return (
      localStorage.getItem("userId") ||
      tokenPayload.sub ||
      tokenPayload.nameid ||
      tokenPayload.userId ||
      getUserIdFromPayload(localUser) ||
      null
    );
  };

  const getProfileObjectFromPayload = (payload) => {
    if (!payload || typeof payload !== "object") return null;

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

  const getAuthHeaders = () => {
    const token = getToken();

    return token
      ? {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      : {
          Accept: "application/json",
          "Content-Type": "application/json",
        };
  };

  const fetchJsonWithAuth = async (url) => {
    const response = await fetch(url, {
      method: "GET",
      headers: getAuthHeaders(),
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

  const getStoredUserPayload = () => {
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
    ];

    for (const key of storageKeys) {
      const storedValue = getStoredJsonValue(key);
      if (storedValue) return storedValue;
    }

    return null;
  };

  const fetchLoggedInUserProfile = async () => {
    const storedPayload = getStoredUserPayload();
    const profileFromPayload = getProfileObjectFromPayload(storedPayload);

    const existingDepartments = normalizeArray(
      profileFromPayload?.departments || profileFromPayload?.department
    );

    if (existingDepartments.length) {
      return { profile: profileFromPayload, authPayload: storedPayload };
    }

    const userId = getUserIdFromTokenOrStorage();

    if (!userId) {
      console.warn("B/L department access: logged-in user id not found");
      return { profile: profileFromPayload || {}, authPayload: storedPayload };
    }

    try {
      const profile = await fetchJsonWithAuth(
        `${API_BASE_URL}/api/User/${encodeURIComponent(userId)}/profile`
      );

      return { profile, authPayload: storedPayload };
    } catch (error) {
      console.error("Error fetching logged-in user profile:", error);
      return { profile: profileFromPayload || {}, authPayload: storedPayload };
    }
  };

  const getUserRoles = (profile) =>
    normalizeArray(profile?.roles || profile?.role || profile?.user?.roles || []);

  const getAssignedDepartments = (profile) =>
    normalizeArray(
      profile?.departments ||
        profile?.department ||
        profile?.profile?.departments ||
        profile?.user?.departments ||
        []
    );

  const userCanSeeAllDepartments = (profile) => {
    const assignedDepartments = getAssignedDepartments(profile);

    if (assignedDepartments.length) return false;

    const roleText = getUserRoles(profile)
      .map((role) => normalizeText(role?.roleName || role?.name || role))
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

  const pushUniqueQueryValue = (values, value) => {
    const textValue = String(value || "").trim();

    if (
      textValue &&
      !values.some((item) => normalizeText(item) === normalizeText(textValue))
    ) {
      values.push(textValue);
    }
  };

  const getDepartmentQueryValues = (departments) => {
    const queryValues = [];

    normalizeArray(departments).forEach((department) => {
      pushUniqueQueryValue(queryValues, department?.departmentCode);
      pushUniqueQueryValue(queryValues, department?.deptCode);
      pushUniqueQueryValue(queryValues, department?.depCode);
      pushUniqueQueryValue(queryValues, department?.departmentName);
      pushUniqueQueryValue(queryValues, department?.deptName);
      pushUniqueQueryValue(queryValues, department?.depName);
      pushUniqueQueryValue(queryValues, department?.name);
    });

    return queryValues;
  };

  const getDepartmentQueryValuesFromRow = (item) => {
    const queryValues = [];

    pushUniqueQueryValue(queryValues, item?.departmentCode);
    pushUniqueQueryValue(queryValues, item?.deptCode);
    pushUniqueQueryValue(queryValues, item?.depCode);
    pushUniqueQueryValue(queryValues, item?.departmentName);
    pushUniqueQueryValue(queryValues, item?.deptName);
    pushUniqueQueryValue(queryValues, item?.depName);

    return queryValues;
  };

  const buildDepartmentAccess = (profile) => {
    const assignedDepartments = getAssignedDepartments(profile);

    if (assignedDepartments.length) {
      return {
        isRestricted: true,
        departments: assignedDepartments,
        queryValues: getDepartmentQueryValues(assignedDepartments),
      };
    }

    if (userCanSeeAllDepartments(profile)) {
      return { isRestricted: false, departments: [], queryValues: [""] };
    }

    // WEB FIX:
    // If profile has no roles/departments, do not block data.
    // This prevents all 0 values when localStorage only has token/userName.
    return { isRestricted: false, departments: [], queryValues: [""] };
  };

  const rowMatchesDepartmentAccess = (row, access) => {
    if (!access?.isRestricted) return true;
    if (!access?.departments?.length) return false;

    const rowDepartmentCode = normalizeText(
      row?.departmentCode || row?.deptCode || row?.depCode
    );

    const rowDepartmentName = normalizeText(
      row?.departmentName || row?.deptName || row?.depName
    );

    if (!rowDepartmentCode && !rowDepartmentName) return true;

    return access.departments.some((department) => {
      const allowedCodes = [
        department?.departmentCode,
        department?.deptCode,
        department?.depCode,
      ].map(normalizeText);

      const allowedNames = [
        department?.departmentName,
        department?.deptName,
        department?.depName,
        department?.name,
      ].map(normalizeText);

      const allowedValues = [...allowedCodes, ...allowedNames].filter(Boolean);

      return (
        allowedValues.includes(rowDepartmentCode) ||
        allowedValues.includes(rowDepartmentName)
      );
    });
  };

  const getBlSummaryUrl = (deptName) => {
    const query = String(deptName || "").trim();

    return query
      ? `${API_BASE_URL}/api/Export/Get-Pending-BL-Date-Count?depName=${encodeURIComponent(
          query
        )}`
      : `${API_BASE_URL}/api/Export/Get-Pending-BL-Date-Count`;
  };

  const getUniqueBlSummaryKey = (item, index) => {
    const keyValue = [
      item?.departmentCode,
      item?.departmentName,
      item?.customerCode,
      item?.customerName,
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join("|");

    return normalizeText(keyValue) || `row-${index}`;
  };

  const mergeBlSummaryRows = (rows) => {
    const rowMap = {};

    normalizeArray(rows).forEach((row, index) => {
      const key = getUniqueBlSummaryKey(row, index);
      const pendingCount = getNumber(row?.pendingBLDateCount || row?.pendingBL);
      const totalValue = getNumber(row?.totalValue);

      if (!rowMap[key]) {
        rowMap[key] = { ...row };
        return;
      }

      rowMap[key] = {
        ...rowMap[key],
        ...row,
        pendingBLDateCount: Math.max(
          getNumber(rowMap[key]?.pendingBLDateCount || rowMap[key]?.pendingBL),
          pendingCount
        ),
        pendingBL: Math.max(
          getNumber(rowMap[key]?.pendingBLDateCount || rowMap[key]?.pendingBL),
          pendingCount
        ),
        totalValue: Math.max(getNumber(rowMap[key]?.totalValue), totalValue),
      };
    });

    return Object.values(rowMap);
  };

  const getUniqueBlDetailKey = (item, index) => {
    const keyValue =
      item?.expDocumentNo ||
      item?.exportDocumentNo ||
      item?.packagingListNo ||
      item?.recId ||
      item?.id ||
      "";

    return normalizeText(keyValue) || `row-${index}`;
  };

  const removeDuplicateBlDetails = (rows) => {
    const seenKeys = {};

    return normalizeArray(rows).filter((item, index) => {
      const key = getUniqueBlDetailKey(item, index);

      if (seenKeys[key]) return false;

      seenKeys[key] = true;
      return true;
    });
  };

  const getBlListUrl = (deptCode = "", selectedFromDate = "", selectedToDate = "") => {
    const params = [
      `depName=${encodeURIComponent(deptCode || "")}`,
      `fromDate=${encodeURIComponent(selectedFromDate || "")}`,
      `toDate=${encodeURIComponent(selectedToDate || "")}`,
    ];

    return `${API_BASE_URL}/api/Export/Get-By-Dept-Bl-Date-List?${params.join(
      "&"
    )}`;
  };

  const fetchBlSummary = async () => {
    setBlLoading(true);
    setError("");

    try {
      const { profile } = await fetchLoggedInUserProfile();
      const access = buildDepartmentAccess(profile);
      const queryValues = access.isRestricted ? access.queryValues : [""];

      console.log("BL department access:", access);

      if (access.isRestricted && !queryValues.length) {
        setBlSummaryData([]);
        setFilteredBlData([]);
        setBlCurrentPage(1);
        return;
      }

      let mergedRows = [];

      for (const queryValue of queryValues.length ? queryValues : [""]) {
        const data = await fetchJsonWithAuth(getBlSummaryUrl(queryValue));

        const dataArray = normalizeArray(data).filter((item) =>
          rowMatchesDepartmentAccess(item, access)
        );

        mergedRows = [...mergedRows, ...dataArray];
      }

      const dataArray = mergeBlSummaryRows(mergedRows);

      const pendingBlDepartments = dataArray
        .filter((item) => getNumber(item?.pendingBLDateCount || item?.pendingBL) > 0)
        .map((item) => ({
          ...item,
          pendingBL: getNumber(item?.pendingBLDateCount || item?.pendingBL),
          customerName: item?.customerName || item?.departmentName || "Unknown",
          departmentName: item?.departmentName || item?.departmentCode || "-",
          departmentCode: item?.departmentCode || "",
          totalValue: getNumber(item?.totalValue),
        }))
        .sort((a, b) => (b?.pendingBL || 0) - (a?.pendingBL || 0));

      setBlSummaryData(pendingBlDepartments);
      setFilteredBlData(pendingBlDepartments);
      setBlCurrentPage(1);
    } catch (error) {
      console.error("Error fetching B/L pending summary:", error);
      setError(`Failed to load B/L data: ${error.message}`);
      setBlSummaryData([]);
      setFilteredBlData([]);
      setBlCurrentPage(1);
    } finally {
      setBlLoading(false);
    }
  };

  const parseDateString = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("-");
    if (parts.length !== 3) return null;
    return new Date(parts[2], parts[1] - 1, parts[0]);
  };

  const getDateOnly = (date) => {
    if (!date || Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const filterBySelectedDates = (data) => {
    if (!Array.isArray(data)) return [];

    const fromDateObj = getDateOnly(parseDateString(fromDate));
    const toDateObj = getDateOnly(parseDateString(toDate));

    if (!fromDateObj && !toDateObj) return data;

    return data.filter((item) => {
      if (!item?.exFacDate) return false;

      const itemDate = getDateOnly(new Date(item.exFacDate));

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
        item.expDocumentNo?.toString().toLowerCase().includes(searchLower) ||
        item.packagingListNo?.toString().toLowerCase().includes(searchLower) ||
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.departmentName?.toLowerCase().includes(searchLower) ||
        item.noOfPcs?.toString().toLowerCase().includes(searchLower) ||
        item.totalValue?.toString().toLowerCase().includes(searchLower)
    );
  };

  const fetchModalExportData = async (item) => {
    const deptQueries = getDepartmentQueryValuesFromRow(item);

    const deptName =
      item?.customerName && item?.departmentName
        ? `${item.customerName} • ${item.departmentName}`
        : getDisplayName(item);

    setModalLoading(true);
    setModalSearchText("");
    setModalCurrentPage(1);
    setModalDepartmentName(deptName);
    setShowDetailsModal(true);

    try {
      const { profile } = await fetchLoggedInUserProfile();
      const access = buildDepartmentAccess(profile);

      const queryValues = deptQueries.length
        ? deptQueries
        : access.isRestricted
        ? access.queryValues
        : [""];

      if (access.isRestricted && !queryValues.length) {
        setModalExportData([]);
        setModalFilteredData([]);
        return;
      }

      let mergedRows = [];

      for (const queryValue of queryValues.length ? queryValues : [""]) {
        const data = await fetchJsonWithAuth(getBlListUrl(queryValue, fromDate, toDate));

        const dataArray = normalizeArray(data).filter((row) =>
          rowMatchesDepartmentAccess(row, access)
        );

        mergedRows = [...mergedRows, ...dataArray];
      }

      const uniqueRows = removeDuplicateBlDetails(mergedRows);
      const dateFilteredArray = filterBySelectedDates(uniqueRows);

      setModalExportData(dateFilteredArray);
      setModalFilteredData(dateFilteredArray);
    } catch (error) {
      console.error("Fetch B/L modal error:", error);
      setModalExportData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalSearch = (text) => {
    setModalSearchText(text);
    setModalCurrentPage(1);
    setModalFilteredData(filterDataBySearch(modalExportData, text));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchBlSummary();
    setRefreshing(false);
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

  const blSafeFilteredData = Array.isArray(filteredBlData) ? filteredBlData : [];

  const blTotalPages = Math.ceil(blSafeFilteredData.length / blItemsPerPage) || 1;

  const blCurrentPageData = blSafeFilteredData.slice(
    (blCurrentPage - 1) * blItemsPerPage,
    blCurrentPage * blItemsPerPage
  );

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];

  const modalTotalPages =
    Math.ceil(modalSafeFilteredData.length / modalItemsPerPage) || 1;

  const modalCurrentPageData = modalSafeFilteredData.slice(
    (modalCurrentPage - 1) * modalItemsPerPage,
    modalCurrentPage * modalItemsPerPage
  );

  const totalPendingBl = blSafeFilteredData.reduce(
    (sum, item) => sum + (item.pendingBL || 0),
    0
  );

  const totalDepartmentCount = blSafeFilteredData.length;

  const maxPending =
    blSafeFilteredData.length > 0
      ? Math.max(...blSafeFilteredData.map((item) => item?.pendingBL || 0))
      : 0;

  const sortedPendingData = [...blSafeFilteredData].sort(
    (a, b) => (b?.pendingBL || 0) - (a?.pendingBL || 0)
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

  const cardIcons = ["🚢", "📦", "🏬", "📄", "🛒", "🏭", "🧾", "⚓"];

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

  const handleBlSearch = (text) => {
    setBlCurrentPage(1);

    if (!Array.isArray(blSummaryData)) {
      setFilteredBlData([]);
      return;
    }

    const searchLower = text.toLowerCase();

    const filtered = blSummaryData.filter(
      (item) =>
        item.customerName?.toLowerCase().includes(searchLower) ||
        item.departmentCode?.toLowerCase().includes(searchLower) ||
        item.departmentName?.toLowerCase().includes(searchLower)
    );

    setFilteredBlData(filtered);
  };

  const hasActiveFilters = fromDate !== "" || toDate !== "";

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] text-slate-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12 space-y-5">
        <div className="rounded-3xl bg-[#101827] border border-white/10 p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                B/L Date Check
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Converted from React Native B/L screen using same APIs.
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || blLoading}
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
                <FilterBadge label={`From: ${fromDate}`} onClear={() => setFromDate("")} />
              )}

              {toDate && (
                <FilterBadge label={`To: ${toDate}`} onClear={() => setToDate("")} />
              )}

              <button
                type="button"
                onClick={() => {
                  setFromDate("");
                  setToDate("");
                  setTimeout(fetchBlSummary, 100);
                }}
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
              <h2 className="text-xl font-black text-white">🚢 B/L Pending Summary</h2>
              <p className="text-xs text-slate-400 mt-1">
                Overview by assigned department
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SummaryPill label="Departments" value={totalDepartmentCount} />
              <SummaryPill label="Total Pending" value={totalPendingBl} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 sm:px-5 pb-4">
            <StatCard
              icon="🏢"
              value={totalDepartmentCount}
              title="Departments"
              subtitle="Assigned departments with pending B/L"
              variant="blue"
            />

            <StatCard
              icon="🚢"
              value={totalPendingBl}
              title="Total Pending B/L"
              subtitle="Pending B/L date count"
              variant="green"
            />
          </div>

          {!blLoading && blSafeFilteredData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mx-4 sm:mx-5 mb-5 rounded-3xl bg-[#101a3f] border border-white/10 p-3">
              <InsightCard
                title="Highest Pending"
                item={highestPendingItem}
                count={highestPendingItem?.pendingBL || 0}
                countClass="bg-red-500"
                onClick={() => highestPendingItem && fetchModalExportData(highestPendingItem)}
              />

              <InsightCard
                title="Lowest Pending"
                item={lowestPendingItem}
                count={lowestPendingItem?.pendingBL || 0}
                countClass="bg-emerald-500"
                onClick={() => lowestPendingItem && fetchModalExportData(lowestPendingItem)}
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
                  Click any card for B/L details
                </p>
              </div>

              <SearchBox placeholder="Search department..." onChange={handleBlSearch} />
            </div>

            {blLoading ? (
              <div className="py-16 text-center text-slate-400">
                Loading B/L pending summary...
              </div>
            ) : blCurrentPageData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {blCurrentPageData.map((item, index) => {
                    const pending = item?.pendingBL || 0;
                    const accentColor = cardAccentColors[index % cardAccentColors.length];
                    const icon = cardIcons[index % cardIcons.length];
                    const percentage = getPendingPercentage(pending);
                    const statusMeta = getStatusMeta(pending);

                    return (
                      <button
                        key={`${item?.departmentCode || item?.departmentName || index}-${index}`}
                        type="button"
                        onClick={() => fetchModalExportData(item)}
                        className="relative overflow-hidden rounded-2xl bg-[#161b26] border border-[#293244] p-4 text-left shadow-lg hover:border-blue-500/50 hover:bg-[#1a2232] transition"
                        style={{ borderLeftWidth: 4, borderLeftColor: accentColor }}
                      >
                        <div
                          className="absolute -top-8 -right-8 h-20 w-20 rounded-full opacity-20"
                          style={{ backgroundColor: accentColor }}
                        />

                        <div className="relative flex items-start gap-3 mb-4">
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center text-lg"
                            style={{ backgroundColor: `${accentColor}2b` }}
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
                  currentPage={blCurrentPage}
                  totalPages={blTotalPages}
                  itemsPerPage={blItemsPerPage}
                  setItemsPerPage={setBlItemsPerPage}
                  onPageChange={setBlCurrentPage}
                  totalItems={blSafeFilteredData.length}
                />
              </>
            ) : (
              <div className="py-16 text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-sm font-bold text-slate-200">
                  No pending B/L found
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  All B/L dates are up to date
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

function InsightCard({ title, item, count, countClass, onClick }) {
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
        {count}
      </span>
    </button>
  );
}

function SearchBox({ placeholder, onChange }) {
  const [value, setValue] = useState("");

  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          🔍
        </span>

        <input
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            onChange(e.target.value);
          }}
          placeholder={placeholder}
          className="w-full sm:w-72 rounded-2xl bg-[#1e293b] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {value && (
        <button
          type="button"
          onClick={() => {
            setValue("");
            onChange("");
          }}
          className="rounded-2xl bg-pink-500/10 border border-pink-500/30 px-4 py-2.5 text-sm font-bold text-pink-300"
        >
          Clear
        </button>
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
              🚢
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-lg font-black text-white">{title}</h3>
              <p className="truncate text-xs text-slate-400">
                {fromDate || toDate
                  ? `${fromDate || "Start"} → ${toDate || "Today"}`
                  : "All B/L records"}
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

        {totalRecords > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 px-5 py-4">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                🔍
              </span>

              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search export no, customer, department..."
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
        )}

        {loading ? (
          <div className="m-5 flex flex-1 items-center justify-center rounded-3xl bg-[#111827] text-slate-400">
            Loading B/L records...
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
                  key={`${item?.expDocumentNo || index}-${index}`}
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
                        {item.expDocumentNo || item.packagingListNo || "-"}
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
                      ${item.totalValue ? Number(item.totalValue).toLocaleString() : "0"}
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
            <h3 className="text-base font-black text-white">No B/L records found</h3>
            <p className="text-xs text-slate-400 mt-1">
              Try changing the selected date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BLDateCheckPage;
