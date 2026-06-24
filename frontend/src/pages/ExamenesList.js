import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { examenService, recuperacionService, unwrapList } from '../services/api';
import './TemaExamenes.css';

const ExamenesList = () => {
  const [examenes, setExamenes] = useState([]);
  const [recuperaciones, setRecuperaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExamenes();
  }, []);

  const loadExamenes = async () => {
    try {
      setLoading(true);
      setError('');

      const examenesResponse = await examenService.getAll();
      setExamenes(unwrapList(examenesResponse));

      try {
        const recuperacionesResponse = await recuperacionService.getMisDisponibles();
        const data = recuperacionesResponse.data;
        setRecuperaciones(Array.isArray(data) ? data : []);
      } catch (recErr) {
        console.warn('No se pudieron cargar recuperaciones:', recErr);
        setRecuperaciones([]);
      }
    } catch (err) {
      setError('Error al cargar los exámenes');
      setExamenes([]);
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
    <div className="tema-examenes">
      <Link to="/" className="back-link">← Volver a mis cursos</Link>
      <h1>Exámenes Disponibles</h1>

      {recuperaciones.length > 0 && (
        <section className="recuperaciones-alumno-section">
          <h2>🔄 Recuperaciones asignadas</h2>
          <p className="section-hint">
            Exámenes de recuperación asignados por tu profesor (mismo examen del tema).
          </p>
          <div className="examenes-list">
            {recuperaciones.map((rec) => (
              <div key={rec.id} className="examen-card examen-card--recuperacion">
                <div className="examen-header">
                  <h3>{rec.examen_titulo || rec.tema_titulo}</h3>
                  <span className="badge warning">Recuperación #{rec.numero_recuperacion}</span>
                </div>
                {rec.curso_nombre && <span className="curso-badge">{rec.curso_nombre}</span>}
                <div className="examen-info">
                  <p><strong>Tema:</strong> {rec.tema_titulo}</p>
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
                  to={`/examenes/${rec.examen_id}?recuperacion=${rec.id}`}
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
        {recuperaciones.length > 0 && <h2>Exámenes regulares</h2>}
        <div className="examenes-list">
          {examenes.map((examen) => (
            <div key={examen.id} className="examen-card">
              <div className="examen-header">
                <h3>{examen.titulo || `Examen de ${examen.tema_titulo}`}</h3>
                <span className="curso-badge">{examen.curso_nombre}</span>
              </div>
              {examen.descripcion && <p>{examen.descripcion}</p>}

              <div className="examen-info">
                <p><strong>Tema:</strong> {examen.tema_titulo}</p>
                {examen.fecha_inicio && (
                  <span>Inicio: {new Date(examen.fecha_inicio).toLocaleString()}</span>
                )}
                {examen.fecha_fin && (
                  <span>Fin: {new Date(examen.fecha_fin).toLocaleString()}</span>
                )}
                {examen.numero_preguntas && (
                  <span>Preguntas: {examen.numero_preguntas}</span>
                )}
              </div>

              <Link to={`/examenes/${examen.id}`} className="btn-tomar-examen">
                Tomar Examen
              </Link>
            </div>
          ))}
        </div>
      </section>

      {examenes.length === 0 && recuperaciones.length === 0 && (
        <div className="empty-state">
          <p>No hay exámenes disponibles en este momento.</p>
        </div>
      )}
    </div>
  );
};

export default ExamenesList;
