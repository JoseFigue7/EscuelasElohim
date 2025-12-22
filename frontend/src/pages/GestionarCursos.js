import React, { useState, useEffect } from 'react';
import { cursoService } from '../services/api';
import './GestionarCursos.css';

const GestionarCursos = () => {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCurso, setEditingCurso] = useState(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    activo: true,
  });

  useEffect(() => {
    loadCursos();
  }, []);

  const loadCursos = async () => {
    try {
      setLoading(true);
      const response = await cursoService.getAll();
      setCursos(response.data.results || response.data);
    } catch (err) {
      console.error('Error al cargar cursos:', err);
      alert('Error al cargar cursos');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCurso) {
        await cursoService.update(editingCurso.id, formData);
      } else {
        await cursoService.create(formData);
      }
      resetForm();
      loadCursos();
    } catch (err) {
      alert('Error al guardar curso: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (curso) => {
    setEditingCurso(curso);
    setFormData({
      nombre: curso.nombre,
      descripcion: curso.descripcion || '',
      activo: curso.activo,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este curso? Esta acción no se puede deshacer.')) {
      return;
    }
    try {
      await cursoService.delete(id);
      loadCursos();
    } catch (err) {
      alert('Error al eliminar curso: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleToggleActivo = async (curso) => {
    try {
      await cursoService.update(curso.id, { ...curso, activo: !curso.activo });
      loadCursos();
    } catch (err) {
      alert('Error al actualizar curso');
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      activo: true,
    });
    setEditingCurso(null);
    setShowForm(false);
  };

  if (loading) {
    return <div className="loading">Cargando cursos...</div>;
  }

  return (
    <div className="gestionar-cursos">
      <div className="header-actions">
        <div>
          <h1>Gestión de Cursos</h1>
          <p style={{margin: '8px 0 0 0', opacity: 0.95, fontSize: '1rem'}}>Administra los cursos disponibles</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary btn-large" style={{background: 'white', color: '#667eea'}}>
          <span className="btn-icon">+</span>
          {showForm ? 'Cancelar' : 'Nuevo Curso'}
        </button>
      </div>

      {showForm && (
        <div className="curso-form">
          <h2>{editingCurso ? 'Editar Curso' : 'Nuevo Curso'}</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nombre del Curso *</label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                placeholder="Ej: Escuela de Corderitos"
                required
              />
            </div>

            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                rows={4}
                placeholder="Descripción del curso..."
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                />
                <span>Curso Activo</span>
              </label>
              <small>Los cursos inactivos no aparecerán para nuevas promociones</small>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">
                {editingCurso ? 'Actualizar Curso' : 'Crear Curso'}
              </button>
              <button type="button" onClick={resetForm} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="cursos-grid">
        {cursos.length === 0 ? (
          <div className="empty-state">
            <p>No hay cursos creados. Crea tu primer curso para comenzar.</p>
          </div>
        ) : (
          cursos.map((curso) => (
            <div key={curso.id} className="curso-card">
              <div className="curso-header">
                <h3>{curso.nombre}</h3>
                <span className={`badge ${curso.activo ? 'activo' : 'inactivo'}`}>
                  {curso.activo ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {curso.descripcion && (
                <p className="curso-descripcion">{curso.descripcion}</p>
              )}

              <div className="curso-info">
                <p className="info-item">
                  <span className="label">Creado:</span>
                  <span>{new Date(curso.fecha_creacion).toLocaleDateString()}</span>
                </p>
              </div>

              <div className="curso-actions">
                <button
                  onClick={() => handleToggleActivo(curso)}
                  className={`btn-toggle ${curso.activo ? 'desactivar' : 'activar'}`}
                >
                  {curso.activo ? 'Desactivar' : 'Activar'}
                </button>
                <button onClick={() => handleEdit(curso)} className="btn-edit">
                  Editar
                </button>
                <button onClick={() => handleDelete(curso.id)} className="btn-delete">
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

export default GestionarCursos;

