import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './components/Login';
import AlumnoDashboard from './pages/AlumnoDashboard';
import DocenteDashboard from './pages/DocenteDashboard';
import PromocionDetail from './pages/PromocionDetail';
import TemaExamenes from './pages/TemaExamenes';
import TomarExamen from './pages/TomarExamen';
import Calificaciones from './pages/Calificaciones';
import GestionarPromocion from './pages/GestionarPromocion';
import GestionarUsuarios from './pages/GestionarUsuarios';
import GestionarCursos from './pages/GestionarCursos';
import TemaDetail from './pages/TemaDetail';
import './App.css';

const HomeRoute = () => {
  const { isAlumno, isDocente } = useAuth();
  
  if (isAlumno()) {
    return <AlumnoDashboard />;
  } else if (isDocente()) {
    return <DocenteDashboard />;
  }
  
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<HomeRoute />} />
                    <Route path="/promociones/:id" element={<PromocionDetail />} />
                    <Route path="/temas/:id/examenes" element={<TemaExamenes />} />
                    <Route path="/examenes/:id" element={<TomarExamen />} />
                    <Route path="/calificaciones" element={<Calificaciones />} />
                    <Route
                      path="/promociones"
                      element={
                        <ProtectedRoute requireDocente>
                          <DocenteDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/promociones/:id/gestion"
                      element={
                        <ProtectedRoute requireDocente>
                          <GestionarPromocion />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/promociones/:promocionId/temas/:temaId"
                      element={
                        <ProtectedRoute requireDocente>
                          <TemaDetail />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/usuarios"
                      element={
                        <ProtectedRoute requireDocente>
                          <GestionarUsuarios />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/cursos"
                      element={
                        <ProtectedRoute requireDocente>
                          <GestionarCursos />
                        </ProtectedRoute>
                      }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
