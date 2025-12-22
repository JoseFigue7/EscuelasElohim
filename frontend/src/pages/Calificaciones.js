import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { calificacionService } from '../services/api';
import './Calificaciones.css';

const Calificaciones = () => {
  const location = useLocation();
  const examenId = location.state?.examenId;
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCalificaciones();
  }, [examenId]);

  const loadCalificaciones = async () => {
    try {
      setLoading(true);
      const params = examenId ? { examen: examenId } : {};
      const response = await calificacionService.getAll(examenId);
      setCalificaciones(response.data.results || response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar las calificaciones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getCalificacionClass = (porcentaje) => {
    if (porcentaje >= 70) return 'aprobado';
    if (porcentaje >= 50) return 'regular';
    return 'reprobado';
  };

  if (loading) {
    return <div className="loading">Cargando calificaciones...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="calificaciones">
      <h1>Mis Calificaciones</h1>

      {calificaciones.length === 0 ? (
        <div className="empty-state">
          <p>No tienes calificaciones registradas aún.</p>
        </div>
      ) : (
        <div className="calificaciones-list">
          {calificaciones.map((calificacion) => (
            <div
              key={calificacion.id}
              className={`calificacion-card ${getCalificacionClass(
                parseFloat(calificacion.porcentaje)
              )}`}
            >
              <h3>{calificacion.examen_titulo}</h3>
              <div className="calificacion-details">
                <div className="puntaje">
                  <span className="label">Puntaje:</span>
                  <span className="value">
                    {calificacion.puntaje_obtenido} / {calificacion.puntaje_total}
                  </span>
                </div>
                <div className="porcentaje">
                  <span className="label">Calificación:</span>
                  <span className="value">
                    {parseFloat(calificacion.porcentaje).toFixed(2)}%
                  </span>
                </div>
                <div className="fecha">
                  <span className="label">Fecha:</span>
                  <span className="value">
                    {new Date(calificacion.fecha_completado).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Calificaciones;


