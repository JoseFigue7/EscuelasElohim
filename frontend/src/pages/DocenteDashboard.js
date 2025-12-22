import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { promocionService, cursoService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

const DocenteDashboard = () => {
  const [promociones, setPromociones] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showNewPromocion, setShowNewPromocion] = useState(false);
  const [newPromocion, setNewPromocion] = useState({
    curso: '',
    nombre: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promResponse, cursosResponse] = await Promise.all([
        promocionService.getAll(),
        cursoService.getAll(),
      ]);
      setPromociones(promResponse.data.results || promResponse.data);
      setCursos(cursosResponse.data.results || cursosResponse.data);
      setError('');
    } catch (err) {
      setError('Error al cargar los datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePromocion = async (e) => {
    e.preventDefault();
    try {
      await promocionService.create(newPromocion);
      setShowNewPromocion(false);
      setNewPromocion({
        curso: '',
        nombre: '',
        descripcion: '',
        fecha_inicio: '',
        fecha_fin: '',
      });
      loadData();
    } catch (err) {
      alert('Error al crear la promoción: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Panel de Docente</h1>
        <div className="header-buttons">
          <Link to="/cursos" className="btn-secondary" style={{textDecoration: 'none', marginRight: '10px'}}>
            Gestionar Cursos
          </Link>
          <button
            onClick={() => setShowNewPromocion(!showNewPromocion)}
            className="btn-primary"
          >
            {showNewPromocion ? 'Cancelar' : '+ Nueva Promoción'}
          </button>
        </div>
      </div>

      {showNewPromocion && (
        <div className="new-promocion-form">
          <h2>Crear Nueva Promoción</h2>
          <form onSubmit={handleCreatePromocion}>
            <div className="form-group">
              <label>Curso</label>
              <select
                value={newPromocion.curso}
                onChange={(e) =>
                  setNewPromocion({ ...newPromocion, curso: e.target.value })
                }
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
              <label>Nombre de la Promoción</label>
              <input
                type="text"
                value={newPromocion.nombre}
                onChange={(e) =>
                  setNewPromocion({ ...newPromocion, nombre: e.target.value })
                }
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={newPromocion.descripcion}
                onChange={(e) =>
                  setNewPromocion({ ...newPromocion, descripcion: e.target.value })
                }
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha de Inicio</label>
                <input
                  type="date"
                  value={newPromocion.fecha_inicio}
                  onChange={(e) =>
                    setNewPromocion({
                      ...newPromocion,
                      fecha_inicio: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha de Fin (opcional)</label>
                <input
                  type="date"
                  value={newPromocion.fecha_fin}
                  onChange={(e) =>
                    setNewPromocion({ ...newPromocion, fecha_fin: e.target.value })
                  }
                />
              </div>
            </div>
            <button type="submit" className="btn-primary">
              Crear Promoción
            </button>
          </form>
        </div>
      )}

      <h2>Mis Promociones</h2>
      {promociones.length === 0 ? (
        <div className="empty-state">
          <p>No tienes promociones creadas. Crea una nueva promoción para comenzar.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {promociones.map((promocion) => (
            <Link
              key={promocion.id}
              to={`/promociones/${promocion.id}/gestion`}
              className="card"
            >
              <h2>{promocion.nombre}</h2>
              <p className="curso-name">{promocion.curso_nombre}</p>
              <div className="card-footer">
                <span>
                  Inicio: {new Date(promocion.fecha_inicio).toLocaleDateString()}
                </span>
                {promocion.fecha_fin && (
                  <span>
                    Fin: {new Date(promocion.fecha_fin).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default DocenteDashboard;

