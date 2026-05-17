import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/auth";
import AppLayout from "./layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import DepositForm from "./pages/DepositForm";
import BankManagement from "./pages/BankManagement";

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
        <Route index element={<Dashboard />} />
        <Route path="deposits" element={<Dashboard />} />
        <Route path="deposits/new" element={<DepositForm />} />
        <Route path="deposits/:id" element={<DepositForm />} />
        <Route path="banks" element={<BankManagement />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
