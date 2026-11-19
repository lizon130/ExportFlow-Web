// ============================================================
// Central API Configuration
// URL change korlei shudhu EKHANE change korlei hobe —
// whole project e automatically apply hoye jabe.
// Deploy er somoy .env file e VITE_API_BASE_URL set koreo deya jay.
// ============================================================

// Main backend (Auth, User, Role, Permission, Export, Logger, Notification)
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://192.168.136.53:7000";

// All controllers start with /api
export const API_BASE = `${API_BASE_URL}/api`;

// ------------------------------------------------------------
// Legacy / side-service endpoints (still centralized here)
// ------------------------------------------------------------

// Old Security service (UsersPage, RolesPage, AssignRoleModal, AssignRightModal)
export const LEGACY_SECURITY_URL = "http://localhost:5208/api/Security";

// Old registration service (Registration page)
export const LEGACY_USERS_URL = "http://localhost:5142/api";

// Wash Machine service (Home page)
export const WASH_MACHINE_API = "http://192.168.136.52:5000/api";
