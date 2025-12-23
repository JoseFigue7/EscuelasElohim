import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { examenService } from '../services/api';
import './TomarExamen.css';

const TomarExamen = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [examen, setExamen] = useState(null);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadExamen();
  }, [id]);

  const loadExamen = async () => {
    try {
      setLoading(true);
      const response = await examenService.getById(id);
      setExamen(response.data);
      // Inicializar respuestas vacías
      const initialRespuestas = {};
      response.data.preguntas.forEach((pregunta) => {
        initialRespuestas[pregunta.id] = '';
      });
      setRespuestas(initialRespuestas);
      setError('');
    } catch (err) {
      setError('Error al cargar el examen');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRespuestaChange = (preguntaId, respuesta) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: respuesta,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validar que todas las preguntas tengan respuesta
    const preguntasSinRespuesta = examen.preguntas.filter(
      (p) => !respuestas[p.id] || respuestas[p.id].trim() === ''
    );

    if (preguntasSinRespuesta.length > 0) {
      if (
        !window.confirm(
          `Tienes ${preguntasSinRespuesta.length} pregunta(s) sin responder. ¿Deseas continuar?`
        )
      ) {
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      // Convertir respuestas al formato esperado
      const respuestasArray = examen.preguntas.map((pregunta) => ({
        pregunta_id: pregunta.id,
        respuesta: respuestas[pregunta.id] || '',
      }));

      await examenService.responder(id, respuestasArray);
      navigate('/calificaciones', { state: { examenId: id } });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al enviar el examen');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando examen...</div>;
  }

  if (error && !examen) {
    return <div className="error">{error}</div>;
  }

  if (!examen) {
    return <div className="error">Examen no encontrado</div>;
  }

  return (
    <div className="tomar-examen">
      <h1>{examen.titulo}</h1>
      {examen.descripcion && <p className="descripcion">{examen.descripcion}</p>}

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        {examen.preguntas.map((pregunta, index) => (
          <div key={pregunta.id} className="pregunta-card">
            <h3>
              Pregunta {index + 1} ({pregunta.puntos} punto{pregunta.puntos !== 1 ? 's' : ''})
            </h3>
            <p className="pregunta-texto">{pregunta.pregunta_texto}</p>

            {pregunta.tipo_pregunta === 'opcion_multiple' && (
              <div className="opciones">
                {pregunta.opcion_a && (
                  <label className="opcion">
                    <input
                      type="radio"
                      name={`pregunta-${pregunta.id}`}
                      value="a"
                      checked={respuestas[pregunta.id] === 'a'}
                      onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                    />
                    <span>A) {pregunta.opcion_a}</span>
                  </label>
                )}
                {pregunta.opcion_b && (
                  <label className="opcion">
                    <input
                      type="radio"
                      name={`pregunta-${pregunta.id}`}
                      value="b"
                      checked={respuestas[pregunta.id] === 'b'}
                      onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                    />
                    <span>B) {pregunta.opcion_b}</span>
                  </label>
                )}
                {pregunta.opcion_c && (
                  <label className="opcion">
                    <input
                      type="radio"
                      name={`pregunta-${pregunta.id}`}
                      value="c"
                      checked={respuestas[pregunta.id] === 'c'}
                      onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                    />
                    <span>C) {pregunta.opcion_c}</span>
                  </label>
                )}
                {pregunta.opcion_d && (
                  <label className="opcion">
                    <input
                      type="radio"
                      name={`pregunta-${pregunta.id}`}
                      value="d"
                      checked={respuestas[pregunta.id] === 'd'}
                      onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                    />
                    <span>D) {pregunta.opcion_d}</span>
                  </label>
                )}
              </div>
            )}

            {pregunta.tipo_pregunta === 'verdadero_falso' && (
              <div className="opciones">
                <label className="opcion">
                  <input
                    type="radio"
                    name={`pregunta-${pregunta.id}`}
                    value="verdadero"
                    checked={respuestas[pregunta.id] === 'verdadero'}
                    onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                  />
                  <span>Verdadero</span>
                </label>
                <label className="opcion">
                  <input
                    type="radio"
                    name={`pregunta-${pregunta.id}`}
                    value="falso"
                    checked={respuestas[pregunta.id] === 'falso'}
                    onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                  />
                  <span>Falso</span>
                </label>
              </div>
            )}

            {pregunta.tipo_pregunta === 'texto' && (
              <textarea
                className="respuesta-texto"
                value={respuestas[pregunta.id] || ''}
                onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                rows={4}
                placeholder="Escribe tu respuesta aquí..."
              />
            )}
          </div>
        ))}

        <div className="examen-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Enviando...' : 'Enviar Examen'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TomarExamen;



