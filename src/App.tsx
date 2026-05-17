import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import HomePage from "./pages/HomePage";
import DepositForm from "./pages/DepositForm";
import DepositDetail from "./pages/DepositDetail";
import BankManagement from "./pages/BankManagement";
import Settings from "./pages/Settings";

export default function App() {
  const { getSession } = useAuthStore();

  useEffect(() => {
    void getSession();
  }, [getSession]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="deposits" element={<Dashboard />} />
        <Route path="deposits/new" element={<DepositForm />} />
        <Route path="deposits/:id/detail" element={<DepositDetail />} />
        <Route path="deposits/:id" element={<DepositForm />} />
        <Route path="banks" element={<BankManagement />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
