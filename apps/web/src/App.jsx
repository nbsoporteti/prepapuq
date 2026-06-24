import React from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ForgotPasswordPage from './pages/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import ClasesPublicasLandingPage from './pages/ClasesPublicasLandingPage.jsx';
import ClasePublicaDetallePage from './pages/ClasePublicaDetallePage.jsx';
import EstudianteDashboard from './pages/EstudianteDashboard.jsx';
import CourseDetailPage from './pages/CourseDetailPage.jsx';
import ApoderadoDashboard from './pages/ApoderadoDashboard.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ProfesorDashboard from './pages/profesor/ProfesorDashboard.jsx';
import SeccionDetalle from './pages/profesor/SeccionDetalle.jsx';
import AdministrativoDashboard from './pages/administrativo/AdministrativoDashboard.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/clases-gratis" element={<ClasesPublicasLandingPage />} />
              <Route path="/clases-gratis/:id" element={<ClasePublicaDetallePage />} />

              <Route
                path="/dashboard/estudiante"
                element={
                  <ProtectedRoute allowedRole="estudiante">
                    <EstudianteDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/dashboard/estudiante/curso/:cursoId" 
                element={
                  <ProtectedRoute allowedRole="estudiante">
                    <CourseDetailPage />
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/dashboard/apoderado" 
                element={
                  <ProtectedRoute allowedRole="apoderado">
                    <ApoderadoDashboard />
                  </ProtectedRoute>
                } 
              />
              
              <Route
                path="/dashboard/admin"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/profesor"
                element={
                  <ProtectedRoute allowedRoles={["profesor", "admin"]}>
                    <ProfesorDashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/profesor/seccion/:seccionId"
                element={
                  <ProtectedRoute allowedRoles={["profesor", "admin"]}>
                    <SeccionDetalle />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/administrativo"
                element={
                  <ProtectedRoute allowedRoles={["administrativo", "admin"]}>
                    <AdministrativoDashboard />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<HomePage />} />
            </Routes>
          </main>
        </div>
      </AuthProvider>
      <Toaster />
    </Router>
  );
}

export default App;