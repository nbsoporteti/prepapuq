import React, { Suspense, lazy } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Resto de rutas en lazy: saca KaTeX, el editor PAES y los dashboards del bundle inicial.
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage.jsx'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage.jsx'));
const ClasesPublicasLandingPage = lazy(() => import('./pages/ClasesPublicasLandingPage.jsx'));
const ClasePublicaDetallePage = lazy(() => import('./pages/ClasePublicaDetallePage.jsx'));
const EstudianteDashboard = lazy(() => import('./pages/EstudianteDashboard.jsx'));
const CourseDetailPage = lazy(() => import('./pages/CourseDetailPage.jsx'));
const ApoderadoDashboard = lazy(() => import('./pages/ApoderadoDashboard.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminPAESImportPage = lazy(() => import('./pages/admin/AdminPAESImportPage.jsx'));
const CourseEditorPage = lazy(() => import('./pages/admin/CourseEditorPage.jsx'));
const ProfesorDashboard = lazy(() => import('./pages/profesor/ProfesorDashboard.jsx'));
const SeccionDetalle = lazy(() => import('./pages/profesor/SeccionDetalle.jsx'));
const ProfesorCalificarTareaPage = lazy(() => import('./pages/profesor/ProfesorCalificarTareaPage.jsx'));
const CalificarEvaluacionBulk = lazy(() => import('./pages/profesor/CalificarEvaluacionBulk.jsx'));
const EstudianteTareasPage = lazy(() => import('./pages/estudiante/EstudianteTareasPage.jsx'));
const EstudianteTareaDetailPage = lazy(() => import('./pages/estudiante/EstudianteTareaDetailPage.jsx'));
const EstudiantePAESRendir = lazy(() => import('./pages/estudiante/EstudiantePAESRendir.jsx'));
const BibliotecaPage = lazy(() => import('./pages/BibliotecaPage.jsx'));
const AdministrativoDashboard = lazy(() => import('./pages/administrativo/AdministrativoDashboard.jsx'));
const NotificacionesPage = lazy(() => import('./pages/NotificacionesPage.jsx'));
const AnunciosPage = lazy(() => import('./pages/AnunciosPage.jsx'));
const PerfilGeneral = lazy(() => import('./pages/PerfilGeneral.jsx'));
const ManualPage = lazy(() => import('./pages/ManualPage.jsx'));
import ProtectedRoute from '@/components/ProtectedRoute.jsx';
import { AuthProvider } from '@/contexts/AuthContext.jsx';
import { PizarraProvider } from '@/contexts/PizarraContext.jsx';
import Header from '@/components/Header.jsx';
import ErrorBoundary from '@/components/shared/ErrorBoundary.jsx';
import PizarraPanel from '@/components/pizarra/PizarraPanel.jsx';
import ChatAsistente from '@/components/asistente/ChatAsistente.jsx';

function App() {
  return (
    <Router>
      <ScrollToTop />
      <AuthProvider>
       <PizarraProvider>
        <div className="flex flex-col min-h-screen">
          <Header />
          <PizarraPanel />
          <ChatAsistente />
          <main className="flex-1">
            <ErrorBoundary>
            <Suspense fallback={<div className="flex flex-1 items-center justify-center py-24 text-sm text-muted-foreground">Cargando…</div>}>
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
                path="/dashboard/admin/curso/:cursoId"
                element={
                  <ProtectedRoute allowedRole="admin">
                    <CourseEditorPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/manual"
                element={
                  <ProtectedRoute allowedRoles={["admin", "profesor"]}>
                    <ManualPage />
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
            </Suspense>
            </ErrorBoundary>
          </main>
        </div>
       </PizarraProvider>
      </AuthProvider>
      <Toaster />
    </Router>
  );
}

export default App;