import React, { useState, useEffect, useCallback } from 'react';
import { usuarioService } from '../services/api';
import './GestionarUsuarios.css';

const GestionarUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [credencialesLista, setCredencialesLista] = useState([]);
  const [credencialesIndice, setCredencialesIndice] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
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
  const [nombreFiltro, setNombreFiltro] = useState('');

  const PLANTILLA_CSV = `usuario,nombre,apellido,email,telefono
jperez,Juan,Pérez,juan@ejemplo.com,5555-1234
mlopez,María,López,maria@ejemplo.com,5555-5678`;

  const credencialesActual = credencialesLista[credencialesIndice] ?? null;
  const totalCredenciales = credencialesLista.length;
  const hayVariosCredenciales = totalCredenciales > 1;

  const loadUsuarios = useCallback(async () => {
    try {
      setLoading(true);
      const data = await usuarioService.getAll(tipoFiltro || null);
      setUsuarios(data);
    } catch (err) {
      console.error('Error al cargar usuarios:', err);
      alert('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  }, [tipoFiltro]);

  useEffect(() => {
    loadUsuarios();
  }, [loadUsuarios]);

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
        setCredencialesLista([{
          username: dataToSend.username,
          first_name: dataToSend.first_name || '',
          last_name: dataToSend.last_name || '',
          password: response.data.password_generada,
        }]);
        setCredencialesIndice(0);
        
        resetForm();
        loadUsuarios();
      }
    } catch (err) {
      const data = err.response?.data;
      let message = err.message;
      if (data) {
        if (typeof data === 'string') {
          message = data;
        } else if (data.detail) {
          message = data.detail;
        } else if (Array.isArray(data)) {
          message = data.join(', ');
        } else {
          message = Object.entries(data)
            .map(([field, value]) => {
              const text = Array.isArray(value) ? value.join(', ') : value;
              return `${field}: ${text}`;
            })
            .join(' | ');
        }
      }
      alert('Error al guardar usuario: ' + message);
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

  const cerrarCredenciales = () => {
    setCredencialesLista([]);
    setCredencialesIndice(0);
  };

  const copiarCredenciales = () => {
    if (!credencialesActual) return;
    const nombre = `${credencialesActual.first_name} ${credencialesActual.last_name}`.trim();
    const texto = [
      nombre ? `Nombre: ${nombre}` : null,
      `Usuario: ${credencialesActual.username}`,
      `Contraseña: ${credencialesActual.password}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(texto).then(() => {
      alert('Credenciales copiadas al portapapeles');
    });
  };

  const copiarPassword = () => {
    if (!credencialesActual) return;
    navigator.clipboard.writeText(credencialesActual.password).then(() => {
      alert('Contraseña copiada al portapapeles');
    });
  };

  const descargarPlantillaCsv = () => {
    const blob = new Blob([PLANTILLA_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plantilla_usuarios.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const abrirImportModal = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const cerrarImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportLoading(false);
  };

  const handleImportCsv = async () => {
    if (!importFile) {
      alert('Selecciona un archivo CSV');
      return;
    }
    setImportLoading(true);
    setImportResult(null);
    try {
      const response = await usuarioService.importarCsv(importFile);
      const { creados = [], errores = [], mensaje } = response.data;
      setImportResult(response.data);
      loadUsuarios();

      if (creados.length > 0) {
        setCredencialesLista(
          creados.map((u) => ({
            username: u.username,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            password: u.password_generada,
          }))
        );
        setCredencialesIndice(0);
        setShowImportModal(false);
        setImportFile(null);
      }

      if (errores.length > 0 && creados.length === 0) {
        alert(mensaje || 'No se importó ningún usuario. Revisa los errores en el modal.');
      } else if (errores.length > 0) {
        alert(`${mensaje}\n\n${errores.length} fila(s) no se importaron. Revisa el detalle en el modal.`);
      } else if (creados.length === 0) {
        alert('El archivo no contenía usuarios válidos para importar.');
        cerrarImportModal();
      }
    } catch (err) {
      const data = err.response?.data;
      const msg = data?.error || data?.detail || err.message;
      alert('Error al importar: ' + msg);
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p>Cargando usuarios...</p></div>;
  }

  const usuariosFiltrados = usuarios.filter((usuario) => {
    if (!nombreFiltro.trim()) {
      return true;
    }
    const nombreCompleto = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim();
    const busqueda = nombreFiltro.toLowerCase();
    return (
      nombreCompleto.toLowerCase().includes(busqueda) ||
      usuario.username.toLowerCase().includes(busqueda)
    );
  });

  return (
    <div className="gestionar-usuarios">
      <div className="header-actions">
        <div>
          <h1>Gestión de Usuarios</h1>
          <p style={{margin: '8px 0 0 0', opacity: 0.95, fontSize: '1rem'}}>Administra los usuarios del sistema</p>
        </div>
        <div className="header-buttons">
          <button
            type="button"
            onClick={abrirImportModal}
            className="btn-secondary btn-large header-btn-import"
          >
            📥 Importar CSV
          </button>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-large" style={{background: 'white', color: '#667eea'}}>
            <span className="btn-icon">+</span>
            {showForm ? 'Cancelar' : 'Nuevo Usuario'}
          </button>
        </div>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Buscar por nombre:</label>
          <input
            type="text"
            value={nombreFiltro}
            onChange={(e) => setNombreFiltro(e.target.value)}
            className="filter-input"
            placeholder="Ej. Juan Pérez"
          />
        </div>
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
          <span className="count-number">{usuariosFiltrados.length}</span>
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
        {usuariosFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            {usuarios.length === 0 ? (
              <>
                <h3>No hay usuarios registrados</h3>
                <p>Crea tu primer usuario para comenzar</p>
              </>
            ) : (
              <>
                <h3>No se encontraron usuarios</h3>
                <p>Intenta con otro nombre o limpia el filtro</p>
              </>
            )}
          </div>
        ) : (
          <div className="usuarios-table-wrapper">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Rol</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuariosFiltrados.map((usuario) => {
                  const nombreCompleto = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim();
                  return (
                    <tr key={usuario.id}>
                      <td>
                        <div className="table-user">
                          <div className="table-user-avatar">
                            {(usuario.first_name || usuario.username).charAt(0).toUpperCase()}
                          </div>
                          <div className="table-user-info">
                            <span className="table-user-name">{nombreCompleto || usuario.username}</span>
                            <span className="table-user-username">@{usuario.username}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${usuario.tipo}`}>
                          {usuario.tipo === 'alumno' ? 'Alumno' : usuario.tipo === 'docente' ? 'Docente' : 'Admin'}
                        </span>
                      </td>
                      <td>{usuario.email || 'No especificado'}</td>
                      <td>{usuario.telefono || 'No especificado'}</td>
                      <td>
                        <div className="table-actions">
                          <button onClick={() => handleEdit(usuario)} className="btn-edit">
                            <span>✏️</span> Editar
                          </button>
                          <button onClick={() => handleDelete(usuario.id)} className="btn-delete">
                            <span>🗑️</span> Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showImportModal && (
        <div className="modal-overlay" onClick={cerrarImportModal}>
          <div className="modal-content modal-import" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📥 Importar usuarios desde CSV</h2>
              <button type="button" onClick={cerrarImportModal} className="btn-close-modal">×</button>
            </div>
            <div className="modal-body">
              <p className="import-hint">
                Todos los usuarios importados se crearán como <strong>Alumno</strong>.
                La contraseña se genera automáticamente y podrás verla una por una al finalizar.
              </p>
              <button type="button" onClick={descargarPlantillaCsv} className="btn-link-plantilla">
                ⬇ Descargar plantilla CSV de ejemplo
              </button>
              <div className="form-group" style={{ marginTop: '20px' }}>
                <label>Archivo CSV *</label>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => setImportFile(e.target.files[0] || null)}
                />
                <small className="form-hint-import">
                  Columnas: usuario (obligatorio), nombre, apellido, email, telefono
                </small>
              </div>
              {importResult?.errores?.length > 0 && (
                <div className="import-errores">
                  <h4>Filas con error ({importResult.errores.length})</h4>
                  <ul>
                    {importResult.errores.slice(0, 10).map((err, idx) => (
                      <li key={idx}>
                        Fila {err.fila}: {err.mensaje}
                      </li>
                    ))}
                  </ul>
                  {importResult.errores.length > 10 && (
                    <p className="import-errores-mas">… y {importResult.errores.length - 10} más</p>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={handleImportCsv}
                className="btn-primary"
                disabled={importLoading || !importFile}
              >
                {importLoading ? 'Importando…' : 'Importar'}
              </button>
              <button type="button" onClick={cerrarImportModal} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {credencialesActual && (
        <div className="modal-overlay" onClick={cerrarCredenciales}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {hayVariosCredenciales
                  ? `✅ Usuario ${credencialesIndice + 1} de ${totalCredenciales}`
                  : '✅ Usuario creado exitosamente'}
              </h2>
              <button type="button" onClick={cerrarCredenciales} className="btn-close-modal">×</button>
            </div>
            <div className="modal-body">
              {hayVariosCredenciales && (
                <div className="credenciales-progress">
                  <div
                    className="credenciales-progress-bar"
                    style={{ width: `${((credencialesIndice + 1) / totalCredenciales) * 100}%` }}
                  />
                  <span className="credenciales-progress-text">
                    Revisa y comparte las credenciales de cada alumno antes de continuar
                  </span>
                </div>
              )}
              <div className="credenciales-card">
                <div className="credenciales-header">
                  <span className="credenciales-icon">🔑</span>
                  <h3>Credenciales de acceso</h3>
                  <p className="credenciales-note">Comparte estas credenciales de forma privada con el usuario</p>
                </div>
                <div className="credenciales-list">
                  <div className="credencial-item">
                    <span className="credencial-label">Nombre completo:</span>
                    <span className="credencial-value">
                      {credencialesActual.first_name} {credencialesActual.last_name}
                    </span>
                  </div>
                  <div className="credencial-item">
                    <span className="credencial-label">Usuario:</span>
                    <div className="credencial-value-with-copy">
                      <span className="credencial-value">{credencialesActual.username}</span>
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(credencialesActual.username)}
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
                      <span className="credencial-value password-visible">{credencialesActual.password}</span>
                      <button type="button" onClick={copiarPassword} className="btn-copy" title="Copiar contraseña">
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
            <div className="modal-footer credenciales-footer-nav">
              {hayVariosCredenciales && (
                <div className="credenciales-nav">
                  <button
                    type="button"
                    onClick={() => setCredencialesIndice((i) => Math.max(0, i - 1))}
                    className="btn-secondary"
                    disabled={credencialesIndice === 0}
                  >
                    ← Anterior
                  </button>
                  <span className="credenciales-nav-counter">
                    {credencialesIndice + 1} / {totalCredenciales}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCredencialesIndice((i) => Math.min(totalCredenciales - 1, i + 1))}
                    className="btn-secondary"
                    disabled={credencialesIndice >= totalCredenciales - 1}
                  >
                    Siguiente →
                  </button>
                </div>
              )}
              <div className="credenciales-footer-actions">
                <button type="button" onClick={copiarCredenciales} className="btn-primary btn-copy-all">
                  📋 Copiar credenciales
                </button>
                <button type="button" onClick={cerrarCredenciales} className="btn-secondary">
                  {hayVariosCredenciales && credencialesIndice < totalCredenciales - 1
                    ? 'Cerrar recorrido'
                    : 'Cerrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionarUsuarios;
