import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import EditarPerfilModal from './EditarPerfilModal';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout, isAlumno, isDocente } = useAuth();
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="header-content">
          <Link to="/" className="logo" onClick={closeMobileMenu}>
            {!logoError && (
              <img 
                src="/images/ebenezer-logo.png" 
                alt="Iglesia de Cristo Elohim" 
                className="logo-image"
                onError={() => setLogoError(true)}
              />
            )}
            <h1 className="logo-text">Iglesia de Cristo Elohim</h1>
          </Link>
          <nav className="nav desktop-nav">
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
                <Link to="/promociones-gestion" className="nav-link">Promociones</Link>
              </>
            )}
          </nav>
          <div className="header-right">
            <div className="user-menu desktop-user-menu">
              <span 
                className="username" 
                onClick={() => setShowProfileModal(true)}
                style={{ cursor: 'pointer' }}
                title="Click para editar perfil"
              >
                {user?.first_name || user?.username}
              </span>
              <button onClick={handleLogout} className="btn-logout">
                Cerrar Sesión
              </button>
            </div>
            <button 
              className="mobile-menu-toggle"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              <span className={`hamburger ${mobileMenuOpen ? 'active' : ''}`}>
                <span></span>
                <span></span>
                <span></span>
              </span>
            </button>
          </div>
        </div>
        <nav className={`mobile-nav ${mobileMenuOpen ? 'open' : ''}`}>
          {isAlumno() && (
            <>
              <Link to="/" className="mobile-nav-link" onClick={closeMobileMenu}>Mis Cursos</Link>
              <Link to="/examenes" className="mobile-nav-link" onClick={closeMobileMenu}>Exámenes</Link>
              <Link to="/calificaciones" className="mobile-nav-link" onClick={closeMobileMenu}>Calificaciones</Link>
            </>
          )}
          {isDocente() && (
            <>
              <Link to="/" className="mobile-nav-link" onClick={closeMobileMenu}>Dashboard</Link>
              <Link to="/cursos" className="mobile-nav-link" onClick={closeMobileMenu}>Cursos</Link>
              <Link to="/usuarios" className="mobile-nav-link" onClick={closeMobileMenu}>Usuarios</Link>
              <Link to="/promociones-gestion" className="mobile-nav-link" onClick={closeMobileMenu}>Promociones</Link>
            </>
          )}
          <div className="mobile-user-section">
            <button 
              className="mobile-btn-profile"
              onClick={() => { setShowProfileModal(true); closeMobileMenu(); }}
              title="Click para editar perfil"
            >
              <span className="mobile-btn-profile-label">Usuario:</span>
              <span className="mobile-btn-profile-name">{user?.first_name || user?.username}</span>
            </button>
            <button onClick={() => { handleLogout(); closeMobileMenu(); }} className="mobile-btn-logout">
              Cerrar Sesión
            </button>
          </div>
        </nav>
      </header>
      <main className="main-content">{children}</main>
      
      <EditarPerfilModal 
        isOpen={showProfileModal} 
        onClose={() => setShowProfileModal(false)} 
      />
    </div>
  );
};

export default Layout;

