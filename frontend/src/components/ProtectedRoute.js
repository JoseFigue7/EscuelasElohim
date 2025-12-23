import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, requireDocente = false, requireAdmin = false }) => {
  const { isAuthenticated, isDocente, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Cargando...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/" replace />;
  }

  if (requireDocente && !isDocente()) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;



