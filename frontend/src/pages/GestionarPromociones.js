import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { promocionService, cursoService } from '../services/api';
import './GestionarPromociones.css';

const GestionarPromociones = () => {
  const [promociones, setPromociones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromocion, setEditingPromocion] = useState(null);
  const [formData, setFormData] = useState({
    curso: '',
    nombre: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    activa: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promocionesResponse, cursosResponse] = await Promise.all([
        promocionService.getAll(),
        cursoService.getAll(),
      ]);
      setPromociones(promocionesResponse.data.results || promocionesResponse.data);
      setCursos(cursosResponse.data.results || cursosResponse.data);
    } catch (err) {
      console.error('Error al cargar promociones:', err);
      alert('Error al cargar promociones');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Preparar los datos para enviar
      const dataToSend = {
        curso: parseInt(formData.curso),
        nombre: formData.nombre,
        descripcion: formData.descripcion || '',
        fecha_inicio: formData.fecha_inicio,
        activa: formData.activa,
      };
      
      // Solo incluir fecha_fin si tiene valor
      if (formData.fecha_fin) {
        dataToSend.fecha_fin = formData.fecha_fin;
      }
      
      if (editingPromocion) {
        await promocionService.update(editingPromocion.id, dataToSend);
      } else {
        await promocionService.create(dataToSend);
      }
      resetForm();
      loadData();
    } catch (err) {
      console.error('Error completo:', err.response?.data);
      alert('Error al guardar promoción: ' + (err.response?.data?.detail || err.response?.data?.curso || err.message));
    }
  };

  const handleEdit = (promocion) => {
    setEditingPromocion(promocion);
    setFormData({
      curso: promocion.curso,
      nombre: promocion.nombre,
      descripcion: promocion.descripcion || '',
      fecha_inicio: promocion.fecha_inicio ? promocion.fecha_inicio.split('T')[0] : '',
      fecha_fin: promocion.fecha_fin ? promocion.fecha_fin.split('T')[0] : '',
      activa: promocion.activa,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta promoción? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await promocionService.delete(id);
      loadData();
    } catch (err) {
      alert('Error al eliminar promoción: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleActiva = async (promocion) => {
    try {
      await promocionService.update(promocion.id, { ...promocion, activa: !promocion.activa });
      loadData();
    } catch (err) {
      alert('Error al actualizar promoción');
    }
  };

  const resetForm = () => {
    setFormData({
      curso: '',
      nombre: '',
      descripcion: '',
      fecha_inicio: '',
      fecha_fin: '',
      activa: true,
    });
    setEditingPromocion(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Cargando promociones...</div>;
  }

  return (
    <div className="gestionar-promociones">
      <div className="header-actions">
        <div>
          <h1>Gestión de Promociones</h1>
          <p style={{margin: '8px 0 0 0', opacity: 0.95, fontSize: '1rem'}}>Administra las promociones de los cursos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-large" style={{background: 'white', color: '#667eea'}}>
          <span className="btn-icon">+</span>
          {showForm ? 'Cancelar' : 'Nueva Promoción'}
        </button>
      </div>

      {showForm && (
        <div className="promocion-form">
          <h2>{editingPromocion ? 'Editar Promoción' : 'Nueva Promoción'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Curso *</label>
              <select
                value={formData.curso}
                onChange={(e) => setFormData({ ...formData, curso: e.target.value })}
                required
              >
                <option value="">Seleccionar curso...</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Nombre de la Promoción *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Promoción 2024"
                required
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={4}
                placeholder="Descripción de la promoción..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Fecha de Inicio *</label>
                <input
                  type="date"
                  value={formData.fecha_inicio}
                  onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha de Fin (opcional)</label>
                <input
                  type="date"
                  value={formData.fecha_fin}
                  onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.activa}
                  onChange={(e) => setFormData({ ...formData, activa: e.target.checked })}
                />
                <span>Promoción Activa</span>
              </label>
              <small>Las promociones inactivas no aparecerán para nuevas inscripciones</small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingPromocion ? 'Actualizar Promoción' : 'Crear Promoción'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="promociones-grid">
        {promociones.length === 0 ? (
          <div className="empty-state">
            <p>No hay promociones creadas. Crea tu primera promoción para comenzar.</p>
          </div>
        ) : (
          promociones.map((promocion) => (
            <div key={promocion.id} className="promocion-card">
              <div className="promocion-header">
                <div>
                  <h3>{promocion.nombre}</h3>
                  <p className="promocion-curso">{promocion.curso_nombre || 'Curso no especificado'}</p>
                </div>
                <span className={`badge ${promocion.activa ? 'activo' : 'inactivo'}`}>
                  {promocion.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {promocion.descripcion && (
                <p className="promocion-descripcion">{promocion.descripcion}</p>
              )}

              <div className="promocion-info">
                <p className="info-item">
                  <span className="label">Inicio:</span>
                  <span>{new Date(promocion.fecha_inicio).toLocaleDateString()}</span>
                </p>
                {promocion.fecha_fin && (
                  <p className="info-item">
                    <span className="label">Fin:</span>
                    <span>{new Date(promocion.fecha_fin).toLocaleDateString()}</span>
                  </p>
                )}
                {promocion.docente_nombre && (
                  <p className="info-item">
                    <span className="label">Docente:</span>
                    <span>{promocion.docente_nombre}</span>
                  </p>
                )}
                <p className="info-item">
                  <span className="label">Creada:</span>
                  <span>{new Date(promocion.fecha_creacion).toLocaleDateString()}</span>
                </p>
              </div>

              <div className="promocion-actions">
                <Link
                  to={`/promociones/${promocion.id}/gestion`}
                  className="btn-manage"
                >
                  Gestionar
                </Link>
                <button
                  onClick={() => handleToggleActiva(promocion)}
                  className={`btn-toggle ${promocion.activa ? 'desactivar' : 'activar'}`}
                >
                  {promocion.activa ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => handleEdit(promocion)} className="btn-edit">
                  Editar
                </button>
                <button onClick={() => handleDelete(promocion.id)} className="btn-delete">
                  Eliminar
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GestionarPromociones;

