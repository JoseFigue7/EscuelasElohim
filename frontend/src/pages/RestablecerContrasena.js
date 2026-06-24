import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import '../components/Login.css';
import './RestablecerContrasena.css';

const RestablecerContrasena = () => {
  const [formData, setFormData] = useState({
    username: '',
    password_nueva: '',
    password_nueva_confirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password_nueva !== formData.password_nueva_confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }

    try {
      setLoading(true);
      const response = await authService.restablecerContrasena({
        username: formData.username.trim(),
        password_nueva: formData.password_nueva,
        password_nueva_confirm: formData.password_nueva_confirm,
      });
      setSuccess(response.mensaje || 'Contraseña restablecida correctamente');
      setFormData({ username: '', password_nueva: '', password_nueva_confirm: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card restablecer-card">
        <div className="login-header">
          <h1 className="login-title">
            <span className="login-title-main">Restablecer</span>
            <span className="login-title-sub">Contraseña</span>
          </h1>
          <h2 className="login-subtitle">
            Ingresa tu usuario y elige una nueva contraseña
          </h2>
        </div>

        {success ? (
          <div className="restablecer-success">
            <div className="success-message">{success}</div>
            <p className="restablecer-hint">
              Si el restablecimiento fue exitoso, ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <button
              type="button"
              className="btn-primary"
              onClick={() => navigate('/login')}
            >
              Ir a iniciar sesión
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="username">Usuario</label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
                autoFocus
                disabled={loading}
                placeholder="Tu nombre de usuario"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password_nueva">Nueva contraseña</label>
              <input
                type="password"
                id="password_nueva"
                value={formData.password_nueva}
                onChange={(e) => setFormData({ ...formData, password_nueva: e.target.value })}
                required
                disabled={loading}
                placeholder="Tu nueva contraseña"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password_nueva_confirm">Confirmar nueva contraseña</label>
              <input
                type="password"
                id="password_nueva_confirm"
                value={formData.password_nueva_confirm}
                onChange={(e) => setFormData({ ...formData, password_nueva_confirm: e.target.value })}
                required
                disabled={loading}
                placeholder="Repite la nueva contraseña"
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Restableciendo...' : 'Restablecer contraseña'}
            </button>
          </form>
        )}

        {!success && (
          <p className="restablecer-footer">
            <Link to="/login">← Volver a iniciar sesión</Link>
          </p>
        )}
      </div>
    </div>
  );
};

export default RestablecerContrasena;
