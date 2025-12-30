import React, { useState, useEffect } from 'react';
import { usuarioService } from '../services/api';
import './GestionarUsuarios.css';

const GestionarUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showCredencialesModal, setShowCredencialesModal] = useState(false);
  const [credencialesUsuario, setCredencialesUsuario] = useState(null);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    password_confirm: '',
    tipo: 'alumno',
    telefono: '',
  });
  const [tipoFiltro, setTipoFiltro] = useState('');

  useEffect(() => {
    loadUsuarios();
  }, [tipoFiltro]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const response = await usuarioService.getAll(tipoFiltro || null);
      setUsuarios(response.data.results || response.data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      
      if (editingUser) {
        // Edición: solo enviar password si se especificó
        delete dataToSend.password_confirm;
        if (!dataToSend.password) {
          delete dataToSend.password;
        }
        await usuarioService.update(editingUser.id, dataToSend);
        resetForm();
        loadUsuarios();
      } else {
        // Creación: siempre se genera contraseña automáticamente en el backend
        // No enviar password, el backend lo generará automáticamente
        delete dataToSend.password;
        delete dataToSend.password_confirm;
        
        const response = await usuarioService.create(dataToSend);
        
        // Mostrar modal con credenciales siempre al crear usuario
        // La contraseña viene en password_generada desde el backend
        setCredencialesUsuario({
          username: dataToSend.username,
          first_name: dataToSend.first_name || '',
          last_name: dataToSend.last_name || '',
          password: response.data.password_generada,
        });
        setShowCredencialesModal(true);
        
        resetForm();
        loadUsuarios();
      }
    } catch (err) {
      alert('Error al guardar usuario: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (usuario) => {
    setEditingUser(usuario);
    setFormData({
      username: usuario.username,
      email: usuario.email || '',
      first_name: usuario.first_name || '',
      last_name: usuario.last_name || '',
      password: '',
      password_confirm: '',
      tipo: usuario.tipo,
      telefono: usuario.telefono || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este usuario?')) {
      return;
    }
    try {
      await usuarioService.delete(id);
      loadUsuarios();
    } catch (err) {
      alert('Error al eliminar usuario');
    }
  };

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      password: '',
      password_confirm: '',
      tipo: 'alumno',
      telefono: '',
    });
    setEditingUser(null);
    setShowForm(false);
  };

  const copiarCredenciales = () => {
    const texto = `Usuario: ${credencialesUsuario.username}\nContraseña: ${credencialesUsuario.password}`;
    navigator.clipboard.writeText(texto).then(() => {
      alert('Credenciales copiadas al portapapeles');
    });
  };

  const copiarPassword = () => {
    navigator.clipboard.writeText(credencialesUsuario.password).then(() => {
      alert('Contraseña copiada al portapapeles');
    });
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p>Cargando usuarios...</p></div>;
  }

  return (
    <div className="gestionar-usuarios">
      <div className="header-actions">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p style={{margin: '8px 0 0 0', opacity: 0.95, fontSize: '1rem'}}>Administra los usuarios del sistema</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-large" style={{background: 'white', color: '#667eea'}}>
          <span className="btn-icon">+</span>
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
        </button>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Filtrar por tipo:</label>
          <select 
            value={tipoFiltro} 
            onChange={(e) => setTipoFiltro(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los usuarios</option>
            <option value="alumno">Alumnos</option>
            <option value="docente">Docentes</option>
            <option value="admin">Administradores</option>
          </select>
        </div>
        <div className="users-count">
          <span className="count-number">{usuarios.length}</span>
          <span className="count-label">usuarios</span>
        </div>
      </div>

      {showForm && (
        <div className="form-card">
          <div className="form-header">
            <h2>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h2>
            <button onClick={resetForm} className="btn-close">×</button>
          </div>
          
          <form onSubmit={handleSubmit} className="usuario-form">
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
              <h3>Credenciales de Acceso</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Usuario *</label>
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="nombre.usuario"
                    required
                    disabled={!!editingUser}
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3>Tipo de Usuario</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Tipo *</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    required
                    className="form-select"
                  >
                    <option value="alumno">Alumno</option>
                    <option value="docente">Docente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="+502 1234-5678"
                  />
                </div>
              </div>
            </div>

            {!editingUser && (
              <div className="form-section">
                <div className="info-text" style={{ marginTop: 0 }}>
                  <strong>ℹ️ Información:</strong> La contraseña se generará automáticamente usando una palabra eclesiástica (ejemplo: "Pastor", "Aguila", "Oveja"). 
                  Se mostrará en el siguiente paso después de crear el usuario.
                </div>
              </div>
            )}

            {editingUser && (
              <div className="form-section">
                <h3>Cambiar Contraseña</h3>
                <div className="form-group">
                  <label>Nueva Contraseña (dejar vacío para no cambiar)</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Ingrese nueva contraseña"
                  />
                </div>
              </div>
            )}

            <div className="form-actions">
              <button type="submit" className="btn-primary btn-large">
                {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="usuarios-container">
        {usuarios.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <h3>No hay usuarios registrados</h3>
            <p>Crea tu primer usuario para comenzar</p>
          </div>
        ) : (
          <div className="usuarios-grid">
            {usuarios.map((usuario) => (
              <div key={usuario.id} className="usuario-card">
                <div className="card-header">
                  <div className="user-avatar">
                    {usuario.first_name ? usuario.first_name.charAt(0).toUpperCase() : usuario.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="user-info-header">
                    <h3>{usuario.first_name} {usuario.last_name}</h3>
                    <span className="username">@{usuario.username}</span>
                  </div>
                  <span className={`badge badge-${usuario.tipo}`}>
                    {usuario.tipo === 'alumno' ? 'Alumno' : usuario.tipo === 'docente' ? 'Docente' : 'Admin'}
                  </span>
                </div>
                
                <div className="card-body">
                  <div className="info-item">
                    <span className="info-label">Email:</span>
                    <span className="info-value">{usuario.email || 'No especificado'}</span>
                  </div>
                  {usuario.telefono && (
                    <div className="info-item">
                      <span className="info-label">Teléfono:</span>
                      <span className="info-value">{usuario.telefono}</span>
                    </div>
                  )}
                </div>
                
                <div className="card-actions">
                  <button onClick={() => handleEdit(usuario)} className="btn-edit">
                    <span>✏️</span> Editar
                  </button>
                  <button onClick={() => handleDelete(usuario.id)} className="btn-delete">
                    <span>🗑️</span> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCredencialesModal && credencialesUsuario && (
        <div className="modal-overlay" onClick={() => setShowCredencialesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>✅ Usuario Creado Exitosamente</h2>
              <button 
                onClick={() => setShowCredencialesModal(false)} 
                className="btn-close-modal"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="credenciales-card">
                <div className="credenciales-header">
                  <span className="credenciales-icon">🔑</span>
                  <h3>Credenciales de Acceso</h3>
                  <p className="credenciales-note">Comparte estas credenciales de forma privada con el usuario</p>
                </div>
                
                <div className="credenciales-list">
                  <div className="credencial-item">
                    <span className="credencial-label">Nombre Completo:</span>
                    <span className="credencial-value">{credencialesUsuario.first_name} {credencialesUsuario.last_name}</span>
                  </div>
                  <div className="credencial-item">
                    <span className="credencial-label">Usuario:</span>
                    <div className="credencial-value-with-copy">
                      <span className="credencial-value">{credencialesUsuario.username}</span>
                      <button 
                        onClick={() => navigator.clipboard.writeText(credencialesUsuario.username)}
                        className="btn-copy"
                        title="Copiar"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                  <div className="credencial-item password-item">
                    <span className="credencial-label">Contraseña:</span>
                    <div className="credencial-value-with-copy">
                      <span className="credencial-value password-visible">{credencialesUsuario.password}</span>
                      <button 
                        onClick={copiarPassword}
                        className="btn-copy"
                        title="Copiar contraseña"
                      >
                        📋
                      </button>
                    </div>
                  </div>
                </div>

                <div className="credenciales-warning">
                  <span className="warning-icon">⚠️</span>
                  <p>El usuario deberá cambiar su contraseña en el primer inicio de sesión</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button 
                onClick={copiarCredenciales} 
                className="btn-primary btn-copy-all"
              >
                📋 Copiar Todas las Credenciales
              </button>
              <button 
                onClick={() => setShowCredencialesModal(false)} 
                className="btn-secondary"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionarUsuarios;
