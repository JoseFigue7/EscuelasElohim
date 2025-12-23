import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { examenService } from '../services/api';
import './TemaExamenes.css';

const ExamenesList = () => {
  const [examenes, setExamenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExamenes();
  }, []);

  const loadExamenes = async () => {
    try {
      setLoading(true);
      // Llamar sin parámetro de tema para obtener todos los exámenes activos disponibles
      const response = await examenService.getAll();
      setExamenes(response.data.results || response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar los exámenes');
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

      <div className="examenes-list">
        {examenes.map((examen) => {
          return (
            <div key={examen.id} className="examen-card">
              <div className="examen-header">
                <h3>{examen.titulo || `Examen de ${examen.tema_titulo}`}</h3>
                <span className="curso-badge">{examen.curso_nombre}</span>
              </div>
              {examen.descripcion && <p>{examen.descripcion}</p>}
              
              <div className="examen-info">
                <p><strong>Tema:</strong> {examen.tema_titulo}</p>
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
                {examen.numero_preguntas && (
                  <span>Preguntas: {examen.numero_preguntas}</span>
                )}
                {examen.puntos_por_pregunta && (
                  <span>Puntos por pregunta: {examen.puntos_por_pregunta}</span>
                )}
              </div>

              <Link to={`/examenes/${examen.id}`} className="btn-tomar-examen">
                Tomar Examen
              </Link>
            </div>
          );
        })}
      </div>

      {examenes.length === 0 && (
        <div className="empty-state">
          <p>No hay exámenes disponibles en este momento.</p>
        </div>
      )}
    </div>
  );
};

export default ExamenesList;

