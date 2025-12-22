import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout, isAlumno, isDocente } = useAuth();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo">
            {!logoError && (
            <img 
              src="/images/ebenezer-logo.png" 
              alt="Iglesia de Cristo Elohim" 
              className="logo-image"
              onError={() => setLogoError(true)}
            />
            )}
            {logoError && (
              <h1 className="logo-text">Iglesia de Cristo Elohim</h1>
            )}
          </Link>
          <nav className="nav">
            {isAlumno() && (
              <>
                <Link to="/" className="nav-link">Mis Cursos</Link>
                <Link to="/examenes" className="nav-link">Exámenes</Link>
                <Link to="/calificaciones" className="nav-link">Calificaciones</Link>
              </>
            )}
            {isDocente() && (
              <>
                <Link to="/" className="nav-link">Dashboard</Link>
                <Link to="/cursos" className="nav-link">Cursos</Link>
                <Link to="/usuarios" className="nav-link">Usuarios</Link>
                <Link to="/promociones" className="nav-link">Promociones</Link>
              </>
            )}
          </nav>
          <div className="user-menu">
            <span className="username">{user?.first_name || user?.username}</span>
            <button onClick={handleLogout} className="btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;

