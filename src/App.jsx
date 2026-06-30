import { BrowserRouter, Routes, Route } from "react-router-dom";

// Existing pages
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

// New document pages
import ExportDocumentPage from "./pages/ExportDocumentPage";
import BLDateCheckPage from "./pages/BLDateCheckPage";
import ShippingPage from "./pages/ShippingPage";
import BankSubmitPage from "./pages/BankSubmitPage";
import RealizationPage from "./pages/RealizationPage";

// Layouts
import MainLayout from "./layouts/MainLayout";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Routes WITH header/sidebar */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<Home />} />
          <Route path="/index" element={<Index />} />

          {/* User & Security Management */}
          <Route path="/users" element={<UsersTable />} />
          <Route path="/roles" element={<RoleManagement />} />
          <Route path="/users/create" element={<UsersPage />} />
          <Route path="/roles/create" element={<RolesPage />} />
          <Route path="/rights/create" element={<RightsPage />} />

          {/* Documents */}
          <Route path="/documents/export-document" element={<ExportDocumentPage />} />
          <Route path="/documents/bl-date-check" element={<BLDateCheckPage />} />
          <Route path="/documents/shipping" element={<ShippingPage />} />
          <Route path="/documents/bank-submit" element={<BankSubmitPage />} />
          <Route path="/documents/realization" element={<RealizationPage />} />

          {/* Logs */}
          <Route path="/logs" element={<Logs />} />
        </Route>

        {/* Routes WITHOUT header/sidebar */}
        <Route path="/registration" element={<Registration />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;