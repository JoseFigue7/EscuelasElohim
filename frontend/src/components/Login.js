import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CambiarPassword from './CambiarPassword';
import './Login.css';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCambiarPassword, setShowCambiarPassword] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { login, isAuthenticated, debeCambiarPassword, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated && !debeCambiarPassword) {
      navigate('/');
    }
  }, [isAuthenticated, debeCambiarPassword, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      if (result.user?.debe_cambiar_password) {
        setShowCambiarPassword(true);
      } else {
        navigate('/');
      }
    } else {
      setError(result.error || 'Error al iniciar sesión');
    }
  };

  const handlePasswordChanged = async () => {
    await refreshUser();
    setShowCambiarPassword(false);
    navigate('/');
  };

  if (showCambiarPassword) {
    return <CambiarPassword onPasswordChanged={handlePasswordChanged} />;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-logo-container">
          {!logoError && (
            <img 
              src="/images/ebenezer-logo.png" 
              alt="Iglesia de Cristo Elohim" 
              className="login-logo"
              onError={() => setLogoError(true)}
            />
          )}
          {logoError && (
            <h1 className="login-logo-text">Iglesia de Cristo Elohim</h1>
          )}
        </div>
        <h2>Plataforma de Cursos</h2>
        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}
          <div className="form-group">
            <label htmlFor="username">Usuario</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              disabled={loading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
