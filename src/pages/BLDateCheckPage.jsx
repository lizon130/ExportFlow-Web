import React, { useEffect, useState } from "react";

const API_BASE_URL = "http://192.168.9.45:7000";

function BLDateCheckPage() {
  const [refreshing, setRefreshing] = useState(false);

  const [blSummaryData, setBlSummaryData] = useState([]);
  const [filteredBlData, setFilteredBlData] = useState([]);
  const [blLoading, setBlLoading] = useState(false);
  const [blCurrentPage, setBlCurrentPage] = useState(1);
  const [blItemsPerPage, setBlItemsPerPage] = useState(20);

  // dept = Department Wise, factory = Factory Wise
  const [viewMode, setViewMode] = useState("dept");

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

  // Total Pending modal
  const [showAllPendingModal, setShowAllPendingModal] = useState(false);
  const [allPendingLoading, setAllPendingLoading] = useState(false);
  const [allPendingRows, setAllPendingRows] = useState([]);
  const [allPendingSearchText, setAllPendingSearchText] = useState("");

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

  useEffect(() => {
    /*
      FIX:
      From Date / To Date must refresh the main summary cards too.
      Without this, only the modal detail list used the selected dates.
    */
    const timer = setTimeout(() => {
      fetchBlSummary();
    }, 250);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, viewMode]);

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
      "";

    if (keyValue) return normalizeText(keyValue);

    return (
      [
        item?.departmentCode,
        item?.departmentName,
        item?.customerCode,
        item?.customerName,
        item?.factoryCode,
        item?.exFacDate,
        item?.styleCode,
        item?.workOrderNo,
        item?.contractNo,
        item?.totalValue,
        item?.noOfPcs,
        item?.noOfCarton,
        item?.recId,
        item?.id,
      ]
        .map((value) => normalizeText(value))
        .filter(Boolean)
        .join("|") || `row-${index}`
    );
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

  const formatDisplayDateToApiDate = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const [dd, mm, yyyy] = String(ddmmyyyy).split("-");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm}-${dd}`;
  };

  const getBlListUrl = (deptCode = "", selectedFromDate = "", selectedToDate = "") => {
    /*
      FIX:
      UI stores dates as DD-MM-YYYY, but most .NET APIs expect YYYY-MM-DD.
      So we send API-safe dates while keeping UI display unchanged.
    */
    const apiFromDate = formatDisplayDateToApiDate(selectedFromDate);
    const apiToDate = formatDisplayDateToApiDate(selectedToDate);

    const params = [
      `depName=${encodeURIComponent(deptCode || "")}`,
      `fromDate=${encodeURIComponent(apiFromDate || "")}`,
      `toDate=${encodeURIComponent(apiToDate || "")}`,
    ];

    return `${API_BASE_URL}/api/Export/Get-By-Dept-Bl-Date-List?${params.join(
      "&"
    )}`;
  };

  const getFactoryBlListUrl = (
    factoryCode = "",
    selectedFromDate = "",
    selectedToDate = ""
  ) => {
    /*
      Factory Wise detail endpoint:
      /api/Export/Get-By-Factory-Bl-Date-List?depName=ttl

      depName is used by API as factoryCode.
      ttl / TTL both must work, so later we match factoryCode case-insensitively.
    */
    const apiFromDate = formatDisplayDateToApiDate(selectedFromDate);
    const apiToDate = formatDisplayDateToApiDate(selectedToDate);

    const params = [
      `depName=${encodeURIComponent(factoryCode || "")}`,
      `fromDate=${encodeURIComponent(apiFromDate || "")}`,
      `toDate=${encodeURIComponent(apiToDate || "")}`,
    ];

    return `${API_BASE_URL}/api/Export/Get-By-Factory-Bl-Date-List?${params.join(
      "&"
    )}`;
  };

  const getDateFilteredPendingCountForSummaryRow = async (summaryRow, access) => {
    /*
      FIX:
      The summary/count API does not receive From Date / To Date.
      So when date filter is active, calculate each card's pending count from
      Get-By-Dept-Bl-Date-List with selected dates.
    */
    const deptQueries = getDepartmentQueryValuesFromRow(summaryRow);
    const queryValues = deptQueries.length
      ? deptQueries
      : access.isRestricted
      ? access.queryValues
      : [""];

    let mergedRows = [];

    for (const queryValue of queryValues.length ? queryValues : [""]) {
      const listData = await fetchJsonWithAuth(getBlListUrl(queryValue, fromDate, toDate));

      const listArray = normalizeArray(listData).filter((row) =>
        rowMatchesDepartmentAccess(row, access)
      );

      mergedRows = [...mergedRows, ...listArray];
    }

    const uniqueRows = removeDuplicateBlDetails(mergedRows);
    const dateFilteredRows = filterBySelectedDates(uniqueRows, fromDate, toDate);

    return {
      pendingCount: dateFilteredRows.length,
      totalValue: dateFilteredRows.reduce(
        (sum, item) => sum + getNumber(item?.totalValue),
        0
      ),
    };
  };

  const applyDateFilterToBlSummaryRows = async (rows, access) => {
    if (!fromDate && !toDate) return rows;

    const dateFilteredRows = [];

    for (const row of rows) {
      try {
        const result = await getDateFilteredPendingCountForSummaryRow(row, access);

        if (result.pendingCount > 0) {
          dateFilteredRows.push({
            ...row,
            pendingBLDateCount: result.pendingCount,
            pendingBL: result.pendingCount,
            totalValue: result.totalValue,
          });
        }
      } catch (error) {
        console.error("Error applying B/L date filter to summary row:", error, row);
      }
    }

    return dateFilteredRows;
  };

  const getFactoryDisplayName = (item) => {
    const factoryCode = String(item?.factoryCode || "").trim();
    const factoryName = String(item?.factoryName || "").trim();

    if (
      factoryCode &&
      factoryName &&
      normalizeText(factoryCode) !== normalizeText(factoryName)
    ) {
      return `${factoryCode} • ${factoryName}`;
    }

    return factoryCode || factoryName || "Unknown Factory";
  };

  const buildFactoryWiseBlSummary = (rows) => {
    /*
      Factory wise implementation:
      - Groups B/L pending data by factoryCode.
      - Factory cards are summary only.
      - Factory cards will NOT open the details modal/list.
    */
    const factoryMap = new Map();

    normalizeArray(rows).forEach((item, index) => {
      const pendingCount = getNumber(item?.pendingBLDateCount || item?.pendingBL);
      if (pendingCount <= 0) return;

      const factoryCode =
        String(item?.factoryCode || "Unknown").trim() || "Unknown";
      const key = normalizeText(factoryCode) || `factory-${index}`;

      const current = factoryMap.get(key) || {
        ...item,
        isFactoryWise: true,
        factoryCode,
        factoryName: item?.factoryName || "",
        customerName: getFactoryDisplayName(item),
        departmentName: "Factory Wise Summary",
        departmentCode: factoryCode,
        pendingBLDateCount: 0,
        pendingBL: 0,
        totalValue: 0,
      };

      current.pendingBLDateCount += pendingCount;
      current.pendingBL += pendingCount;
      current.totalValue += getNumber(item?.totalValue);

      factoryMap.set(key, current);
    });

    return Array.from(factoryMap.values()).sort(
      (a, b) => (b?.pendingBL || 0) - (a?.pendingBL || 0)
    );
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
      const dateAwareDataArray = await applyDateFilterToBlSummaryRows(
        dataArray,
        access
      );

      const pendingBlDepartments =
        viewMode === "factory"
          ? buildFactoryWiseBlSummary(dateAwareDataArray)
          : dateAwareDataArray
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

  const filterBySelectedDates = (
    data,
    selectedFromDate = fromDate,
    selectedToDate = toDate
  ) => {
    if (!Array.isArray(data)) return [];

    const fromDateObj = getDateOnly(parseDateString(selectedFromDate));
    const toDateObj = getDateOnly(parseDateString(selectedToDate));

    if (!fromDateObj && !toDateObj) return data;

    return data.filter((item) => {
      const rawDate =
        item?.exFacDate ||
        item?.exFactoryDate ||
        item?.exfacDate ||
        item?.shipmentDate ||
        item?.createdDate ||
        item?.blDate;

      if (!rawDate) return false;

      const itemDate = getDateOnly(new Date(rawDate));

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
        item.departmentCode?.toLowerCase().includes(searchLower) ||
        item.factoryCode?.toLowerCase().includes(searchLower) ||
        item.exFactoryName?.toLowerCase().includes(searchLower) ||
        item.workOrderNo?.toLowerCase().includes(searchLower) ||
        item.contractNo?.toLowerCase().includes(searchLower) ||
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

  const fetchModalFactoryBlData = async (item) => {
    const factoryCode = item?.factoryCode || item?.departmentCode || "";
    const normalizedFactoryCode = normalizeText(factoryCode);

    setModalLoading(true);
    setModalSearchText("");
    setModalCurrentPage(1);
    setModalDepartmentName(
      `${factoryCode || "Unknown Factory"} • Factory B/L Pending Details`
    );
    setShowDetailsModal(true);

    try {
      const { profile } = await fetchLoggedInUserProfile();
      const access = buildDepartmentAccess(profile);

      const data = await fetchJsonWithAuth(
        getFactoryBlListUrl(factoryCode, fromDate, toDate)
      );

      const dataArray = normalizeArray(data).filter(
        (row) => normalizeText(row?.factoryCode) === normalizedFactoryCode
      );

      const accessFilteredArray = dataArray.filter((row) =>
        rowMatchesDepartmentAccess(row, access)
      );

      const uniqueRows = removeDuplicateBlDetails(accessFilteredArray);
      const dateFilteredArray = filterBySelectedDates(uniqueRows);

      setModalExportData(dateFilteredArray);
      setModalFilteredData(dateFilteredArray);
    } catch (error) {
      console.error("Fetch Factory B/L modal error:", error);
      setModalExportData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const buildAllPendingGroups = (rows) => {
    const groupMap = new Map();

    removeDuplicateBlDetails(rows).forEach((item, index) => {
      const factoryCode = String(
        item?.factoryCode || item?.exFactoryName || "Unknown Factory"
      ).trim();

      const customerName = String(
        item?.customerName || item?.customerCode || "Unknown Buyer"
      ).trim();

      const departmentName = String(
        item?.departmentName ||
          item?.departmentCode ||
          "Unknown Department"
      ).trim();

      const departmentCode = String(item?.departmentCode || "").trim();

      const documentNo = String(
        item?.expDocumentNo ||
          item?.exportDocumentNo ||
          item?.packagingListNo ||
          ""
      ).trim();

      const key =
        [
          normalizeText(factoryCode),
          normalizeText(customerName),
          normalizeText(departmentCode || departmentName),
        ].join("|") || `pending-group-${index}`;

      if (!groupMap.has(key)) {
        groupMap.set(key, {
          id: key,
          factoryCode,
          customerName,
          departmentName,
          departmentCode,
          documentNumbers: [],
          sourceRows: [],
        });
      }

      const currentGroup = groupMap.get(key);
      currentGroup.sourceRows.push(item);

      if (
        documentNo &&
        !currentGroup.documentNumbers.some(
          (value) => normalizeText(value) === normalizeText(documentNo)
        )
      ) {
        currentGroup.documentNumbers.push(documentNo);
      }
    });

    return Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        pendingCount:
          group.documentNumbers.length || group.sourceRows.length,
      }))
      .filter((group) => group.pendingCount > 0)
      .sort((a, b) => {
        const factoryCompare = a.factoryCode.localeCompare(b.factoryCode);
        if (factoryCompare !== 0) return factoryCompare;

        const buyerCompare = a.customerName.localeCompare(b.customerName);
        if (buyerCompare !== 0) return buyerCompare;

        return a.departmentName.localeCompare(b.departmentName);
      });
  };

  const handleTotalPendingClick = async () => {
    setShowAllPendingModal(true);
    setAllPendingLoading(true);
    setAllPendingRows([]);
    setAllPendingSearchText("");

    try {
      const { profile } = await fetchLoggedInUserProfile();
      const access = buildDepartmentAccess(profile);

      /*
        FIX:
        The previous code used depName="" for unrestricted/admin users.
        That can return an empty detail list even when pending data exists.

        Now the process is:
        1. Load Get-Pending-BL-Date-Count.
        2. Collect actual pending department codes.
        3. Call Get-By-Dept-Bl-Date-List for each department.
        4. Group by Factory + Buyer/Department.
      */
      let summaryRows = [];

      if (access.isRestricted) {
        if (!access.queryValues.length) {
          setAllPendingRows([]);
          return;
        }

        for (const queryValue of access.queryValues) {
          try {
            const summaryData = await fetchJsonWithAuth(
              getBlSummaryUrl(queryValue)
            );

            const rows = normalizeArray(summaryData).filter((row) =>
              rowMatchesDepartmentAccess(row, access)
            );

            summaryRows = [...summaryRows, ...rows];
          } catch (summaryError) {
            console.error(
              "Pending B/L summary request failed:",
              queryValue,
              summaryError
            );
          }
        }
      } else {
        const summaryData = await fetchJsonWithAuth(getBlSummaryUrl(""));
        summaryRows = normalizeArray(summaryData);
      }

      const pendingSummaryRows = mergeBlSummaryRows(summaryRows).filter(
        (row) =>
          getNumber(row?.pendingBLDateCount || row?.pendingBL) > 0
      );

      const departmentQueries = [];

      pendingSummaryRows.forEach((row) => {
        const queryValue =
          String(row?.departmentCode || "").trim() ||
          String(row?.departmentName || "").trim();

        if (
          queryValue &&
          !departmentQueries.some(
            (existing) =>
              normalizeText(existing) === normalizeText(queryValue)
          )
        ) {
          departmentQueries.push(queryValue);
        }
      });

      /*
        Restricted-user fallback:
        Use assigned department values if the summary rows do not contain
        a department code/name.
      */
      if (!departmentQueries.length && access.isRestricted) {
        access.queryValues.forEach((value) => {
          const queryValue = String(value || "").trim();

          if (
            queryValue &&
            !departmentQueries.some(
              (existing) =>
                normalizeText(existing) === normalizeText(queryValue)
            )
          ) {
            departmentQueries.push(queryValue);
          }
        });
      }

      let mergedRows = [];

      for (const departmentQuery of departmentQueries) {
        try {
          const detailData = await fetchJsonWithAuth(
            getBlListUrl(departmentQuery, fromDate, toDate)
          );

          const detailRows = normalizeArray(detailData)
            .filter((row) => rowMatchesDepartmentAccess(row, access))
            .filter((row) => !row?.blDate);

          mergedRows = [...mergedRows, ...detailRows];
        } catch (detailError) {
          console.error(
            "Pending B/L detail request failed:",
            departmentQuery,
            detailError
          );
        }
      }

      const uniqueRows = removeDuplicateBlDetails(mergedRows);
      const dateFilteredRows = filterBySelectedDates(
        uniqueRows,
        fromDate,
        toDate
      );

      setAllPendingRows(buildAllPendingGroups(dateFilteredRows));
    } catch (error) {
      console.error("Fetch all pending B/L error:", error);
      setAllPendingRows([]);
      setError(`Failed to load all pending B/L details: ${error.message}`);
    } finally {
      setAllPendingLoading(false);
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

  const getDisplayName = (item) => {
    if (viewMode === "factory" || item?.isFactoryWise) {
      return (
        item?.factoryCode ||
        item?.factoryName ||
        item?.customerName ||
        "Unknown Factory"
      );
    }

    return item?.customerName || item?.departmentName || "Unknown";
  };

  const getDepartmentSubText = (item) => {
    if (viewMode === "factory" || item?.isFactoryWise) {
      return item?.factoryName || "Factory Wise Summary";
    }

    return item?.departmentName || item?.departmentCode || "-";
  };

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
        item.departmentName?.toLowerCase().includes(searchLower) ||
        item.factoryCode?.toLowerCase().includes(searchLower) ||
        item.factoryName?.toLowerCase().includes(searchLower)
    );

    setFilteredBlData(filtered);
  };

  const normalizedAllPendingSearch = normalizeText(allPendingSearchText);

  const filteredAllPendingRows = allPendingRows.filter((item) => {
    if (!normalizedAllPendingSearch) return true;

    return [
      item?.factoryCode,
      item?.customerName,
      item?.departmentName,
      item?.departmentCode,
      ...(item?.documentNumbers || []),
    ].some((value) =>
      normalizeText(value).includes(normalizedAllPendingSearch)
    );
  });

  const filteredAllPendingCount = filteredAllPendingRows.reduce(
    (sum, item) => sum + getNumber(item?.pendingCount),
    0
  );

  const hasActiveFilters = fromDate !== "" || toDate !== "";

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-[#101827] border border-white/10 p-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

          </div>

          {/* Filters - Compact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                View By
              </label>
              <select
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value);
                  setBlCurrentPage(1);
                }}
                className="w-full rounded-xl bg-[#0b1220] border border-slate-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dept">Department Wise</option>
                <option value="factory">Factory Wise</option>
              </select>
            </div>

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
              <button
                type="button"
                onClick={fetchBlSummary}
                disabled={blLoading}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition"
              >
                {blLoading ? "Filtering..." : "Apply"}
              </button>

              {hasActiveFilters && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate("");
                      setToDate("");
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
              <h2 className="text-lg font-black text-white">📊 B/L Pending Summary</h2>
              <span className="text-xs text-slate-400">
                {viewMode === "factory" ? "Overview by factory" : "Overview by assigned department"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-500/10 rounded-full px-3 py-1 border border-blue-500/20">
                <span className="text-xs font-bold text-blue-300">
                  {viewMode === "factory" ? "Factories" : "Departments"}
                </span>
                <span className="text-sm font-black text-white">{totalDepartmentCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 rounded-full px-3 py-1 border border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-300">Pending</span>
                <span className="text-sm font-black text-white">{totalPendingBl}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
            <div className="rounded-xl bg-[#132238] border border-blue-500/20 px-3 py-2">
              <div className="text-lg font-black text-white">{totalDepartmentCount}</div>
              <div className="text-[10px] font-bold text-blue-300">
                {viewMode === "factory" ? "Factories" : "Departments"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleTotalPendingClick}
              className="rounded-xl bg-[#102a24] border border-emerald-500/20 px-3 py-2 text-left transition hover:bg-[#15372f] hover:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              title="Click to view all pending B/L documents"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-black text-white">
                    {totalPendingBl}
                  </div>
                  <div className="text-[10px] font-bold text-emerald-300">
                    Total Pending
                  </div>
                </div>

                <span className="text-sm text-emerald-300">↗</span>
              </div>
            </button>
            <div className="rounded-xl bg-[#2a1a2a] border border-pink-500/20 px-3 py-2">
              <div className="text-lg font-black text-white">
                {highestPendingItem?.pendingBL || 0}
              </div>
              <div className="text-[10px] font-bold text-pink-300">Highest</div>
            </div>
            <div className="rounded-xl bg-[#1a2a2a] border border-teal-500/20 px-3 py-2">
              <div className="text-lg font-black text-white">
                {lowestPendingItem?.pendingBL || 0}
              </div>
              <div className="text-[10px] font-bold text-teal-300">Lowest</div>
            </div>
          </div>

          {/* Search & Cards */}
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black text-white">
                {viewMode === "factory" ? "Pending by Factory" : "Pending by Department"}
              </h3>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  onChange={(e) => handleBlSearch(e.target.value)}
                  placeholder={viewMode === "factory" ? "Search factory..." : "Search department..."}
                  className="w-full sm:w-56 rounded-xl bg-[#1e293b] border border-white/10 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {blLoading ? (
              <div className="py-8 text-center text-slate-400 text-sm">{hasActiveFilters ? "Applying date filter..." : "Loading B/L pending summary..."}</div>
            ) : blCurrentPageData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {blCurrentPageData.map((item, index) => {
                    const pending = item?.pendingBL || 0;
                    const accentColor = cardAccentColors[index % cardAccentColors.length];
                    const icon = cardIcons[index % cardIcons.length];
                    const statusMeta = getStatusMeta(pending);

                    return (
                      <button
                        key={`${item?.factoryCode || item?.departmentCode || item?.departmentName || index}-${index}`}
                        type="button"
                        onClick={() => {
                          if (viewMode === "factory" || item?.isFactoryWise) {
                            fetchModalFactoryBlData(item);
                          } else {
                            fetchModalExportData(item);
                          }
                        }}
                        className="relative overflow-hidden rounded-xl bg-[#161b26] border border-[#293244] p-3 text-left shadow-lg transition-all group hover:border-blue-500/50 hover:bg-[#1a2232]"
                        title={
                          viewMode === "factory"
                            ? "Click to view factory B/L details"
                            : "Click to view details"
                        }
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
                  currentPage={blCurrentPage}
                  totalPages={blTotalPages}
                  itemsPerPage={blItemsPerPage}
                  setItemsPerPage={setBlItemsPerPage}
                  onPageChange={setBlCurrentPage}
                  totalItems={blSafeFilteredData.length}
                />
              </>
            ) : (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-sm font-bold text-slate-200">
                  {viewMode === "factory" ? "No pending factory summary found" : "No pending B/L found"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">All B/L dates are up to date</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showAllPendingModal && (
        <AllPendingBlModal
          loading={allPendingLoading}
          rows={filteredAllPendingRows}
          totalPending={filteredAllPendingCount}
          searchText={allPendingSearchText}
          setSearchText={setAllPendingSearchText}
          fromDate={fromDate}
          toDate={toDate}
          onClose={() => {
            setShowAllPendingModal(false);
            setAllPendingSearchText("");
          }}
        />
      )}

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

function AllPendingBlModal({
  loading,
  rows,
  totalPending,
  searchText,
  setSearchText,
  fromDate,
  toDate,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111c35] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
              🚢
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">
                All Pending B/L Documents
              </h3>
              <p className="truncate text-[10px] text-slate-400">
                {fromDate || toDate
                  ? `${fromDate || "Start"} → ${toDate || "Today"}`
                  : "All dates"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-300 transition hover:bg-red-500/20"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-4 pt-3">
          <div className="rounded-xl border border-blue-500/20 bg-[#132238] px-3 py-2">
            <div className="text-lg font-black text-white">{rows.length}</div>
            <div className="text-[10px] font-bold text-blue-300">
              Buyer / Departments
            </div>
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-[#102a24] px-3 py-2">
            <div className="text-lg font-black text-white">{totalPending}</div>
            <div className="text-[10px] font-bold text-emerald-300">
              Pending Documents
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">
              🔍
            </span>

            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search factory, buyer, department or document..."
              className="w-full rounded-xl border border-white/10 bg-[#111827] py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="mx-4 mb-4 flex flex-1 items-center justify-center rounded-xl bg-[#111827] text-sm text-slate-400">
            Loading all pending B/L documents...
          </div>
        ) : rows.length > 0 ? (
          <div className="mx-4 mb-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a]">
            <div className="sticky top-0 z-10 grid grid-cols-[0.7fr_1.2fr_2fr_0.5fr] border-b border-white/10 bg-[#16213d] text-[10px] font-bold uppercase text-slate-300">
              <div className="px-3 py-2">Factory</div>
              <div className="px-3 py-2">Buyer / Department</div>
              <div className="px-3 py-2">Pending Packing Lists</div>
              <div className="px-3 py-2 text-center">Count</div>
            </div>

            {rows.map((item, index) => (
              <div
                key={`${item?.id || index}-${index}`}
                className={`grid grid-cols-[0.7fr_1.2fr_2fr_0.5fr] border-b border-white/5 ${
                  index % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111c31]"
                }`}
              >
                <div className="px-3 py-3">
                  <span className="inline-flex rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-xs font-black text-amber-300">
                    {item?.factoryCode || "-"}
                  </span>
                </div>

                <div className="min-w-0 px-3 py-3">
                  <p className="truncate text-xs font-bold text-white">
                    {item?.customerName || "-"}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-bold text-blue-300">
                    {item?.departmentName || item?.departmentCode || "-"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 px-3 py-3">
                  {item?.documentNumbers?.length ? (
                    item.documentNumbers.map((documentNo) => (
                      <span
                        key={`${item?.id}-${documentNo}`}
                        className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-300"
                      >
                        {documentNo}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">
                      Document numbers not returned by API
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-center px-3 py-3">
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-black text-emerald-300">
                    {item?.pendingCount || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mx-4 mb-4 flex flex-1 flex-col items-center justify-center rounded-xl bg-[#111827] text-center">
            <div className="mb-2 text-3xl">📭</div>
            <h3 className="text-sm font-bold text-white">
              No pending B/L documents found
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Try clearing the search or changing the date range.
            </p>
          </div>
        )}
      </div>
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
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111c35] px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/20 text-base flex-shrink-0">
              {title?.toLowerCase().includes("factory") ? "🏭" : "🚢"}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-white">{title}</h3>
              <p className="truncate text-[10px] text-slate-400">
                {fromDate || toDate ? `${fromDate || "Start"} → ${toDate || "Today"}` : "All B/L records"}
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
                placeholder="Search export no, customer, department, factory, WO, contract..."
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
            Loading B/L records...
          </div>
        ) : data.length > 0 ? (
          <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]">
            <div className="grid grid-cols-[1.5fr_0.9fr_0.8fr_0.8fr] bg-[#16213d] border-b border-white/10 text-[10px] font-bold uppercase text-slate-300">
              <div className="px-3 py-2">Document / Department</div>
              <div className="px-3 py-2">Factory / Customer</div>
              <div className="px-3 py-2">Value / Pcs</div>
              <div className="px-3 py-2">Ex-Factory</div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {data.map((item, index) => (
                <div
                  key={`${item?.expDocumentNo || index}-${index}`}
                  className={`grid grid-cols-[1.5fr_0.9fr_0.8fr_0.8fr] border-b border-white/5 ${
                    index % 2 === 0 ? "bg-[#0f172a]" : "bg-[#111c31]"
                  }`}
                >
                  <div className="px-3 py-2 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[8px] font-bold text-blue-300 flex-shrink-0">
                        {(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                      <span className="truncate text-xs font-bold text-white">
                        {item.expDocumentNo || item.packagingListNo || "-"}
                      </span>
                    </div>
                    <p className="truncate text-[10px] font-bold text-blue-300 mt-0.5">
                      {item.departmentName || item.departmentCode || "-"}
                    </p>
                    {/* <p className="truncate text-[9px] font-bold text-slate-400">
                      WO: {item.workOrderNo || "-"} | Contract: {item.contractNo || "-"}
                    </p> */}
                  </div>

                  <div className="px-3 py-2 min-w-0">
                    <p className="truncate text-xs font-bold text-amber-300">
                      {item.factoryCode || item.exFactoryName || "-"}
                    </p>
                    <p className="truncate text-[10px] font-bold text-slate-300">
                      {item.customerName || item.customerCode || "-"}
                    </p>
                  </div>

                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-emerald-300">
                      ${item.totalValue ? Number(item.totalValue).toLocaleString() : "0"}
                    </p>
                    <p className="text-[10px] font-bold text-slate-300">
                      {item.noOfPcs ? Number(item.noOfPcs).toLocaleString() : "0"} pcs
                    </p>
                  </div>

                  <div className="px-3 py-2">
                    <p className="text-xs font-bold text-emerald-200">
                      {item.exFacDate ? item.exFacDate.split("T")[0] : "-"}
                    </p>
                    <p className="text-[9px] font-bold text-slate-400">
                      B/L: {item.blDate ? item.blDate.split("T")[0] : "-"}
                    </p>
                  </div>
                </div>
              ))}
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
            <div className="text-3xl mb-2">📭</div>
            <h3 className="text-sm font-bold text-white">No B/L records found</h3>
            <p className="text-xs text-slate-400 mt-0.5">Try changing the selected date range.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default BLDateCheckPage;