import React, { useState } from 'react';
import { usuarioService } from '../services/api';
import './CambiarPassword.css';

const CambiarPassword = ({ onPasswordChanged }) => {
  const [formData, setFormData] = useState({
    password_actual: '',
    password_nueva: '',
    password_nueva_confirm: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password_nueva !== formData.password_nueva_confirm) {
      setError('Las contraseñas nuevas no coinciden');
      return;
    }

    if (formData.password_nueva.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      setLoading(true);
      await usuarioService.cambiarPassword({
        password_actual: formData.password_actual,
        password_nueva: formData.password_nueva,
        password_nueva_confirm: formData.password_nueva_confirm,
      });
      
      if (onPasswordChanged) {
        onPasswordChanged();
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cambiar-password-container">
      <div className="cambiar-password-card">
        <div className="password-header">
          <div className="password-icon">🔐</div>
          <h2>Cambio de Contraseña Obligatorio</h2>
          <p>Por seguridad, debes cambiar tu contraseña antes de continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="password-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Contraseña Actual</label>
            <input
              type="password"
              value={formData.password_actual}
              onChange={(e) => setFormData({ ...formData, password_actual: e.target.value })}
              required
              autoFocus
              placeholder="Ingresa tu contraseña actual"
            />
          </div>

          <div className="form-group">
            <label>Nueva Contraseña</label>
            <input
              type="password"
              value={formData.password_nueva}
              onChange={(e) => setFormData({ ...formData, password_nueva: e.target.value })}
              required
              placeholder="Mínimo 8 caracteres"
              minLength={8}
            />
            <small>La contraseña debe tener al menos 8 caracteres</small>
          </div>

          <div className="form-group">
            <label>Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={formData.password_nueva_confirm}
              onChange={(e) => setFormData({ ...formData, password_nueva_confirm: e.target.value })}
              required
              placeholder="Confirma tu nueva contraseña"
              minLength={8}
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary btn-large">
            {loading ? 'Cambiando...' : 'Cambiar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CambiarPassword;



