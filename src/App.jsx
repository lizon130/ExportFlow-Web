import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Home from "./pages/Home";
import Registration from "./pages/Registration";
import Login from "./pages/Login";
import Index from "./pages/Index";
import RoleManagement from "./pages/RoleManagement";
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import RightsPage from "./pages/RightsPage";
import Logs from "./pages/Logs";
import UsersTable from "./pages/UsersTable";

import ExportDocumentPage from "./pages/ExportDocumentPage";
import BLDateCheckPage from "./pages/BLDateCheckPage";
import ShippingPage from "./pages/ShippingPage";
import BankSubmitPage from "./pages/BankSubmitPage";
import RealizationPage from "./pages/RealizationPage";

import MainLayout from "./layouts/MainLayout";

function ProtectedRoute() {
  const token =
    localStorage.getItem("accessToken") || localStorage.getItem("token");
  const expireAt = localStorage.getItem("expireAt");
  const tokenExpiry = localStorage.getItem("token_expiry");

  const isExpired =
    (expireAt && new Date(expireAt).getTime() < Date.now()) ||
    (tokenExpiry && Number(tokenExpiry) < Date.now());

  if (!token || isExpired) {
    localStorage.clear();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/registration" element={<Registration />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/home" element={<Home />} />
            <Route path="/index" element={<Index />} />

            <Route path="/users" element={<UsersTable />} />
            <Route path="/roles" element={<RoleManagement />} />
            <Route path="/users/create" element={<UsersPage />} />
            <Route path="/roles/create" element={<RolesPage />} />
            <Route path="/rights/create" element={<RightsPage />} />

            <Route
              path="/documents/export-document"
              element={<ExportDocumentPage />}
            />
            <Route
              path="/documents/bl-date-check"
              element={<BLDateCheckPage />}
            />
            <Route path="/documents/shipping" element={<ShippingPage />} />
            <Route path="/documents/bank-submit" element={<BankSubmitPage />} />
            <Route
              path="/documents/realization"
              element={<RealizationPage />}
            />

            <Route path="/logs" element={<Logs />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;