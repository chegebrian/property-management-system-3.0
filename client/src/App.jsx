// src/App.jsx - Updated with aliases
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "@contexts/AuthContext";
import { ThemeProvider } from "@contexts/ThemeContext";
import PrivateRoute from "@components/PrivateRoute";
import Layout from "@components/Layout";
import Login from "@pages/Login";
import Register from "@pages/Register";
import Dashboard from "@pages/Dashboard";
import Properties from "@pages/Properties";
import PropertyDetail from "@pages/PropertyDetail";
import Tenants from "@pages/Tenants";
import TenantDetail from "@pages/TenantDetail";
import RentPayments from "@pages/RentPayments";
import PaymentDetail from "@pages/PaymentDetail";
import Settings from "@pages/Settings";
import "@styles/App.css";

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="properties" element={<Properties />} />
              <Route path="properties/:id" element={<PropertyDetail />} />
              <Route path="tenants" element={<Tenants />} />
              <Route path="tenants/:id" element={<TenantDetail />} />
              <Route path="payments" element={<RentPayments />} />
              <Route path="payments/:id" element={<PaymentDetail />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
