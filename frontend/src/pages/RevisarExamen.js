import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { calificacionService } from '../services/api';
import './RevisarExamen.css';

/** Evita mostrar la misma opción como errónea y correcta (clave corregida después del intento). */
const sigueIncorrecta = (respuesta) => {
  const dada = (respuesta.respuesta_dada || '').toLowerCase().trim();
  const dadaTexto = respuesta.respuesta_dada_texto || '';
  const correctaTexto = respuesta.respuesta_correcta_texto || '';

  if (dadaTexto && correctaTexto && dadaTexto === correctaTexto) {
    return false;
  }
  if (dada && correctaTexto.toLowerCase().startsWith(`${dada})`)) {
    return false;
  }
  return true;
};

const RevisarExamen = () => {
  const { id } = useParams();
  const [revision, setRevision] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRevision = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const response = await calificacionService.revisar(id);
      setRevision(response.data);
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Error al cargar la revisión del examen';
      setError(message);
      setRevision(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadRevision();
  }, [loadRevision]);

  if (loading) {
    return <div className="loading">Cargando revisión...</div>;
  }

  if (error) {
    return (
      <div className="revisar-examen">
        <Link to="/calificaciones" className="back-link">
          ← Volver a mis calificaciones
        </Link>
        <div className="error">{error}</div>
      </div>
    );
  }

  const respuestas = (revision?.respuestas_incorrectas || []).filter(sigueIncorrecta);

  return (
    <div className="revisar-examen">
      <Link to="/calificaciones" className="back-link">
        ← Volver a mis calificaciones
      </Link>

      <h1>Revisión del examen</h1>
      <p className="revisar-subtitulo">
        {revision?.examen_titulo}
        {revision?.tema_titulo ? ` — ${revision.tema_titulo}` : ''}
      </p>

      {respuestas.length === 0 ? (
        <div className="revisar-empty">
          <p>No tuviste respuestas incorrectas en este examen. ¡Excelente trabajo!</p>
        </div>
      ) : (
        <div className="revisar-lista">
          {respuestas.map((respuesta, index) => (
            <div key={respuesta.id} className="revisar-card">
              <h3>Pregunta {index + 1}</h3>
              <p className="revisar-pregunta">{respuesta.pregunta_texto}</p>

              <div className="revisar-respuestas">
                <div className="revisar-respuesta incorrecta">
                  <span className="revisar-label">Tu respuesta</span>
                  <span className="revisar-valor">{respuesta.respuesta_dada_texto}</span>
                </div>
                <div className="revisar-respuesta correcta">
                  <span className="revisar-label">Respuesta correcta</span>
                  <span className="revisar-valor">{respuesta.respuesta_correcta_texto}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RevisarExamen;
