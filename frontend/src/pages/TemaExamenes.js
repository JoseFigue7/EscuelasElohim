import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { examenService } from '../services/api';
import './TemaExamenes.css';

const TemaExamenes = () => {
  const { id } = useParams();
  const [examenes, setExamenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExamenes();
  }, [id]);

  const loadExamenes = async () => {
    try {
      setLoading(true);
      const response = await examenService.getAll(id);
      setExamenes(response.data.results || response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar los exámenes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const isExamenDisponible = (examen) => {
    if (!examen.activo) return false;
    const now = new Date();
    if (examen.fecha_inicio && new Date(examen.fecha_inicio) > now) return false;
    if (examen.fecha_fin && new Date(examen.fecha_fin) < now) return false;
    return true;
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="tema-examenes">
      <Link to="/" className="back-link">← Volver a mis cursos</Link>
      <h1>Exámenes</h1>

      <div className="examenes-list">
        {examenes.map((examen) => {
          const disponible = isExamenDisponible(examen);
          return (
            <div key={examen.id} className={`examen-card ${!disponible ? 'disabled' : ''}`}>
              <h3>{examen.titulo}</h3>
              {examen.descripcion && <p>{examen.descripcion}</p>}
              
              <div className="examen-info">
                {examen.fecha_inicio && (
                  <span>
                    Inicio: {new Date(examen.fecha_inicio).toLocaleString()}
                  </span>
                )}
                {examen.fecha_fin && (
                  <span>
                    Fin: {new Date(examen.fecha_fin).toLocaleString()}
                  </span>
                )}
                {examen.tiempo_limite && (
                  <span>Tiempo límite: {examen.tiempo_limite} minutos</span>
                )}
              </div>

              {disponible ? (
                <Link to={`/examenes/${examen.id}`} className="btn-tomar-examen">
                  Tomar Examen
                </Link>
              ) : (
                <div className="examen-no-disponible">
                  {!examen.activo
                    ? 'Examen no activo'
                    : examen.fecha_inicio && new Date(examen.fecha_inicio) > new Date()
                    ? 'Examen aún no disponible'
                    : 'Examen ya finalizado'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {examenes.length === 0 && (
        <div className="empty-state">
          <p>No hay exámenes disponibles para este tema.</p>
        </div>
      )}
    </div>
  );
};

export default TemaExamenes;



