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

  // dept = Department Wise, factory = Factory Wise
  const [viewMode, setViewMode] = useState("dept");

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

  // Total Pending modal
  const [showAllPendingModal, setShowAllPendingModal] = useState(false);
  const [allPendingLoading, setAllPendingLoading] = useState(false);
  const [allPendingRows, setAllPendingRows] = useState([]);
  const [allPendingSearchText, setAllPendingSearchText] = useState("");

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

  const fetchRowsFromEndpointByFactory = async (
    endpoint,
    factoryCode,
    access = departmentAccess
  ) => {
    const queryText = String(factoryCode || "").trim();

    if (!queryText) return [];

    const url = `${API_BASE_URL}${endpoint}?depName=${encodeURIComponent(
      queryText
    )}`;

    try {
      const data = await fetchJsonWithAuth(url);

      const rows = normalizeArray(data).map((item) => ({
        ...item,
        __queryFactoryCode: queryText,
      }));

      /*
        Factory endpoint uses depName as factoryCode.
        Match case-insensitively so ttl, TTL, Ttl all return TTL rows.
      */
      const matchedRows = rows.filter(
        (item) => normalizeText(item?.factoryCode) === normalizeText(queryText)
      );

      if (access?.isRestricted && access?.keyValues?.length) {
        return matchedRows.filter((row) => isRowAllowedForAccess(row, access));
      }

      return matchedRows;
    } catch (error) {
      console.error("Factory API failed:", url, error);
      return [];
    }
  };

  const getUniqueExportDocumentKey = (item) => {
    const keyValue =
      item?.expDocumentNo ||
      item?.exportDocument ||
      item?.exportDocumentNo ||
      item?.packagingListNo ||
      item?.packingListNo ||
      "";

    if (keyValue) return normalizeText(keyValue);

    return [
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
      item?.recId,
      item?.id,
    ]
      .map((value) => normalizeText(value))
      .filter(Boolean)
      .join("|");
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

    const normalizedDeptCode = normalizeText(deptCode);
    const normalizedDeptName = normalizeText(deptName);

    const exactDepartmentRows = rows.filter((item) => {
      const rowDeptCode = normalizeText(item?.departmentCode);
      const rowDeptName = normalizeText(item?.departmentName);

      if (normalizedDeptCode && rowDeptCode) {
        return rowDeptCode === normalizedDeptCode;
      }

      if (normalizedDeptName && rowDeptName) {
        return rowDeptName === normalizedDeptName;
      }

      return isSameDepartment(item, deptCode, deptName);
    });

    return removeDuplicateExportDocuments(exactDepartmentRows);
  };

  const fetchFactoryExportDocuments = async (
    factoryCode,
    accessOverride = departmentAccess
  ) => {
    /*
      FIX:
      For factory card click, use the updated factory endpoint directly:
      /api/Export/Get-By-Factory-Export-Docment-List?depName=ttl

      Then match factoryCode case-insensitively.
      This fixes TTL card detail count mismatch. If API returns 11 TTL rows,
      modal will show 11 rows before any selected date filtering.
    */
    const rows = await fetchRowsFromEndpointByFactory(
      "/api/Export/Get-By-Factory-Export-Docment-List",
      factoryCode,
      accessOverride
    );

    return removeDuplicateExportDocuments(rows);
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
        item.departmentName?.toLowerCase().includes(searchLower) ||
        item.departmentCode?.toLowerCase().includes(searchLower) ||
        item.factoryCode?.toLowerCase().includes(searchLower) ||
        item.exFactoryName?.toLowerCase().includes(searchLower) ||
        item.workOrderNo?.toLowerCase().includes(searchLower) ||
        item.contractNo?.toLowerCase().includes(searchLower)
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

  const buildPendingFactoriesFromActualDocs = async (
    dataArray,
    accessOverride = departmentAccess
  ) => {
    /*
      Factory wise implementation:
      - Groups pending export document data by factoryCode.
      - Factory cards are summary only.
      - Factory cards will NOT open the details modal/list.
    */
    const pendingDepartments = await buildPendingDepartmentsFromActualDocs(
      dataArray,
      accessOverride
    );

    const factoryMap = new Map();

    pendingDepartments.forEach((item, index) => {
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
        pendingExpDocument: 0,
        pendingExportCount: 0,
        totalValue: 0,
      };

      current.pendingExpDocument += Number(item?.pendingExpDocument || 0);
      current.pendingExportCount += Number(
        item?.pendingExportCount || item?.pendingExpDocument || 0
      );
      current.totalValue += Number(
        item?.totalValue || item?.totalExportValue || item?.pendingValue || 0
      );

      factoryMap.set(key, current);
    });

    return Array.from(factoryMap.values())
      .filter((item) => (item?.pendingExpDocument || 0) > 0)
      .sort(
        (a, b) =>
          (b?.pendingExpDocument || 0) - (a?.pendingExpDocument || 0)
      );
  };

  const buildPendingDepartmentsFromActualDocs = async (
    dataArray,
    accessOverride = departmentAccess
  ) => {
    /*
      FIX:
      The pending summary API may return multiple rows for the same department
      because each packagingListNo is returned separately.

      Previously every row became a card, so departments such as HnM Adult
      appeared many times.

      Now rows are grouped by department first. Then only one card is created
      for each unique department.
    */
    const departmentMap = new Map();

    normalizeArray(dataArray)
      .filter(
        (item) =>
          (item?.pendingExportCount || item?.pendingExpDocument || 0) > 0
      )
      .filter((item) => isRowAllowedForAccess(item, accessOverride))
      .forEach((item, index) => {
        const departmentCode = String(
          item?.departmentCode || item?.__queryDepName || ""
        ).trim();

        const departmentName = String(
          item?.departmentName || departmentCode || item?.__queryDepName || "-"
        ).trim();

        const customerCode = String(item?.customerCode || "").trim();
        const customerName = String(
          item?.customerName ||
            item?.buyerName ||
            item?.departmentName ||
            "Unknown"
        ).trim();

        /*
          Use department code as the main key.
          Include customer code only as a fallback safeguard.
        */
        const departmentKey =
          normalizeText(departmentCode) ||
          normalizeText(departmentName) ||
          normalizeText(customerCode) ||
          `department-${index}`;

        const existing = departmentMap.get(departmentKey);

        if (!existing) {
          departmentMap.set(departmentKey, {
            ...item,
            departmentId:
              item?.departmentId ||
              item?.recId ||
              departmentCode ||
              item?.__queryDepName ||
              index + 1,
            departmentCode,
            departmentName,
            customerCode,
            customerName,
            pendingExpDocument: 0,
            pendingExportCount: 0,
            apiPendingExpDocument: 0,
            packagingListNos: [],
          });
        }

        const current = departmentMap.get(departmentKey);

        const packagingListNo = String(
          item?.packagingListNo ?? item?.packingListNo ?? ""
        ).trim();

        if (
          packagingListNo &&
          packagingListNo !== "0" &&
          !current.packagingListNos.includes(packagingListNo)
        ) {
          current.packagingListNos.push(packagingListNo);
        }

        current.apiPendingExpDocument = Math.max(
          Number(current.apiPendingExpDocument || 0),
          Number(item?.pendingExportCount || item?.pendingExpDocument || 0)
        );
      });

    const baseDepartments = Array.from(departmentMap.values());

    const departmentsWithActualCount = await Promise.all(
      baseDepartments.map(async (department) => {
        try {
          const departmentDocuments = await fetchDepartmentExportDocuments(
            department.departmentCode,
            department.departmentName,
            accessOverride
          );

          const dateFilteredDocuments = filterBySelectedDates(
            departmentDocuments
          );

          /*
            Count unique packagingListNo values.
            This prevents duplicate API rows from increasing the card count.
          */
          const uniquePackagingListNumbers = new Set();

          dateFilteredDocuments.forEach((document) => {
            const packagingListNo = String(
              document?.packagingListNo ?? document?.packingListNo ?? ""
            ).trim();

            if (packagingListNo && packagingListNo !== "0") {
              uniquePackagingListNumbers.add(normalizeText(packagingListNo));
            }
          });

          const actualPendingCount =
            uniquePackagingListNumbers.size ||
            removeDuplicateExportDocuments(dateFilteredDocuments).length;

          return {
            ...department,
            pendingExpDocument: actualPendingCount,
            pendingExportCount: actualPendingCount,
            packagingListNos: Array.from(uniquePackagingListNumbers),
          };
        } catch (error) {
          console.error(
            "Error syncing pending count for department:",
            department.departmentCode,
            error
          );

          const fallbackCount =
            department.packagingListNos?.length ||
            department.apiPendingExpDocument ||
            0;

          return {
            ...department,
            pendingExpDocument: fallbackCount,
            pendingExportCount: fallbackCount,
          };
        }
      })
    );

    return departmentsWithActualCount
      .filter((item) => (item?.pendingExpDocument || 0) > 0)
      .sort(
        (a, b) =>
          (b?.pendingExpDocument || 0) - (a?.pendingExpDocument || 0)
      );
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

      const pendingData =
        viewMode === "factory"
          ? await buildPendingFactoriesFromActualDocs(dataArray, activeAccess)
          : await buildPendingDepartmentsFromActualDocs(dataArray, activeAccess);

      setBuyerSummaryData(pendingData);
      setFilteredBuyerData(pendingData);
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
  }, [fromDate, toDate, viewMode]);

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
        item.departmentName?.toLowerCase().includes(searchLower) ||
        item.factoryCode?.toLowerCase().includes(searchLower) ||
        item.factoryName?.toLowerCase().includes(searchLower)
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

  const fetchModalFactoryExportData = async (
    factoryCode,
    accessOverride = departmentAccess
  ) => {
    setModalLoading(true);

    try {
      const activeAccess = accessOverride?.loaded
        ? accessOverride
        : await loadDepartmentAccess();

      const dataArray = await fetchFactoryExportDocuments(
        factoryCode,
        activeAccess
      );

      const dateFilteredArray = filterBySelectedDates(dataArray);

      setModalExportData(dateFilteredArray);
      setModalFilteredData(dateFilteredArray);
      setModalCurrentPage(1);
      setModalSearchText("");
    } catch (error) {
      console.error("Fetch factory modal error:", error);
      setModalExportData([]);
      setModalFilteredData([]);
    } finally {
      setModalLoading(false);
    }
  };

  const handleBadgeClick = async (item) => {
    if (viewMode === "factory" || item?.isFactoryWise) {
      const factoryCode = item?.factoryCode || item?.departmentCode || "";
      const displayTitle = `${factoryCode || "Unknown Factory"} • Factory Pending Details`;

      setModalDepartmentName(displayTitle);
      setShowDetailsModal(true);

      await fetchModalFactoryExportData(factoryCode, departmentAccess);
      return;
    }

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

  const handleTotalPendingClick = async () => {
    setShowAllPendingModal(true);
    setAllPendingLoading(true);
    setAllPendingSearchText("");
    setAllPendingRows([]);

    try {
      const activeAccess = departmentAccess?.loaded
        ? departmentAccess
        : await loadDepartmentAccess();

      const pendingSourceRows = await fetchRowsFromEndpointByDepName(
        "/api/Export/Get-Pending-Export-Document-Count",
        activeAccess
      );

      const pendingDepartments = await buildPendingDepartmentsFromActualDocs(
        pendingSourceRows,
        activeAccess
      );

      const groupedRows = pendingDepartments
        .map((item, index) => {
          const packagingListNos = Array.from(
            new Set(
              normalizeArray(item?.packagingListNos)
                .map((value) => String(value || "").trim())
                .filter(
                  (value) =>
                    value &&
                    value !== "0" &&
                    normalizeText(value) !== "null" &&
                    normalizeText(value) !== "undefined"
                )
            )
          );

          return {
            id:
              item?.departmentId ||
              item?.departmentCode ||
              item?.departmentName ||
              index + 1,
            factoryCode:
              item?.factoryCode ||
              item?.exFactoryName ||
              "Unknown Factory",
            customerName:
              item?.customerName ||
              item?.customerCode ||
              "Unknown Buyer",
            departmentName:
              item?.departmentName ||
              item?.departmentCode ||
              "Unknown Department",
            departmentCode: item?.departmentCode || "",
            packagingListNos,
            pendingCount:
              packagingListNos.length ||
              Number(item?.pendingExpDocument || item?.pendingExportCount || 0),
          };
        })
        .filter((item) => item.pendingCount > 0)
        .sort((a, b) => {
          const factoryCompare = String(a.factoryCode).localeCompare(
            String(b.factoryCode)
          );

          if (factoryCompare !== 0) return factoryCompare;

          return String(a.departmentName).localeCompare(
            String(b.departmentName)
          );
        });

      setAllPendingRows(groupedRows);
    } catch (error) {
      console.error("Unable to load all pending details:", error);
      setAllPendingRows([]);
      setError(`Failed to load all pending details: ${error.message}`);
    } finally {
      setAllPendingLoading(false);
    }
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

  const modalSafeFilteredData = Array.isArray(modalFilteredData)
    ? modalFilteredData
    : [];

  const modalTotalPages =
    Math.ceil(modalSafeFilteredData.length / modalItemsPerPage) || 1;

  const modalCurrentPageData = modalSafeFilteredData.slice(
    (modalCurrentPage - 1) * modalItemsPerPage,
    modalCurrentPage * modalItemsPerPage
  );

  const normalizedAllPendingSearch = normalizeText(allPendingSearchText);

  const filteredAllPendingRows = allPendingRows.filter((item) => {
    if (!normalizedAllPendingSearch) return true;

    return [
      item?.factoryCode,
      item?.customerName,
      item?.departmentName,
      item?.departmentCode,
      ...(item?.packagingListNos || []),
    ].some((value) =>
      normalizeText(value).includes(normalizedAllPendingSearch)
    );
  });

  const allPendingDocumentCount = filteredAllPendingRows.reduce(
    (sum, item) => sum + Number(item?.pendingCount || 0),
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
                  setBuyerSearchText("");
                  setBuyerCurrentPage(1);
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
              {hasActiveFilters && (
                <>
                  <button
                    type="button"
                    onClick={handleReset}
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
              <h2 className="text-lg font-black text-white">📊 Pending Summary</h2>
              <span className="text-xs text-slate-400">
                {departmentAccess.isRestricted ? "🔒 Restricted" : "🌐 All Access"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-500/10 rounded-full px-3 py-1 border border-blue-500/20">
                <span className="text-xs font-bold text-blue-300">
                  {viewMode === "factory" ? "Factories" : "Departments"}
                </span>
                <span className="text-sm font-black text-white">{totalBuyerCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 rounded-full px-3 py-1 border border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-300">Pending</span>
                <span className="text-sm font-black text-white">{totalPendingBuyers}</span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-4">
            <div className="rounded-xl bg-[#132238] border border-blue-500/20 px-3 py-2">
              <div className="text-lg font-black text-white">{totalBuyerCount}</div>
              <div className="text-[10px] font-bold text-blue-300">
                {viewMode === "factory" ? "Factories" : "Departments"}
              </div>
            </div>
            <button
              type="button"
              onClick={handleTotalPendingClick}
              className="rounded-xl bg-[#102a24] border border-emerald-500/20 px-3 py-2 text-left transition hover:bg-[#15372f] hover:border-emerald-400/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              title="Click to view all pending packing lists"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-black text-white">
                    {totalPendingBuyers}
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
                {highestPendingItem?.pendingExpDocument || 0}
              </div>
              <div className="text-[10px] font-bold text-pink-300">Highest</div>
            </div>
            <div className="rounded-xl bg-[#1a2a2a] border border-teal-500/20 px-3 py-2">
              <div className="text-lg font-black text-white">
                {lowestPendingItem?.pendingExpDocument || 0}
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
                  value={buyerSearchText}
                  onChange={(e) => handleBuyerSearch(e.target.value)}
                  placeholder={viewMode === "factory" ? "Search factory..." : "Search department..."}
                  className="w-full sm:w-56 rounded-xl bg-[#1e293b] border border-white/10 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {buyerLoading || loading ? (
              <div className="py-8 text-center text-slate-400 text-sm">Loading pending summary...</div>
            ) : buyerCurrentPageData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {buyerCurrentPageData.map((item, index) => {
                    const pending = Number(item?.pendingExpDocument) || 0;
                    const accentColor = cardAccentColors[index % cardAccentColors.length];
                    const softColor = cardSoftColors[index % cardSoftColors.length];
                    const icon = cardIcons[index % cardIcons.length];
                    const statusMeta = getStatusMeta(pending);

                    return (
                      <button
                        key={`${item?.factoryCode || item?.departmentCode || item?.customerName || index}-${index}`}
                        type="button"
                        onClick={() => handleBadgeClick(item)}
                        className="relative overflow-hidden rounded-xl bg-[#161b26] border border-[#293244] p-3 text-left shadow-lg transition-all group hover:border-blue-500/50 hover:bg-[#1a2232]"
                        title={
                          viewMode === "factory"
                            ? "Click to view factory pending details"
                            : "Click to view details"
                        }
                        style={{ borderLeftWidth: 3, borderLeftColor: accentColor }}
                      >
                        <div
                          className="absolute -top-6 -right-6 h-16 w-16 rounded-full opacity-50"
                          style={{ backgroundColor: softColor }}
                        />

                        <div className="relative flex items-start gap-2 mb-2">
                          <div
                            className="h-8 w-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                            style={{ backgroundColor: softColor }}
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
                  currentPage={buyerCurrentPage}
                  totalPages={buyerTotalPages}
                  itemsPerPage={buyerItemsPerPage}
                  setItemsPerPage={setBuyerItemsPerPage}
                  onPageChange={setBuyerCurrentPage}
                  totalItems={buyerSafeFilteredData.length}
                />
              </>
            ) : (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-sm font-bold text-slate-200">
                  {viewMode === "factory"
                    ? "No pending factory summary found"
                    : "No pending documents found"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Check login token, user profile departments, API CORS, and browser console.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showAllPendingModal && (
        <AllPendingModal
          loading={allPendingLoading}
          rows={filteredAllPendingRows}
          totalPending={allPendingDocumentCount}
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

function AllPendingModal({
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
      <div className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-[#111c35] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-lg">
              📦
            </div>

            <div className="min-w-0">
              <h3 className="truncate text-sm font-black text-white">
                All Pending Packing Lists
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
              placeholder="Search factory, buyer, department or packing list..."
              className="w-full rounded-xl border border-white/10 bg-[#111827] py-2 pl-8 pr-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="mx-4 mb-4 flex flex-1 items-center justify-center rounded-xl bg-[#111827] text-sm text-slate-400">
            Loading all pending packing lists...
          </div>
        ) : rows.length > 0 ? (
          <div className="mx-4 mb-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a]">
            <div className="sticky top-0 z-10 grid grid-cols-[0.8fr_1.2fr_2fr_0.5fr] border-b border-white/10 bg-[#16213d] text-[10px] font-bold uppercase text-slate-300">
              <div className="px-3 py-2">Factory</div>
              <div className="px-3 py-2">Buyer / Department</div>
              <div className="px-3 py-2">Pending Packing Lists</div>
              <div className="px-3 py-2 text-center">Count</div>
            </div>

            {rows.map((item, index) => (
              <div
                key={`${item?.factoryCode}-${item?.departmentCode || item?.departmentName}-${index}`}
                className={`grid grid-cols-[0.8fr_1.2fr_2fr_0.5fr] border-b border-white/5 ${
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
                  {item?.packagingListNos?.length ? (
                    item.packagingListNos.map((packingNo) => (
                      <span
                        key={`${item?.id}-${packingNo}`}
                        className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-2 py-1 text-[10px] font-black text-cyan-300"
                      >
                        {packingNo}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] font-bold text-slate-500">
                      Packing-list numbers not returned by API
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
              No pending packing lists found
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Try clearing the search or changing the selected date range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function FilterBadge({ label, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 px-2 py-0.5 text-[10px] font-bold text-blue-300 border border-blue-500/20">
      {label}
      <button type="button" onClick={onClear} className="hover:text-white">✕</button>
    </span>
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
              {title?.toLowerCase().includes("factory") ? "🏭" : "📄"}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-white">{title}</h3>
              <p className="truncate text-[10px] text-slate-400">
                {fromDate || toDate ? `${fromDate || "Start"} → ${toDate || "Today"}` : "All documents"}
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

        <div className="flex flex-col sm:flex-row gap-2 px-4 py-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Search packing, customer, style, factory, WO, contract..."
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

        {loading ? (
          <div className="mx-4 flex flex-1 items-center justify-center rounded-xl bg-[#111827] text-slate-400 text-sm">
            Loading export documents...
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
                  key={`${item?.packagingListNo || index}-${index}`}
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
                      {item.totalValue ? Number(item.totalValue).toLocaleString() : "0"}
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
                      Ship: {item.shippingDate ? item.shippingDate.split("T")[0] : "-"}
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
            <h3 className="text-sm font-bold text-white">No export records found</h3>
            <p className="text-xs text-slate-400 mt-0.5">Try changing the selected date range.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExportDocsPage;