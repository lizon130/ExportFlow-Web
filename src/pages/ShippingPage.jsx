import React, { useEffect, useMemo, useState } from "react";

const API_BASE_URL = "http://192.168.136.53:7000";

function ShippingPage() {
  const [refreshing, setRefreshing] = useState(false);

  const [shippingSummaryData, setShippingSummaryData] = useState([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingCurrentPage, setShippingCurrentPage] = useState(1);
  const [shippingItemsPerPage, setShippingItemsPerPage] = useState(20);

  // dept = Department Wise, factory = Factory Wise, month = Month Wise
  const [viewMode, setViewMode] = useState("dept");

  const getTodayDisplayDate = () => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, "0");
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const yyyy = today.getFullYear();

    return `${dd}-${mm}-${yyyy}`;
  };

  // Default filter: 01-Jan-2026 through today
  const DEFAULT_FROM_DATE = "01-01-2026";
  const DEFAULT_TO_DATE = getTodayDisplayDate();

  const [fromDate, setFromDate] = useState(DEFAULT_FROM_DATE);
  const [toDate, setToDate] = useState(DEFAULT_TO_DATE);

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [modalShippingData, setModalShippingData] = useState([]);
  const [modalFilteredData, setModalFilteredData] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalDepartmentName, setModalDepartmentName] = useState("");
  const [modalCurrentPage, setModalCurrentPage] = useState(1);
  const [modalItemsPerPage, setModalItemsPerPage] = useState(20);
  const [modalSearchText, setModalSearchText] = useState("");

  // Total Pending Shipping modal
  const [showAllPendingModal, setShowAllPendingModal] = useState(false);
  const [allPendingLoading, setAllPendingLoading] = useState(false);
  const [allPendingRows, setAllPendingRows] = useState([]);
  const [allPendingSearchText, setAllPendingSearchText] = useState("");

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

  useEffect(() => {
    /*
      FIX:
      From Date / To Date must refresh the main summary cards also.
      Before this, selected dates were only used after opening the detail modal.
    */
    const timer = setTimeout(() => {
      fetchShippingSummary();
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

  const normalizeText = (value) => String(value || "").trim().toLowerCase();

  const getUniqueRowKey = (item, index) => {
    const keyValue =
      item?.shippingId ||
      item?.expDocumentNo ||
      item?.exportDocumentNo ||
      item?.packagingListNo ||
      item?.packingListNo ||
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
        item?.shippingDate,
        item?.shipmentDate,
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

    if (assignedDepartments.length) return assignedDepartments;

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

  const getDateFilteredShippingCountForSummaryRow = async (summaryRow) => {
    /*
      FIX:
      The count API does not use From Date / To Date.
      So when date filter is active, calculate each card's pending count
      from the detail endpoint using the selected date range.
    */
    const detailEndpoint = buildShippingListEndpoint();

    const rows = await fetchRowsForDepartment(detailEndpoint, {
      departmentCode: summaryRow?.departmentCode,
      departmentName: summaryRow?.departmentName || summaryRow?.customerName,
      customerName: summaryRow?.customerName,
    });

    const dateFilteredRows = filterBySelectedDates(removeDuplicateRows(rows));

    return {
      pendingCount: dateFilteredRows.length,
      totalValue: dateFilteredRows.reduce(
        (sum, row) => sum + Number(row?.totalValue || 0),
        0
      ),
    };
  };

  const applyDateFilterToShippingSummaryRows = async (rows) => {
    if (!fromDate && !toDate) return rows;

    const dateAwareRows = [];

    for (const row of rows) {
      try {
        const result = await getDateFilteredShippingCountForSummaryRow(row);

        if (result.pendingCount > 0) {
          dateAwareRows.push({
            ...row,
            pendingShippingDateCount: result.pendingCount,
            pendingShipping: result.pendingCount,
            totalValue: result.totalValue,
          });
        }
      } catch (error) {
        console.error("Error applying date filter to shipping summary row:", error, row);
      }
    }

    return dateAwareRows;
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

  const getMonthOrder = (item) => {
    const monthNo = Number(item?.exFacMonthNo || 0);

    if (monthNo >= 1 && monthNo <= 12) return monthNo;

    const monthName = normalizeText(item?.exFacMonthName);

    const monthMap = {
      january: 1,
      february: 2,
      march: 3,
      april: 4,
      may: 5,
      june: 6,
      july: 7,
      august: 8,
      september: 9,
      october: 10,
      november: 11,
      december: 12,
    };

    return monthMap[monthName] || 99;
  };

  const getMonthNameFromDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("en-US", { month: "long" });
  };

  const getMonthNumberFromDate = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return "";

    return String(date.getMonth() + 1);
  };

  const buildMonthWiseShippingSummary = (rows) => {
    const monthMap = new Map();

    removeDuplicateRows(rows)
      .filter((row) => !row?.shippingDate)
      .forEach((item, index) => {
        const monthName =
          String(item?.exFacMonthName || "").trim() ||
          getMonthNameFromDate(item?.expDate) ||
          getMonthNameFromDate(item?.invoiceDate) ||
          getMonthNameFromDate(item?.blDate) ||
          getMonthNameFromDate(item?.exFacDate) ||
          "Unknown Month";

        const monthNo =
          String(item?.exFacMonthNo || "").trim() ||
          getMonthNumberFromDate(item?.expDate) ||
          getMonthNumberFromDate(item?.invoiceDate) ||
          getMonthNumberFromDate(item?.blDate) ||
          getMonthNumberFromDate(item?.exFacDate) ||
          "";

        const key =
          normalizeText(monthName) ||
          normalizeText(monthNo) ||
          `month-${index}`;

        if (!monthMap.has(key)) {
          monthMap.set(key, {
            ...item,
            isMonthWise: true,
            exFacMonthName: monthName,
            exFacMonthNo: monthNo,
            customerName: monthName,
            departmentName: "Month Wise Summary",
            departmentCode: monthNo,
            pendingShippingDateCount: 0,
            pendingShipping: 0,
            totalValue: 0,
            documentNumbers: [],
            sourceRows: [],
          });
        }

        const current = monthMap.get(key);

        const documentNo = String(
          item?.expDocumentNo ||
            item?.exportDocumentNo ||
            item?.packagingListNo ||
            item?.exportShippingBillNumber ||
            ""
        ).trim();

        if (
          documentNo &&
          documentNo !== "0" &&
          !current.documentNumbers.some(
            (value) => normalizeText(value) === normalizeText(documentNo)
          )
        ) {
          current.documentNumbers.push(documentNo);
        }

        current.sourceRows.push(item);
        current.pendingShippingDateCount =
          current.documentNumbers.length || current.sourceRows.length;
        current.pendingShipping = current.pendingShippingDateCount;
        current.totalValue += Number(item?.totalValue || 0);
      });

    return Array.from(monthMap.values())
      .filter((item) => Number(item?.pendingShipping || 0) > 0)
      .sort((a, b) => getMonthOrder(a) - getMonthOrder(b));
  };

  const buildFactoryWiseShippingSummary = (rows) => {
    /*
      Factory wise implementation:
      - Groups shipping pending data by factoryCode.
      - Factory cards are summary only.
      - Factory cards will NOT open the details modal/list.
    */
    const factoryMap = new Map();

    normalizeArray(rows).forEach((item, index) => {
      const pendingCount = Number(
        item?.pendingShippingDateCount || item?.pendingShipping || 0
      );

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
        pendingShippingDateCount: 0,
        pendingShipping: 0,
        totalValue: 0,
      };

      current.pendingShippingDateCount += pendingCount;
      current.pendingShipping += pendingCount;
      current.totalValue += Number(item?.totalValue || 0);

      factoryMap.set(key, current);
    });

    return Array.from(factoryMap.values()).sort(
      (a, b) => (b?.pendingShipping || 0) - (a?.pendingShipping || 0)
    );
  };

  const buildShippingSummaryFromDetailRows = (rows) => {
    const summaryMap = new Map();

    removeDuplicateRows(rows)
      .filter((row) => !row?.shippingDate)
      .forEach((row, index) => {
        const factoryCode = String(row?.factoryCode || "").trim();
        const departmentCode = String(row?.departmentCode || "").trim();
        const departmentName = String(
          row?.departmentName || departmentCode || "Unknown Department"
        ).trim();
        const customerCode = String(row?.customerCode || "").trim();
        const customerName = String(
          row?.customerName || customerCode || departmentName
        ).trim();

        const key =
          [
            normalizeText(departmentCode),
            normalizeText(departmentName),
            normalizeText(customerCode),
            normalizeText(customerName),
            normalizeText(factoryCode),
          ].join("|") || `shipping-detail-summary-${index}`;

        if (!summaryMap.has(key)) {
          summaryMap.set(key, {
            ...row,
            departmentCode,
            departmentName,
            customerCode,
            customerName,
            factoryCode,
            pendingShippingDateCount: 0,
            pendingShipping: 0,
            totalValue: 0,
          });
        }

        const current = summaryMap.get(key);

        current.pendingShippingDateCount += 1;
        current.pendingShipping += 1;
        current.totalValue += Number(row?.totalValue || 0);
      });

    return Array.from(summaryMap.values());
  };

  const fetchDateFilteredShippingDetailRows = async () => {
    const authorizedDepartments = await getAuthorizedDepartments();
    let mergedRows = [];

    if (authorizedDepartments.length) {
      for (const department of authorizedDepartments) {
        try {
          const rows = await fetchRowsForDepartment(
            buildShippingListEndpoint(),
            department
          );

          mergedRows = [
            ...mergedRows,
            ...normalizeArray(rows).filter((row) => !row?.shippingDate),
          ];
        } catch (error) {
          console.error(
            "Date-filtered shipping detail request failed:",
            department,
            error
          );
        }
      }
    } else {
      /*
        Unrestricted/admin users:
        use the exact API pattern that is already returning your data:
        /api/Export/Get-By-Dept-Shipping-Date-List
          ?fromDate=2026-01-01
          &toDate=2026-12-31
      */
      const endpoint = buildShippingListEndpoint();
      const data = await fetchJsonWithAuth(`${API_BASE_URL}${endpoint}`);

      mergedRows = normalizeArray(data).filter(
        (row) => !row?.shippingDate
      );
    }

    return filterBySelectedDates(removeDuplicateRows(mergedRows));
  };

  const fetchShippingSummary = async () => {
    setShippingLoading(true);
    setError("");

    try {
      let dateAwareDataArray = [];

      if (fromDate || toDate) {
        /*
          IMPORTANT FIX:
          With a date range selected, use the actual Shipping detail API
          as the source of truth.

          This prevents valid rows from disappearing when the count API
          does not itself accept/use the selected date range.
        */
        const detailRows = await fetchDateFilteredShippingDetailRows();
        dateAwareDataArray = buildShippingSummaryFromDetailRows(detailRows);
      } else {
        dateAwareDataArray = await fetchRowsForAuthorizedDepartments(
          "/api/Export/Get-Pending-Shipping-Date-Count"
        );
      }

      const pendingShippingDepartments =
        viewMode === "month"
          ? buildMonthWiseShippingSummary(
              fromDate || toDate
                ? await fetchDateFilteredShippingDetailRows()
                : dateAwareDataArray
            )
          : viewMode === "factory"
          ? buildFactoryWiseShippingSummary(dateAwareDataArray)
          : dateAwareDataArray
              .filter(
                (item) =>
                  Number(
                    item?.pendingShippingDateCount ||
                      item?.pendingShipping ||
                      0
                  ) > 0
              )
              .map((item, index) => ({
                ...item,
                departmentId:
                  item?.departmentId || item?.recId || index + 1,
                pendingShipping: Number(
                  item?.pendingShippingDateCount ||
                    item?.pendingShipping ||
                    0
                ),
                customerName:
                  item?.customerName ||
                  item?.departmentName ||
                  "Unknown",
                departmentName:
                  item?.departmentName ||
                  item?.departmentCode ||
                  "-",
                departmentCode: item?.departmentCode || "",
                totalValue: Number(item?.totalValue || 0),
              }))
              .sort(
                (a, b) =>
                  (b?.pendingShipping || 0) -
                  (a?.pendingShipping || 0)
              );

      setShippingSummaryData(pendingShippingDepartments);
      setShippingCurrentPage(1);
    } catch (fetchError) {
      console.error(
        "Error fetching restricted pending shipping summary:",
        fetchError
      );
      setShippingSummaryData([]);
      setShippingCurrentPage(1);
      setError(`Network error: ${fetchError.message}`);
    } finally {
      setShippingLoading(false);
    }
  };

  const formatDisplayDateToApiDate = (ddmmyyyy) => {
    if (!ddmmyyyy) return "";
    const [dd, mm, yyyy] = String(ddmmyyyy).split("-");
    if (!dd || !mm || !yyyy) return "";
    return `${yyyy}-${mm}-${dd}`;
  };

  const buildShippingListEndpoint = () => {
    /*
      FIX:
      UI date state is DD-MM-YYYY, but the API normally expects YYYY-MM-DD.
      This keeps the UI date format and sends API-safe dates.
    */
    const apiFromDate = formatDisplayDateToApiDate(fromDate);
    const apiToDate = formatDisplayDateToApiDate(toDate);

    const params = [];

    if (apiFromDate) params.push(`fromDate=${encodeURIComponent(apiFromDate)}`);
    if (apiToDate) params.push(`toDate=${encodeURIComponent(apiToDate)}`);

    return params.length
      ? `/api/Export/Get-By-Dept-Shipping-Date-List?${params.join("&")}`
      : "/api/Export/Get-By-Dept-Shipping-Date-List";
  };

  const buildFactoryShippingListEndpoint = (factoryCode = "") => {
    /*
      Factory Wise detail endpoint:
      /api/Export/Get-By-Factory-Shipping-Date-List?depName=ttl

      depName is used by API as factoryCode.
      ttl / TTL both work because modal data is matched case-insensitively.
    */
    const apiFromDate = formatDisplayDateToApiDate(fromDate);
    const apiToDate = formatDisplayDateToApiDate(toDate);

    const params = [`depName=${encodeURIComponent(factoryCode || "")}`];

    if (apiFromDate) params.push(`fromDate=${encodeURIComponent(apiFromDate)}`);
    if (apiToDate) params.push(`toDate=${encodeURIComponent(apiToDate)}`);

    return `/api/Export/Get-By-Factory-Shipping-Date-List?${params.join("&")}`;
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

  const filterBySelectedDates = (data) => {
    if (!Array.isArray(data)) return [];

    const fromDateObj = getDateOnly(fromDate ? parseDateString(fromDate) : null);
    const toDateObj = getDateOnly(toDate ? parseDateString(toDate) : null);

    if (!fromDateObj && !toDateObj) return data;

    return data.filter((item) => {
      const rawDate =
        item?.shippingDate ||
        item?.shipDate ||
        item?.expDate ||
        item?.invoiceDate ||
        item?.shipmentDate ||
        item?.exFacDate ||
        item?.exFactoryDate ||
        item?.exfacDate ||
        item?.createdDate;

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
        item?.packagingListNo?.toString().toLowerCase().includes(searchLower) ||
        item?.expDocumentNo?.toString().toLowerCase().includes(searchLower) ||
        item?.customerName?.toLowerCase().includes(searchLower) ||
        item?.departmentName?.toLowerCase().includes(searchLower) ||
        item?.departmentCode?.toLowerCase().includes(searchLower) ||
        item?.factoryCode?.toLowerCase().includes(searchLower) ||
        item?.exFactoryName?.toLowerCase().includes(searchLower) ||
        item?.workOrderNo?.toLowerCase().includes(searchLower) ||
        item?.contractNo?.toLowerCase().includes(searchLower)
    );
  };

  const fetchModalShippingData = async (deptCode, deptName) => {
    setModalLoading(true);
    setModalSearchText("");

    try {
      const dataArray = await fetchRowsForDepartment(
        buildShippingListEndpoint(),
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

  const fetchModalMonthShippingData = async (item) => {
    const monthName =
      item?.exFacMonthName ||
      getMonthNameFromDate(item?.expDate) ||
      getMonthNameFromDate(item?.invoiceDate) ||
      "Unknown Month";

    const monthNo = String(item?.exFacMonthNo || "").trim();

    setModalLoading(true);
    setModalSearchText("");
    setModalCurrentPage(1);
    setModalDepartmentName(`${monthName} • Month Shipping Pending Details`);
    setShowDetailsModal(true);

    try {
      let rows = normalizeArray(item?.sourceRows);

      if (!rows.length) {
        rows = await fetchDateFilteredShippingDetailRows();
      }

      const monthRows = removeDuplicateRows(rows).filter((row) => {
        if (row?.shippingDate) return false;

        const rowMonthName = normalizeText(
          row?.exFacMonthName ||
            getMonthNameFromDate(row?.expDate) ||
            getMonthNameFromDate(row?.invoiceDate) ||
            getMonthNameFromDate(row?.blDate) ||
            getMonthNameFromDate(row?.exFacDate)
        );

        const rowMonthNo = String(
          row?.exFacMonthNo ||
            getMonthNumberFromDate(row?.expDate) ||
            getMonthNumberFromDate(row?.invoiceDate) ||
            getMonthNumberFromDate(row?.blDate) ||
            getMonthNumberFromDate(row?.exFacDate) ||
            ""
        ).trim();

        if (monthNo && rowMonthNo) {
          return rowMonthNo === monthNo;
        }

        return rowMonthName === normalizeText(monthName);
      });

      const dateFilteredData = filterBySelectedDates(monthRows);

      setModalShippingData(dateFilteredData);
      setModalFilteredData(dateFilteredData);
    } catch (fetchError) {
      console.error("Month shipping modal fetch error:", fetchError);
      setModalShippingData([]);
      setModalFilteredData([]);
      setModalCurrentPage(1);
    } finally {
      setModalLoading(false);
    }
  };

  const fetchModalFactoryShippingData = async (item) => {
    const factoryCode = item?.factoryCode || item?.departmentCode || "";
    const normalizedFactoryCode = normalizeText(factoryCode);

    setModalLoading(true);
    setModalSearchText("");
    setModalCurrentPage(1);
    setModalDepartmentName(
      `${factoryCode || "Unknown Factory"} • Factory Shipping Pending Details`
    );
    setShowDetailsModal(true);

    try {
      const endpoint = buildFactoryShippingListEndpoint(factoryCode);
      const url = `${API_BASE_URL}${endpoint}`;
      const data = await fetchJsonWithAuth(url);

      const dataArray = normalizeArray(data).filter(
        (row) => normalizeText(row?.factoryCode) === normalizedFactoryCode
      );

      const dateFilteredData = filterBySelectedDates(removeDuplicateRows(dataArray));

      setModalShippingData(dateFilteredData);
      setModalFilteredData(dateFilteredData);
    } catch (fetchError) {
      console.error("Factory shipping modal fetch error:", fetchError);
      setModalShippingData([]);
      setModalFilteredData([]);
      setModalCurrentPage(1);
    } finally {
      setModalLoading(false);
    }
  };

  const handleCardClick = async (item) => {
    if (viewMode === "month" || item?.isMonthWise) {
      await fetchModalMonthShippingData(item);
      return;
    }

    if (viewMode === "factory" || item?.isFactoryWise) {
      await fetchModalFactoryShippingData(item);
      return;
    }

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

  const buildAllPendingShippingGroups = (rows) => {
    const groupMap = new Map();

    removeDuplicateRows(rows).forEach((item, index) => {
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
          item?.exportShippingBillNumber ||
          ""
      ).trim();

      const key =
        [
          normalizeText(factoryCode),
          normalizeText(customerName),
          normalizeText(departmentCode || departmentName),
        ].join("|") || `pending-shipping-group-${index}`;

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
        documentNo !== "0" &&
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
      const profile = await fetchLoggedInUserProfile();
      const assignedDepartments = getAssignedDepartments(profile);

      /*
        FIX:
        Admin/unrestricted users may get no detail rows when depName is empty.

        Process:
        1. Load pending shipping summary.
        2. Collect actual department codes.
        3. Call Get-By-Dept-Shipping-Date-List for every pending department.
        4. Keep rows where shippingDate is empty.
        5. Group by Factory + Buyer/Department.
      */
      let summaryRows = [];

      if (assignedDepartments.length) {
        for (const department of assignedDepartments) {
          const rows = await fetchRowsForDepartment(
            "/api/Export/Get-Pending-Shipping-Date-Count",
            department
          );

          summaryRows = [...summaryRows, ...rows];
        }
      } else {
        summaryRows = normalizeArray(
          await fetchJsonWithAuth(
            `${API_BASE_URL}/api/Export/Get-Pending-Shipping-Date-Count`
          )
        );
      }

      const pendingSummaryRows = normalizeArray(summaryRows).filter(
        (row) =>
          Number(
            row?.pendingShippingDateCount ||
              row?.pendingShipping ||
              0
          ) > 0
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

      if (!departmentQueries.length && assignedDepartments.length) {
        assignedDepartments.forEach((department) => {
          getDepartmentQueryValues(department).forEach((value) => {
            if (
              value &&
              !departmentQueries.some(
                (existing) =>
                  normalizeText(existing) === normalizeText(value)
              )
            ) {
              departmentQueries.push(value);
            }
          });
        });
      }

      let mergedRows = [];

      if (!assignedDepartments.length && (fromDate || toDate)) {
        /*
          Admin/unrestricted + date filter:
          use the date-filtered detail endpoint directly.
        */
        mergedRows = await fetchDateFilteredShippingDetailRows();
      } else {
        for (const departmentQuery of departmentQueries) {
          try {
            const endpoint = buildShippingListEndpoint();
            const url = buildDepartmentEndpointUrl(
              endpoint,
              departmentQuery
            );
            const data = await fetchJsonWithAuth(url);

            const rows = normalizeArray(data).filter(
              (row) => !row?.shippingDate
            );

            mergedRows = [...mergedRows, ...rows];
          } catch (detailError) {
            console.error(
              "Pending shipping detail request failed:",
              departmentQuery,
              detailError
            );
          }
        }
      }

      const uniqueRows = removeDuplicateRows(mergedRows);
      const dateFilteredRows = filterBySelectedDates(uniqueRows);

      setAllPendingRows(
        buildAllPendingShippingGroups(dateFilteredRows)
      );
    } catch (error) {
      console.error("Fetch all pending shipping error:", error);
      setAllPendingRows([]);
      setError(
        `Failed to load all pending shipping details: ${error.message}`
      );
    } finally {
      setAllPendingLoading(false);
    }
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
        item?.departmentCode?.toLowerCase().includes(key) ||
        item?.factoryCode?.toLowerCase().includes(key) ||
        item?.factoryName?.toLowerCase().includes(key) ||
        item?.exFacMonthName?.toLowerCase().includes(key) ||
        item?.exFacMonthNo?.toString().toLowerCase().includes(key)
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

  const getDisplayName = (item) => {
    if (viewMode === "month" || item?.isMonthWise) {
      return (
        item?.exFacMonthName ||
        getMonthNameFromDate(item?.expDate) ||
        getMonthNameFromDate(item?.invoiceDate) ||
        "Unknown Month"
      );
    }

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
    if (viewMode === "month" || item?.isMonthWise) {
      const monthNo =
        item?.exFacMonthNo ||
        getMonthNumberFromDate(item?.expDate) ||
        getMonthNumberFromDate(item?.invoiceDate) ||
        "-";

      return `Month ${monthNo}`;
    }

    if (viewMode === "factory" || item?.isFactoryWise) {
      return item?.factoryName || "Factory Wise Summary";
    }

    return item?.departmentName || item?.departmentCode || "-";
  };

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
    (sum, item) => sum + Number(item?.pendingCount || 0),
    0
  );

  const hasActiveFilters = fromDate !== "" || toDate !== "";

  return (
    <div className="min-h-screen w-full bg-[#0a0c12] text-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="rounded-2xl bg-[#101827] border border-white/10 p-4 shadow-2xl">
          
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
                  setSearchText("");
                  setShippingCurrentPage(1);
                }}
                className="w-full rounded-xl bg-[#0b1220] border border-slate-700/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="dept">Department Wise</option>
                <option value="factory">Factory Wise</option>
                <option value="month">Month Wise</option>
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
                onClick={fetchShippingSummary}
                disabled={shippingLoading}
                className="rounded-xl bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60 transition"
              >
                {shippingLoading ? "Filtering..." : "Apply"}
              </button>

              {hasActiveFilters && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setFromDate(DEFAULT_FROM_DATE);
                      setToDate(getTodayDisplayDate());
                    }}
                    className="rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-2 text-xs font-bold text-red-300 hover:bg-red-500/20 transition"
                  >
                    ✕ Reset
                  </button>
                  
                  {/* <div className="flex flex-wrap gap-1">
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
                  </div> */}
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
              <h2 className="text-lg font-black text-white">📊 Shipping Summary</h2>
              <span className="text-xs text-slate-400">
                {viewMode === "factory"
                  ? "Overview by factory"
                  : viewMode === "month"
                  ? "Overview by month"
                  : "Overview by active department"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-blue-500/10 rounded-full px-3 py-1 border border-blue-500/20">
                <span className="text-xs font-bold text-blue-300">
                  {viewMode === "factory"
                    ? "Factories"
                    : viewMode === "month"
                    ? "Months"
                    : "Departments"}
                </span>
                <span className="text-sm font-black text-white">{totalDepartmentCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-emerald-500/10 rounded-full px-3 py-1 border border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-300">Pending</span>
                <span className="text-sm font-black text-white">{totalPendingShipping}</span>
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
              title="Click to view all pending shipping documents"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-black text-white">
                    {totalPendingShipping}
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
                {highestPendingItem?.pendingShipping || 0}
              </div>
              <div className="text-[10px] font-bold text-pink-300">Highest</div>
            </div>
            <div className="rounded-xl bg-[#1a2a2a] border border-teal-500/20 px-3 py-2">
              <div className="text-lg font-black text-white">
                {lowestPendingItem?.pendingShipping || 0}
              </div>
              <div className="text-[10px] font-bold text-teal-300">Lowest</div>
            </div>
          </div>

          {/* Search & Cards */}
          <div className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <h3 className="text-sm font-black text-white">
                {viewMode === "factory"
                  ? "Pending by Factory"
                  : viewMode === "month"
                  ? "Pending by Month"
                  : "Pending by Department"}
              </h3>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  value={searchText}
                  onChange={(e) => {
                    setSearchText(e.target.value);
                    setShippingCurrentPage(1);
                  }}
                  placeholder={
                    viewMode === "factory"
                      ? "Search factory..."
                      : viewMode === "month"
                      ? "Search month..."
                      : "Search department..."
                  }
                  className="w-full sm:w-56 rounded-xl bg-[#1e293b] border border-white/10 pl-8 pr-3 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {shippingLoading ? (
              <div className="py-8 text-center text-slate-400 text-sm">{hasActiveFilters ? "Applying date filter..." : "Loading pending shipping..."}</div>
            ) : shippingCurrentPageData.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {shippingCurrentPageData.map((item, index) => {
                    const pending = item?.pendingShipping || 0;
                    const accentColor = cardAccentColors[index % cardAccentColors.length];
                    const icon = cardIcons[index % cardIcons.length];
                    const statusMeta = getStatusMeta(pending);

                    return (
                      <button
                        key={`${item?.factoryCode || item?.departmentCode || item?.customerName || index}-${index}`}
                        type="button"
                        onClick={() => handleCardClick(item)}
                        className="relative overflow-hidden rounded-xl bg-[#161b26] border border-[#293244] p-3 text-left shadow-lg transition-all group hover:border-blue-500/50 hover:bg-[#1a2232]"
                        title={
                          viewMode === "factory"
                            ? "Click to view factory shipping details"
                            : viewMode === "month"
                            ? "Click to view month shipping details"
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
                  currentPage={shippingCurrentPage}
                  totalPages={shippingTotalPages}
                  itemsPerPage={shippingItemsPerPage}
                  setItemsPerPage={setShippingItemsPerPage}
                  onPageChange={setShippingCurrentPage}
                  totalItems={filteredShippingData.length}
                />
              </>
            ) : (
              <div className="py-12 text-center">
                <div className="text-3xl mb-2">✅</div>
                <h3 className="text-sm font-bold text-slate-200">
                  {viewMode === "factory"
                    ? "No pending factory summary found"
                    : viewMode === "month"
                    ? "No pending month summary found"
                    : "No pending shipping found"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">No pending shipping dates found</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {showAllPendingModal && (
        <AllPendingShippingModal
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
            setModalFilteredData(modalShippingData);
            setModalCurrentPage(1);
          }}
        />
      )}
    </div>
  );
}

function AllPendingShippingModal({
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
                All Pending Shipping Documents
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
            Loading all pending shipping documents...
          </div>
        ) : rows.length > 0 ? (
          <div className="mx-4 mb-4 min-h-0 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-[#0f172a]">
            <div className="sticky top-0 z-10 grid grid-cols-[0.7fr_1.2fr_2fr_0.5fr] border-b border-white/10 bg-[#16213d] text-[10px] font-bold uppercase text-slate-300">
              <div className="px-3 py-2">Factory</div>
              <div className="px-3 py-2">Buyer / Department</div>
              <div className="px-3 py-2">Pending Documents</div>
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
              No pending shipping documents found
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
              {title?.toLowerCase().includes("factory")
                ? "🏭"
                : title?.toLowerCase().includes("month")
                ? "🗓️"
                : "🚢"}
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-white">{title}</h3>
              <p className="truncate text-[10px] text-slate-400">
                {fromDate || toDate ? `${fromDate || "Start"} → ${toDate || "Today"}` : "All pending shipping records"}
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
                placeholder="Search packing, export no, department, factory, WO, contract..."
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
            Loading shipping records...
          </div>
        ) : data.length > 0 ? (
          <div className="mx-4 mb-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-white/10 bg-[#0f172a]">
            <div className="grid grid-cols-[1.5fr_0.9fr_0.8fr_0.8fr] bg-[#16213d] border-b border-white/10 text-[10px] font-bold uppercase text-slate-300">
              <div className="px-3 py-2">Document / Department</div>
              <div className="px-3 py-2">Factory / Customer</div>
              <div className="px-3 py-2">Qty / Value</div>
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
                    <p className="text-xs font-bold text-white">
                      {item.noOfCarton ? Number(item.noOfCarton).toLocaleString() : "0"} ctn
                    </p>
                    <p className="text-[10px] font-bold text-slate-300">
                      {item.noOfPcs ? Number(item.noOfPcs).toLocaleString() : "0"} pcs
                    </p>
                    <p className="text-[10px] font-bold text-emerald-300 mt-0.5">
                      {item.totalValue ? Number(item.totalValue).toLocaleString() : "0"}
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
            <div className="text-3xl mb-2">🚢</div>
            <h3 className="text-sm font-bold text-white">No shipping records found</h3>
            <p className="text-xs text-slate-400 mt-0.5">Try changing the selected date range.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShippingPage;
