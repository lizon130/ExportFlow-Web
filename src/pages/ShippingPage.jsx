import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://192.168.9.45:7000";

function ShippingPage() {
  const [refreshing, setRefreshing] = useState(false);

  const [shippingSummaryData, setShippingSummaryData] = useState([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingCurrentPage, setShippingCurrentPage] = useState(1);
  const [shippingItemsPerPage, setShippingItemsPerPage] = useState(20);

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalShippingData, setModalShippingData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalSearchText, setModalSearchText] = useState("");

  const [searchText, setSearchText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchShippingSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const totalPages = Math.ceil(
      (Array.isArray(modalFilteredData) ? modalFilteredData.length : 0) /
        modalItemsPerPage
    );

    if (totalPages > 0 && modalCurrentPage > totalPages) {
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

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const getUniqueRowKey = (item, index) =>
    normalizeText(
      item?.shippingId ||
        item?.expDocumentNo ||
        item?.exportDocumentNo ||
        item?.packagingListNo ||
        item?.packingListNo ||
        item?.departmentCode ||
        item?.departmentName ||
        item?.customerName ||
        item?.recId ||
        item?.id ||
        `row-${index}`
    );

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
    } catch (storageError) {
      console.log(`Unable to read ${key} from storage`, storageError);
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

  const getAccessTokenFromPayload = (payload) =>
    payload?.accessToken ||
    payload?.token ||
    payload?.jwtToken ||
    payload?.data?.accessToken ||
    payload?.user?.accessToken ||
    "";

  const getToken = () => {
    const localUser = getStoredJsonValue("user");
    const userData = getStoredJsonValue("userData");
    const authData = getStoredJsonValue("authData");

    return (
      localStorage.getItem("accessToken") ||
      localStorage.getItem("token") ||
      getAccessTokenFromPayload(localUser) ||
      getAccessTokenFromPayload(userData) ||
      getAccessTokenFromPayload(authData) ||
      ""
    );
  };

  const getUserIdFromPayload = (payload) =>
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
    null;

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

  const getProfileFromPayload = (payload) => {
    if (!payload) return null;

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

  const getAuthHeaders = () => {
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

  const fetchLoggedInUserProfile = async () => {
    const storedPayload = getStoredAuthPayload();
    const profileFromPayload = getProfileFromPayload(storedPayload);

    if (profileFromPayload) return profileFromPayload;

    const userId = getUserIdFromTokenOrStorage();

    if (!userId) {
      console.warn("Shipping access: logged-in user id not found");
      return storedPayload || null;
    }

    try {
      return await fetchJsonWithAuth(
        `${API_BASE_URL}/api/User/${encodeURIComponent(userId)}/profile`
      );
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

    // If user has assigned departments, only load those.
    if (assignedDepartments.length) return assignedDepartments;

    // No assigned department means unrestricted access.
    // Do not call depName=All Departments.
    return [];
  };

  const buildDepartmentEndpointUrl = (endpoint, queryValue = "") => {
    const cleanQueryValue = String(queryValue || "").trim();

    if (!cleanQueryValue) return `${API_BASE_URL}${endpoint}`;

    const separator = endpoint.includes("?") ? "&" : "?";

    return `${API_BASE_URL}${endpoint}${separator}depName=${encodeURIComponent(
      cleanQueryValue
    )}`;
  };

  const fetchRowsForDepartment = async (endpoint, department) => {
    const queryValues = department ? getDepartmentQueryValues(department) : [""];
    const finalQueryValues = queryValues.length ? queryValues : [""];

    for (const queryValue of finalQueryValues) {
      const url = buildDepartmentEndpointUrl(endpoint, queryValue);
      const rows = normalizeArray(await fetchJsonWithAuth(url));

      // Use first matching query that returns data.
      // This prevents double count when both departmentCode and name return same rows.
      if (rows.length || !queryValue) return rows;
    }

    return [];
  };

  const fetchRowsForAuthorizedDepartments = async (endpoint) => {
    const authorizedDepartments = await getAuthorizedDepartments();

    if (!authorizedDepartments.length) {
      return removeDuplicateRows(await fetchRowsForDepartment(endpoint, null));
    }

    let mergedRows = [];

    for (const department of authorizedDepartments) {
      const rows = await fetchRowsForDepartment(endpoint, department);
      mergedRows = [...mergedRows, ...rows];
    }

    return removeDuplicateRows(mergedRows);
  };

  const fetchShippingSummary = async () => {
    setShippingLoading(true);
    setError("");

    try {
      const dataArray = await fetchRowsForAuthorizedDepartments(
        "/api/Export/Get-Pending-Shipping-Date-Count"
      );

      const pendingShippingDepartments = dataArray
        .filter((item) => (item?.pendingShippingDateCount || 0) > 0)
        .map((item, index) => ({
          ...item,
          departmentId: item?.departmentId || item?.recId || index + 1,
          pendingShipping: item?.pendingShippingDateCount || 0,
          customerName: item?.customerName || item?.departmentName || "Unknown",
          departmentName: item?.departmentName || item?.departmentCode || "-",
          departmentCode: item?.departmentCode || "",
          totalValue: item?.totalValue || 0,
        }))
        .sort(
          (a, b) => (b?.pendingShipping || 0) - (a?.pendingShipping || 0)
        );

      setShippingSummaryData(pendingShippingDepartments);
      setShippingCurrentPage(1);
    } catch (fetchError) {
      console.error("Error fetching restricted pending shipping summary:", fetchError);
      setShippingSummaryData([]);
      setShippingCurrentPage(1);
      setError(`Network error: ${fetchError.message}`);
    } finally {
      setShippingLoading(false);
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

  const filterBySelectedDates = (data) => {
    if (!Array.isArray(data)) return [];

    const fromDateObj = fromDate ? parseDateString(fromDate) : null;
    const toDateObj = toDate ? parseDateString(toDate) : null;

    if (toDateObj) {
      toDateObj.setHours(23, 59, 59, 999);
    }

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
        item?.packagingListNo?.toString().toLowerCase().includes(searchLower) ||
        item?.expDocumentNo?.toString().toLowerCase().includes(searchLower) ||
        item?.customerName?.toLowerCase().includes(searchLower) ||
        item?.departmentName?.toLowerCase().includes(searchLower)
    );
  };

  const fetchModalShippingData = async (deptCode, deptName) => {
    setModalLoading(true);
    setModalSearchText("");

    try {
      const dataArray = await fetchRowsForDepartment(
        "/api/Export/Get-By-Dept-Shipping-Date-List",
        {
          departmentCode: deptCode,
          departmentName: deptName,
        }
      );

      const dateFilteredData = filterBySelectedDates(dataArray);

      setModalShippingData(dateFilteredData);
      setModalFilteredData(dateFilteredData);
      setModalCurrentPage(1);
      setModalDepartmentName(deptName || "Unknown Department");
    } catch (fetchError) {
      console.error("Shipping modal fetch error:", fetchError);
      setModalShippingData([]);
      setModalFilteredData([]);
      setModalCurrentPage(1);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = async (item) => {
    const displayTitle =
      item?.customerName && item?.departmentName
        ? `${item.customerName} • ${item.departmentName}`
        : getDisplayName(item);

    setModalDepartmentName(displayTitle);
    setShowDetailsModal(true);
    await fetchModalShippingData(
      item?.departmentCode,
      item?.departmentName || displayTitle
    );
  };

  const handleModalSearch = (text) => {
    setModalSearchText(text);
    setModalCurrentPage(1);

    if (!Array.isArray(modalShippingData)) {
      setModalFilteredData([]);
      return;
    }

    setModalFilteredData(filterDataBySearch(modalShippingData, text));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchShippingSummary();
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

  const shippingSafeData = Array.isArray(shippingSummaryData)
    ? shippingSummaryData
    : [];

  const filteredShippingData = useMemo(() => {
    if (!searchText.trim()) return shippingSafeData;

    const key = searchText.toLowerCase();

    return shippingSafeData.filter(
      (item) =>
        item?.customerName?.toLowerCase().includes(key) ||
        item?.departmentName?.toLowerCase().includes(key) ||
        item?.departmentCode?.toLowerCase().includes(key)
    );
  }, [shippingSafeData, searchText]);

  const shippingTotalPages =
    Math.ceil(filteredShippingData.length / shippingItemsPerPage) || 1;

  const shippingCurrentPageData = filteredShippingData.slice(
    (shippingCurrentPage - 1) * shippingItemsPerPage,
    shippingCurrentPage * shippingItemsPerPage
  );

  const totalPendingShipping = filteredShippingData.reduce(
    (sum, item) => sum + (item?.pendingShipping || 0),
    0
  );

  const totalDepartmentCount = filteredShippingData.length;

  const maxPendingShipping =
    filteredShippingData.length > 0
      ? Math.max(...filteredShippingData.map((item) => item?.pendingShipping || 0))
      : 0;

  const sortedPendingShippingData = [...filteredShippingData].sort(
    (a, b) => (b?.pendingShipping || 0) - (a?.pendingShipping || 0)
  );

  const highestPendingItem = sortedPendingShippingData[0] || null;

  const lowestPendingItem = sortedPendingShippingData.length
    ? sortedPendingShippingData[sortedPendingShippingData.length - 1]
    : null;

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];

  const modalTotalPages =
    Math.ceil(modalSafeFilteredData.length / modalItemsPerPage) || 1;

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

  const cardIcons = ["🚢", "📦", "🏬", "🛳️", "📑", "🏭", "🚚", "📤"];

  const getDisplayName = (item) =>
    item?.customerName || item?.departmentName || "Unknown";

  const getDepartmentSubText = (item) =>
    item?.departmentName || item?.departmentCode || "-";

  const getPendingPercentage = (pending) => {
    if (!maxPendingShipping || maxPendingShipping <= 0) return 0;
    return Math.min(100, Math.round((pending / maxPendingShipping) * 100));
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

  const hasActiveFilters = fromDate !== "" || toDate !== "";

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] text-slate-100 px-3 py-4 sm:p-5 lg:p-6">
      <div className="w-full my-12 space-y-5">
        <div className="rounded-3xl bg-[#101827] border border-white/10 p-4 sm:p-5 shadow-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                Shipping
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Converted from React Native Shipping screen using the same APIs.
              </p>
            </div>

            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || shippingLoading}
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
                  setTimeout(fetchShippingSummary, 100);
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
              <h2 className="text-xl font-black text-white">🚢 Shipping Summary</h2>
              <p className="text-xs text-slate-400 mt-1">
                Overview by active department
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <SummaryPill label="Departments" value={totalDepartmentCount} />
              <SummaryPill label="Total Pending" value={totalPendingShipping} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4 sm:px-5 pb-4">
            <StatCard
              icon="🏢"
              value={totalDepartmentCount}
              title="Departments"
              subtitle="Departments with pending shipping"
              variant="blue"
            />

            <StatCard
              icon="🚢"
              value={totalPendingShipping}
              title="Total Shipping"
              subtitle="Pending shipping dates"
              variant="green"
            />
          </div>

          {!shippingLoading && filteredShippingData.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mx-4 sm:mx-5 mb-5 rounded-3xl bg-[#101a3f] border border-white/10 p-3">
              <InsightCard
                title="Highest Pending"
                item={highestPendingItem}
                count={highestPendingItem?.pendingShipping || 0}
                countClass="bg-red-500"
                onClick={() => highestPendingItem && handleCardClick(highestPendingItem)}
              />

              <InsightCard
                title="Lowest Pending"
                item={lowestPendingItem}
                count={lowestPendingItem?.pendingShipping || 0}
                countClass="bg-emerald-500"
                onClick={() => lowestPendingItem && handleCardClick(lowestPendingItem)}
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
                  Click any card for shipping details
                </p>
              </div>

              <SearchBox
                value={searchText}
                setValue={(value) => {
                  setSearchText(value);
                  setShippingCurrentPage(1);
                }}
                placeholder="Search department..."
              />
            </div>

            {shippingLoading ? (
              <div className="py-16 text-center text-slate-400">
                Loading pending shipping...
              </div>
            ) : shippingCurrentPageData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                  {shippingCurrentPageData.map((item, index) => {
                    const pending = item?.pendingShipping || 0;
                    const accentColor = cardAccentColors[index % cardAccentColors.length];
                    const icon = cardIcons[index % cardIcons.length];
                    const percentage = getPendingPercentage(pending);
                    const statusMeta = getStatusMeta(pending);

                    return (
                      <button
                        key={`${item?.departmentCode || item?.customerName || index}-${index}`}
                        type="button"
                        onClick={() => handleCardClick(item)}
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
                  currentPage={shippingCurrentPage}
                  totalPages={shippingTotalPages}
                  itemsPerPage={shippingItemsPerPage}
                  setItemsPerPage={setShippingItemsPerPage}
                  onPageChange={setShippingCurrentPage}
                  totalItems={filteredShippingData.length}
                />
              </>
            ) : (
              <div className="py-16 text-center">
                <div className="text-4xl mb-2">✅</div>
                <h3 className="text-sm font-bold text-slate-200">
                  No pending shipping found
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  No pending shipping dates found
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
            setModalFilteredData(modalShippingData);
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

function SearchBox({ value, setValue, placeholder }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          🔍
        </span>

        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          className="w-full sm:w-72 rounded-2xl bg-[#1e293b] border border-white/10 pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {value && (
        <button
          type="button"
          onClick={() => setValue("")}
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
                  : "All pending shipping records"}
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
                placeholder="Search packing, export no, department..."
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
            Loading shipping records...
          </div>
        ) : data.length > 0 ? (
          <div className="mx-5 mb-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0f172a]">
            <div className="grid grid-cols-[1.6fr_0.9fr_0.8fr] bg-[#16213d] border-b border-white/10">
              <div className="px-4 py-3 text-xs font-black uppercase text-slate-300">
                Document
              </div>
              <div className="px-4 py-3 text-xs font-black uppercase text-slate-300">
                Qty / Value
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

                    <p className="truncate text-xs font-bold text-violet-300">
                      {item.expDocumentNo || "-"}
                    </p>

                    <p className="truncate text-xs font-bold text-blue-300">
                      {item.customerName || "-"}
                    </p>

                    <p className="truncate text-[11px] font-bold text-slate-400">
                      {item.departmentName || "-"}
                    </p>
                  </div>

                  <div className="px-4 py-3">
                    <p className="text-xs font-black text-white">
                      {item.noOfCarton ? Number(item.noOfCarton).toLocaleString() : "0"} ctn
                    </p>

                    <p className="mt-1 text-[11px] font-bold text-slate-300">
                      {item.noOfPcs ? Number(item.noOfPcs).toLocaleString() : "0"} pcs
                    </p>

                    <p className="mt-1 text-xs font-black text-emerald-300">
                      {item.totalValue ? Number(item.totalValue).toLocaleString() : "0"}
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
            <div className="text-4xl mb-3">🚢</div>
            <h3 className="text-base font-black text-white">
              No shipping records found
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

export default ShippingPage;
