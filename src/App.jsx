import { BrowserRouter, Routes, Route } from "react-router-dom"


// Existing pages
import Dashboard from "./pages/Dashboard"
import Home from "./pages/Home"
import Registration from "./pages/Registration"
import Login from "./pages/Login"
import Index from "./pages/Index"
import RoleManagement from "./pages/RoleManagement"
import UsersPage from "./pages/UsersPage";
import RolesPage from "./pages/RolesPage";
import RightsPage from "./pages/RightsPage";

// Layouts
import MainLayout from "./layouts/MainLayout"

// New Import (Assuming you saved the previous code as UsersTable.jsx in pages folder)
import UsersTable from "./pages/UsersTable" 

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Routes WITH header (Protected/Dashboard Area) */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<Home />} />
          <Route path="/index" element={<Index />} />
          
          {/* New Route for User & Security Management */}
          <Route path="/users" element={<UsersTable />} />
          <Route path="/roles" element={<RoleManagement />} />
          <Route path="/users/create" element={<UsersPage />} />
          <Route path="/roles/create" element={<RolesPage />} />
          <Route path="/rights/create" element={<RightsPage />} />
        </Route>

        {/* Routes WITHOUT header (Public Area) */}
        <Route path="/registration" element={<Registration />} />
        <Route path="/login" element={<Login />} />

      </Routes>
    </BrowserRouter>
  )
}

export default App