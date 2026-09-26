import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { promedioService } from '../services/api';
import './Calificaciones.css';

const Calificaciones = () => {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadNotas = useCallback(async () => {
    try {
      setLoading(true);
      const response = await promedioService.getMisNotas();
      setCursos(Array.isArray(response.data) ? response.data : []);
      setError('');
    } catch (err) {
      setError('Error al cargar tus notas y promedio');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotas();
  }, [loadNotas]);

  if (loading) {
    return <div className="loading">Cargando calificaciones...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="calificaciones">
      <h1>Mis Calificaciones</h1>
      <p className="calificaciones-intro">
        Promedio sobre todos los exámenes del curso. Si no presentaste un examen, cuenta como 0%.
        El curso se aprueba con promedio ≥ 70%.
      </p>

      {cursos.length === 0 ? (
        <div className="empty-state">
          <p>No estás inscrito en ninguna promoción activa.</p>
        </div>
      ) : (
        <div className="cursos-notas-list">
          {cursos.map((curso) => {
            const promedio = Number(curso.promedio_final) || 0;
            const aprobado = Boolean(curso.aprobado);
            return (
              <section key={curso.promocion_id} className="curso-notas-card">
                <div className="curso-notas-header">
                  <div>
                    <h2>{curso.promocion_nombre}</h2>
                    <p className="curso-name">{curso.curso_nombre}</p>
                  </div>
                  <div className={`promedio-badge ${aprobado ? 'aprobado' : 'reprobado'}`}>
                    <span className="promedio-label">Promedio</span>
                    <span className="promedio-value">{promedio.toFixed(2)}%</span>
                    <span className="promedio-estado">
                      {aprobado ? 'Aprobado' : 'Reprobado'}
                    </span>
                  </div>
                </div>

                <div className="notas-table-wrapper">
                  <table className="notas-table">
                    <thead>
                      <tr>
                        <th>Tema / Examen</th>
                        <th>Nota</th>
                        <th>Estado</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(curso.notas || []).map((nota) => (
                        <tr key={`${curso.promocion_id}-${nota.examen_id}`}>
                          <td>
                            <strong>{nota.tema_titulo}</strong>
                            {nota.es_recuperacion && (
                              <span className="badge-rec">Recuperación</span>
                            )}
                          </td>
                          <td>
                            <span
                              className={`nota-pct ${
                                nota.estado === 'aprobado'
                                  ? 'ok'
                                  : nota.estado === 'no_presentado'
                                  ? 'pendiente'
                                  : 'fail'
                              }`}
                            >
                              {Number(nota.porcentaje).toFixed(0)}%
                            </span>
                          </td>
                          <td>
                            {nota.estado === 'no_presentado' && 'No presentado'}
                            {nota.estado === 'aprobado' && 'Aprobado'}
                            {nota.estado === 'reprobado' && 'Reprobado'}
                          </td>
                          <td>
                            {nota.puede_revisar && nota.calificacion_id ? (
                              <Link
                                to={`/calificaciones/${nota.calificacion_id}/revisar`}
                                className="btn-revisar-examen"
                              >
                                Ver incorrectas
                              </Link>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                      {(!curso.notas || curso.notas.length === 0) && (
                        <tr>
                          <td colSpan={4}>Este curso aún no tiene exámenes.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <p className="curso-notas-foot">
                  {curso.total_examenes} examen{curso.total_examenes !== 1 ? 'es' : ''} en el curso
                </p>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Calificaciones;
