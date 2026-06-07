import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';

const ProtectedRoute = ({ children, allowedRole }) => {
  const { isAuthenticated, currentUser, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-8 w-32 bg-muted rounded"></div>
          <div className="text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If a specific role is required and user doesn't match
  if (allowedRole && currentUser?.rol !== allowedRole) {
    // Redirect to their proper dashboard based on their actual role
    if (currentUser?.rol === 'estudiante') return <Navigate to="/dashboard/estudiante" replace />;
    if (currentUser?.rol === 'apoderado') return <Navigate to="/dashboard/apoderado" replace />;
    if (currentUser?.rol === 'admin') return <Navigate to="/dashboard/admin" replace />;
    
    // Fallback if role is completely unknown
    return <Navigate to="/" replace />;
  }

  return children;
};

export default ProtectedRoute;