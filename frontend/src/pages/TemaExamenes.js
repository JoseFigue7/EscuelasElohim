import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import { examenService, recuperacionService, calificacionService, unwrapList } from '../services/api';
import './TemaExamenes.css';

const TemaExamenes = () => {
  const { id } = useParams();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const promocionId = searchParams.get('promocion');
  const [examenes, setExamenes] = useState([]);
  const [recuperaciones, setRecuperaciones] = useState([]);
  const [calificaciones, setCalificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadExamenes = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [examenesResponse, recuperacionesResponse, calificacionesResponse] = await Promise.all([
        examenService.getAll(id),
        recuperacionService.getMisDisponibles(id).catch((recErr) => {
          console.warn('No se pudieron cargar recuperaciones:', recErr);
          return { data: [] };
        }),
        calificacionService.getAll(),
      ]);

      setExamenes(unwrapList(examenesResponse));
      const recData = recuperacionesResponse.data;
      setRecuperaciones(Array.isArray(recData) ? recData : []);
      setCalificaciones(unwrapList(calificacionesResponse));
    } catch (err) {
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || 'Error al cargar los exámenes';
      setError(errorMessage);
      setExamenes([]);
      setRecuperaciones([]);
      setCalificaciones([]);
      console.error('Error al cargar exámenes:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadExamenes();
  }, [loadExamenes]);

  const isExamenDisponible = (examen) => {
    if (!examen || typeof examen !== 'object') return false;
    if (!examen.activo) return false;
    const now = new Date();
    if (examen.fecha_inicio && new Date(examen.fecha_inicio) > now) return false;
    if (examen.fecha_fin && new Date(examen.fecha_fin) < now) return false;
    return true;
  };

  const buildTomarExamenUrl = (examenId, recuperacionId) => {
    const params = new URLSearchParams();
    if (promocionId) params.set('promocion', promocionId);
    if (recuperacionId) params.set('recuperacion', recuperacionId);
    const query = params.toString();
    return `/examenes/${examenId}${query ? `?${query}` : ''}`;
  };

  const getCalificacionRevisable = (examenId) => {
    return calificaciones.find(
      (cal) => cal.examen === examenId && cal.puede_revisar
    );
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="tema-examenes">
      <Link
        to={promocionId ? `/promociones/${promocionId}` : '/'}
        className="back-link"
      >
        ← Volver a mis cursos
      </Link>
      <h1>Exámenes</h1>

      {recuperaciones.length > 0 && (
        <section className="recuperaciones-alumno-section">
          <h2>🔄 Recuperaciones asignadas</h2>
          <p className="section-hint">
            Tu profesor te asignó estos exámenes de recuperación (mismo contenido del examen original).
          </p>
          <div className="examenes-list">
            {recuperaciones.map((rec) => (
              <div key={rec.id} className="examen-card examen-card--recuperacion">
                <div className="examen-header">
                  <h3>{rec.examen_titulo || rec.tema_titulo}</h3>
                  <span className="badge warning">Recuperación #{rec.numero_recuperacion}</span>
                </div>
                <div className="examen-info">
                  <span>Tema: {rec.tema_titulo}</span>
                  {rec.fecha_inicio && (
                    <span>Inicio: {new Date(rec.fecha_inicio).toLocaleString()}</span>
                  )}
                  {rec.fecha_fin && (
                    <span>Fin: {new Date(rec.fecha_fin).toLocaleString()}</span>
                  )}
                  {rec.numero_preguntas && (
                    <span>Preguntas: {rec.numero_preguntas}</span>
                  )}
                </div>
                <Link
                  to={buildTomarExamenUrl(rec.examen_id, rec.id)}
                  className="btn-tomar-examen btn-tomar-recuperacion"
                >
                  Tomar Recuperación
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2>{recuperaciones.length > 0 ? 'Exámenes regulares' : 'Exámenes del tema'}</h2>
        <div className="examenes-list">
          {Array.isArray(examenes) && examenes.map((examen) => {
            if (!examen || !examen.id) return null;
            const disponible = isExamenDisponible(examen);
            const calificacionRevisable = getCalificacionRevisable(examen.id);
            return (
              <div key={examen.id} className={`examen-card ${!disponible ? 'disabled' : ''}`}>
                <h3>{examen.titulo || 'Sin título'}</h3>
                {examen.descripcion && <p>{examen.descripcion}</p>}

                <div className="examen-info">
                  {examen.fecha_inicio && (
                    <span>Inicio: {new Date(examen.fecha_inicio).toLocaleString()}</span>
                  )}
                  {examen.fecha_fin && (
                    <span>Fin: {new Date(examen.fecha_fin).toLocaleString()}</span>
                  )}
                  {examen.tiempo_limite && (
                    <span>Tiempo límite: {examen.tiempo_limite} minutos</span>
                  )}
                </div>

                {disponible ? (
                  <Link
                    to={buildTomarExamenUrl(examen.id)}
                    className="btn-tomar-examen"
                  >
                    Tomar Examen
                  </Link>
                ) : calificacionRevisable ? (
                  <Link
                    to={`/calificaciones/${calificacionRevisable.id}/revisar`}
                    className="btn-revisar-examen-tema"
                  >
                    Ver respuestas incorrectas
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
      </section>

      {examenes.length === 0 && recuperaciones.length === 0 && (
        <div className="empty-state">
          <p>No hay exámenes disponibles para este tema.</p>
        </div>
      )}
    </div>
  );
};

export default TemaExamenes;
