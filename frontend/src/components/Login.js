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
        <div className="login-header">
          <h1 className="login-title">
            <span className="login-title-main">Iglesia de Cristo</span>
            <span className="login-title-sub">Elohim</span>
          </h1>
          <h2 className="login-subtitle">Plataforma de Cursos</h2>
        </div>
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
