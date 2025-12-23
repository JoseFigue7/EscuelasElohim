import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { promocionService } from '../services/api';
import './Dashboard.css';

const AlumnoDashboard = () => {
  const [promociones, setPromociones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPromociones();
  }, []);

  const loadPromociones = async () => {
    try {
      setLoading(true);
      const response = await promocionService.getAll();
      setPromociones(response.data.results || response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar las promociones');
      console.error(err);
    } finally {
      setLoading(false);
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
      <h1>Mis Cursos</h1>
      {promociones.length === 0 ? (
        <div className="empty-state">
          <p>No estás inscrito en ninguna promoción actualmente.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {promociones.map((promocion) => (
            <Link
              key={promocion.id}
              to={`/promociones/${promocion.id}`}
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

export default AlumnoDashboard;



