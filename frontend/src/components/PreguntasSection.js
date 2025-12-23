import React, { useState, useEffect } from 'react';
import { preguntaService } from '../services/api';

const PreguntasSection = ({ temas, onRefresh }) => {
  const [selectedTema, setSelectedTema] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPregunta, setEditingPregunta] = useState(null);
  const [formData, setFormData] = useState({
    pregunta_texto: '',
    tipo_pregunta: 'opcion_multiple',
    opcion_a: '',
    opcion_b: '',
    opcion_c: '',
    opcion_d: '',
    respuesta_correcta: '',
    puntos: 1,
  });

  useEffect(() => {
    if (selectedTema) {
      loadPreguntas();
    }
  }, [selectedTema]);

  const loadPreguntas = async () => {
    if (!selectedTema) return;
    try {
      setLoading(true);
      const response = await preguntaService.getAll(selectedTema.id);
      setPreguntas(response.data.results || response.data);
    } catch (err) {
      console.error('Error al cargar preguntas:', err);
      alert('Error al cargar preguntas');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTema = (tema) => {
    setSelectedTema(tema);
    setShowForm(false);
    setEditingPregunta(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTema) return;

    try {
      if (editingPregunta) {
        await preguntaService.update(editingPregunta.id, { ...formData, tema: selectedTema.id });
      } else {
        await preguntaService.create({ ...formData, tema: selectedTema.id });
      }
      resetForm();
      loadPreguntas();
    } catch (err) {
      alert('Error al guardar pregunta: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEdit = (pregunta) => {
    setEditingPregunta(pregunta);
    setFormData({
      pregunta_texto: pregunta.pregunta_texto || '',
      tipo_pregunta: pregunta.tipo_pregunta || 'opcion_multiple',
      opcion_a: pregunta.opcion_a || '',
      opcion_b: pregunta.opcion_b || '',
      opcion_c: pregunta.opcion_c || '',
      opcion_d: pregunta.opcion_d || '',
      respuesta_correcta: pregunta.respuesta_correcta || '',
      puntos: pregunta.puntos || 1,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    try {
      await preguntaService.delete(id);
      loadPreguntas();
    } catch (err) {
      alert('Error al eliminar pregunta');
    }
  };

  const resetForm = () => {
    setFormData({
      pregunta_texto: '',
      tipo_pregunta: 'opcion_multiple',
      opcion_a: '',
      opcion_b: '',
      opcion_c: '',
      opcion_d: '',
      respuesta_correcta: '',
      puntos: 1,
    });
    setShowForm(false);
    setEditingPregunta(null);
  };

  return (
    <div className="preguntas-section">
      <div className="section-header">
        <h2>Banco de Preguntas</h2>
        <p style={{margin: '8px 0 0 0', color: '#666', fontSize: '0.95rem'}}>
          Selecciona un tema para gestionar su banco de preguntas
        </p>
      </div>

      {!selectedTema ? (
        <div className="temas-list">
          {temas.map((tema) => (
            <div
              key={tema.id}
              className="tema-item"
              onClick={() => handleSelectTema(tema)}
              style={{cursor: 'pointer'}}
            >
              <div>
                <h3>Tema {tema.numero_tema}: {tema.titulo}</h3>
              </div>
              <span>→</span>
            </div>
          ))}
          {temas.length === 0 && (
            <p className="empty-state">Crea temas primero para agregar preguntas.</p>
          )}
        </div>
      ) : (
        <div>
          <div className="section-header" style={{marginBottom: '20px'}}>
            <div>
              <button onClick={() => setSelectedTema(null)} className="btn-secondary" style={{marginRight: '10px'}}>
                ← Volver a temas
              </button>
              <h2 style={{display: 'inline'}}>Preguntas - Tema {selectedTema.numero_tema}: {selectedTema.titulo}</h2>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? 'Cancelar' : '+ Nueva Pregunta'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="new-form">
              <div className="form-group">
                <label>Pregunta *</label>
                <textarea
                  value={formData.pregunta_texto}
                  onChange={(e) => setFormData({ ...formData, pregunta_texto: e.target.value })}
                  rows={3}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Tipo de Pregunta *</label>
                  <select
                    value={formData.tipo_pregunta}
                    onChange={(e) => setFormData({ ...formData, tipo_pregunta: e.target.value })}
                    required
                  >
                    <option value="opcion_multiple">Opción Múltiple</option>
                    <option value="verdadero_falso">Verdadero/Falso</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Puntos *</label>
                  <input
                    type="number"
                    value={formData.puntos}
                    onChange={(e) => setFormData({ ...formData, puntos: parseInt(e.target.value) || 1 })}
                    min="1"
                    required
                  />
                </div>
              </div>

              {formData.tipo_pregunta === 'opcion_multiple' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Opción A *</label>
                      <input
                        type="text"
                        value={formData.opcion_a}
                        onChange={(e) => setFormData({ ...formData, opcion_a: e.target.value })}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Opción B *</label>
                      <input
                        type="text"
                        value={formData.opcion_b}
                        onChange={(e) => setFormData({ ...formData, opcion_b: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Opción C</label>
                      <input
                        type="text"
                        value={formData.opcion_c}
                        onChange={(e) => setFormData({ ...formData, opcion_c: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Opción D</label>
                      <input
                        type="text"
                        value={formData.opcion_d}
                        onChange={(e) => setFormData({ ...formData, opcion_d: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Respuesta Correcta *</label>
                    <select
                      value={formData.respuesta_correcta}
                      onChange={(e) => setFormData({ ...formData, respuesta_correcta: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar...</option>
                      <option value="a">A</option>
                      <option value="b">B</option>
                      {formData.opcion_c && <option value="c">C</option>}
                      {formData.opcion_d && <option value="d">D</option>}
                    </select>
                  </div>
                </>
              )}

              {formData.tipo_pregunta === 'verdadero_falso' && (
                <div className="form-group">
                  <label>Respuesta Correcta *</label>
                  <select
                    value={formData.respuesta_correcta}
                    onChange={(e) => setFormData({ ...formData, respuesta_correcta: e.target.value })}
                    required
                  >
                    <option value="">Seleccionar...</option>
                    <option value="verdadero">Verdadero</option>
                    <option value="falso">Falso</option>
                  </select>
                </div>
              )}

              <button type="submit" className="btn-primary">
                {editingPregunta ? 'Actualizar Pregunta' : 'Crear Pregunta'}
              </button>
            </form>
          )}

          {loading ? (
            <p>Cargando preguntas...</p>
          ) : (
            <div className="preguntas-list">
              {preguntas.map((pregunta) => (
                <div key={pregunta.id} className="pregunta-item">
                  <div style={{flex: 1}}>
                    <h4>{pregunta.pregunta_texto}</h4>
                    <p style={{color: '#666', fontSize: '0.9rem', marginTop: '8px'}}>
                      Tipo: {pregunta.tipo_pregunta === 'opcion_multiple' ? 'Opción Múltiple' : 'Verdadero/Falso'} | 
                      Puntos: {pregunta.puntos}
                    </p>
                    {pregunta.tipo_pregunta === 'opcion_multiple' && (
                      <div style={{marginTop: '12px', fontSize: '0.9rem'}}>
                        {pregunta.opcion_a && <p><strong>A:</strong> {pregunta.opcion_a}</p>}
                        {pregunta.opcion_b && <p><strong>B:</strong> {pregunta.opcion_b}</p>}
                        {pregunta.opcion_c && <p><strong>C:</strong> {pregunta.opcion_c}</p>}
                        {pregunta.opcion_d && <p><strong>D:</strong> {pregunta.opcion_d}</p>}
                        <p style={{marginTop: '8px', color: '#28a745'}}><strong>Respuesta correcta: {pregunta.respuesta_correcta?.toUpperCase()}</strong></p>
                      </div>
                    )}
                  </div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={() => handleEdit(pregunta)} className="btn-edit">Editar</button>
                    <button onClick={() => handleDelete(pregunta.id)} className="btn-delete">Eliminar</button>
                  </div>
                </div>
              ))}
              {preguntas.length === 0 && (
                <p className="empty-state">No hay preguntas en el banco. Agrega preguntas para que los estudiantes puedan realizar exámenes.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PreguntasSection;



