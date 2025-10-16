import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{padding:20}}>Loading...</div>;
  return user ? children : <Navigate to="/" replace />;
}
