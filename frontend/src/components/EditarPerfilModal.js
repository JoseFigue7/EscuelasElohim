import React, { useState, useEffect } from 'react';
import { authService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './EditarPerfilModal.css';

const EditarPerfilModal = ({ isOpen, onClose }) => {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    telefono: '',
    fecha_nacimiento: '',
    direccion: '',
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      // Formatear fecha para el input date (YYYY-MM-DD)
      let fechaFormateada = '';
      if (user.fecha_nacimiento) {
        const fecha = new Date(user.fecha_nacimiento);
        if (!isNaN(fecha.getTime())) {
          fechaFormateada = fecha.toISOString().split('T')[0];
        }
      }

      setFormData({
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        telefono: user.telefono || '',
        fecha_nacimiento: fechaFormateada,
        direccion: user.direccion || '',
      });
    }
  }, [isOpen, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Preparar datos: solo enviar campos que el usuario puede editar
      const dataToSend = {
        email: formData.email || '',
        first_name: formData.first_name || '',
        last_name: formData.last_name || '',
        telefono: formData.telefono || null,
        fecha_nacimiento: formData.fecha_nacimiento || null,
        direccion: formData.direccion || null,
      };
      
      await authService.updateProfile(dataToSend);
      await refreshUser();
      onClose();
      alert('Perfil actualizado exitosamente');
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      console.error('Detalles del error:', error.response?.data);
      
      // Mostrar mensaje de error más detallado
      let errorMessage = 'Error al actualizar perfil';
      if (error.response?.data) {
        if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          // Si hay errores de validación por campo
          const fieldErrors = Object.entries(error.response.data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(', ') : errors}`)
            .join('\n');
          errorMessage = fieldErrors || JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Perfil</h2>
          <button 
            onClick={onClose} 
            className="btn-close-modal"
            disabled={saving}
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-section">
            <h3>Información Personal</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Nombre</label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Ingrese el nombre"
                />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Ingrese el apellido"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Información de Contacto</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                />
              </div>
              <div className="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ingrese el teléfono"
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>Información Adicional</h3>
            <div className="form-grid">
              <div className="form-group">
                <label>Fecha de Nacimiento</label>
                <input
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => setFormData({ ...formData, fecha_nacimiento: e.target.value })}
                />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Dirección</label>
                <textarea
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Ingrese la dirección"
                  rows="3"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button"
              onClick={onClose} 
              className="btn-secondary"
              disabled={saving}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={saving}
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarPerfilModal;

