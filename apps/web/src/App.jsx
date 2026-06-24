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
import AdminPAESImportPage from './pages/admin/AdminPAESImportPage.jsx';
import ProfesorDashboard from './pages/profesor/ProfesorDashboard.jsx';
import SeccionDetalle from './pages/profesor/SeccionDetalle.jsx';
import ProfesorCalificarTareaPage from './pages/profesor/ProfesorCalificarTareaPage.jsx';
import CalificarEvaluacionBulk from './pages/profesor/CalificarEvaluacionBulk.jsx';
import EstudianteTareasPage from './pages/estudiante/EstudianteTareasPage.jsx';
import EstudianteTareaDetailPage from './pages/estudiante/EstudianteTareaDetailPage.jsx';
import EstudiantePAESRendir from './pages/estudiante/EstudiantePAESRendir.jsx';
import BibliotecaPage from './pages/BibliotecaPage.jsx';
import AdministrativoDashboard from './pages/administrativo/AdministrativoDashboard.jsx';
import NotificacionesPage from './pages/NotificacionesPage.jsx';
import AnunciosPage from './pages/AnunciosPage.jsx';
import PerfilGeneral from './pages/PerfilGeneral.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { PizarraProvider } from '@/contexts/PizarraContext.jsx';
import Header from '@/components/Header.jsx';
import PizarraPanel from '@/components/pizarra/PizarraPanel.jsx';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
       <PizarraProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <PizarraPanel />
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
                path="/dashboard/admin/paes"
                element={
                  <ProtectedRoute allowedRoles={["admin", "profesor"]}>
                    <AdminPAESImportPage />
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
                path="/dashboard/profesor/calificar/:entregaId"
                element={
                  <ProtectedRoute allowedRoles={["profesor", "admin"]}>
                    <ProfesorCalificarTareaPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/profesor/evaluacion/:evaluacionId"
                element={
                  <ProtectedRoute allowedRoles={["profesor", "admin"]}>
                    <CalificarEvaluacionBulk />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/estudiante/tareas"
                element={
                  <ProtectedRoute allowedRole="estudiante">
                    <EstudianteTareasPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/estudiante/tarea/:tareaId"
                element={
                  <ProtectedRoute allowedRole="estudiante">
                    <EstudianteTareaDetailPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/dashboard/estudiante/paes/:simulacroId"
                element={
                  <ProtectedRoute allowedRole="estudiante">
                    <EstudiantePAESRendir />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/biblioteca"
                element={
                  <ProtectedRoute>
                    <BibliotecaPage />
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

              <Route path="/notificaciones" element={
                <ProtectedRoute>
                  <NotificacionesPage />
                </ProtectedRoute>
              } />

              <Route path="/anuncios" element={
                <ProtectedRoute>
                  <AnunciosPage />
                </ProtectedRoute>
              } />

              <Route path="/anuncios/:anuncioId" element={
                <ProtectedRoute>
                  <AnunciosPage />
                </ProtectedRoute>
              } />

              <Route path="/perfil" element={
                <ProtectedRoute>
                  <PerfilGeneral />
                </ProtectedRoute>
              } />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
        </div>
       </PizarraProvider>
      </AuthProvider>
      <Toaster />
    </Router>
  );
}

export default App;