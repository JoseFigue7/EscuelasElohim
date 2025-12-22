import React, { useState, useEffect } from 'react';
import { examenService } from '../services/api';

const ExamenesSection = ({ temas, onRefresh }) => {
  const [examenes, setExamenes] = useState({});
  const [loading, setLoading] = useState({});
  const [editingExamen, setEditingExamen] = useState(null);
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    numero_preguntas: 10,
    puntos_por_pregunta: 1,
    tiempo_limite: '',
    fecha_inicio: '',
    fecha_fin: '',
    activo: true,
  });

  useEffect(() => {
    loadExamenes();
  }, [temas]);

  const loadExamenes = async () => {
    const nuevosExamenes = {};
    const nuevosLoading = {};

    for (const tema of temas) {
      nuevosLoading[tema.id] = true;
      try {
        const response = await examenService.getAll(tema.id);
        const examenesTema = response.data.results || response.data;
        nuevosExamenes[tema.id] = examenesTema.length > 0 ? examenesTema[0] : null;
      } catch (err) {
        console.error(`Error al cargar examen del tema ${tema.id}:`, err);
        nuevosExamenes[tema.id] = null;
      } finally {
        nuevosLoading[tema.id] = false;
      }
    }

    setExamenes(nuevosExamenes);
    setLoading(nuevosLoading);
  };

  const handleEdit = (tema, examen) => {
    setEditingExamen({ tema, examen });
    if (examen) {
      setFormData({
        titulo: examen.titulo || '',
        descripcion: examen.descripcion || '',
        numero_preguntas: examen.numero_preguntas || 10,
        puntos_por_pregunta: examen.puntos_por_pregunta || 1,
        tiempo_limite: examen.tiempo_limite || '',
        fecha_inicio: examen.fecha_inicio ? examen.fecha_inicio.substring(0, 16) : '',
        fecha_fin: examen.fecha_fin ? examen.fecha_fin.substring(0, 16) : '',
        activo: examen.activo !== undefined ? examen.activo : true,
      });
    } else {
      setFormData({
        titulo: '',
        descripcion: '',
        numero_preguntas: 10,
        puntos_por_pregunta: 1,
        tiempo_limite: '',
        fecha_inicio: '',
        fecha_fin: '',
        activo: true,
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editingExamen) return;

    try {
      const dataToSend = {
        ...formData,
        tema: editingExamen.tema.id,
        numero_preguntas: parseInt(formData.numero_preguntas),
        puntos_por_pregunta: parseInt(formData.puntos_por_pregunta),
        tiempo_limite: formData.tiempo_limite ? parseInt(formData.tiempo_limite) : null,
      };

      if (editingExamen.examen) {
        await examenService.update(editingExamen.examen.id, dataToSend);
      } else {
        await examenService.create(dataToSend);
      }
      resetForm();
      loadExamenes();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error completo:', err.response?.data);
      alert('Error al guardar examen: ' + (err.response?.data?.detail || err.response?.data?.tema || err.message));
    }
  };

  const resetForm = () => {
    setEditingExamen(null);
    setFormData({
      titulo: '',
      descripcion: '',
      numero_preguntas: 10,
      puntos_por_pregunta: 1,
      tiempo_limite: '',
      fecha_inicio: '',
      fecha_fin: '',
      activo: true,
    });
  };

  return (
    <div className="examenes-section">
      <div className="section-header">
        <div>
          <h2>Exámenes</h2>
          <p style={{margin: '4px 0 0 0', color: '#666', fontSize: '0.95rem'}}>
            Cada tema tiene un examen. Se seleccionan {formData.numero_preguntas} preguntas aleatorias del banco.
          </p>
        </div>
      </div>

      {editingExamen && (
        <form onSubmit={handleSubmit} className="new-form" style={{marginBottom: '30px'}}>
          <div className="section-header" style={{marginBottom: '20px'}}>
            <h3>
              {editingExamen.examen ? 'Editar Examen' : 'Crear Examen'} - 
              Tema {editingExamen.tema.numero_tema}: {editingExamen.tema.titulo}
            </h3>
            <button type="button" onClick={resetForm} className="btn-secondary">
              Cancelar
            </button>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Título (opcional)</label>
              <input
                type="text"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Descripción (opcional)</label>
              <input
                type="text"
                value={formData.descripcion}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Número de Preguntas *</label>
              <input
                type="number"
                value={formData.numero_preguntas}
                onChange={(e) => setFormData({ ...formData, numero_preguntas: parseInt(e.target.value) || 10 })}
                min="1"
                required
              />
              <small>Se seleccionarán aleatoriamente del banco</small>
            </div>
            <div className="form-group">
              <label>Puntos por Pregunta *</label>
              <input
                type="number"
                value={formData.puntos_por_pregunta}
                onChange={(e) => setFormData({ ...formData, puntos_por_pregunta: parseInt(e.target.value) || 1 })}
                min="1"
                required
              />
            </div>
            <div className="form-group">
              <label>Tiempo Límite (minutos)</label>
              <input
                type="number"
                value={formData.tiempo_limite}
                onChange={(e) => setFormData({ ...formData, tiempo_limite: e.target.value })}
                min="1"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha y Hora de Inicio *</label>
              <input
                type="datetime-local"
                value={formData.fecha_inicio}
                onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Fecha y Hora de Fin *</label>
              <input
                type="datetime-local"
                value={formData.fecha_fin}
                onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
              />
              <span>Examen Activo</span>
            </label>
          </div>

          <button type="submit" className="btn-primary">
            {editingExamen.examen ? 'Actualizar Examen' : 'Crear Examen'}
          </button>
        </form>
      )}

      <div className="examenes-list">
        {temas.map((tema) => {
          const examen = examenes[tema.id];
          const isLoading = loading[tema.id];

          return (
            <div key={tema.id} className="examen-item">
              <div style={{flex: 1}}>
                <h3>Tema {tema.numero_tema}: {tema.titulo}</h3>
                {isLoading ? (
                  <p>Cargando...</p>
                ) : examen ? (
                  <div style={{marginTop: '12px', fontSize: '0.9rem', color: '#666'}}>
                    <p><strong>Preguntas:</strong> {examen.numero_preguntas} aleatorias</p>
                    <p><strong>Puntos por pregunta:</strong> {examen.puntos_por_pregunta}</p>
                    <p><strong>Puntaje total:</strong> {examen.puntaje_total || (examen.numero_preguntas * examen.puntos_por_pregunta)}</p>
                    {examen.fecha_inicio && (
                      <p><strong>Disponible desde:</strong> {new Date(examen.fecha_inicio).toLocaleString()}</p>
                    )}
                    {examen.fecha_fin && (
                      <p><strong>Disponible hasta:</strong> {new Date(examen.fecha_fin).toLocaleString()}</p>
                    )}
                    <p>
                      <strong>Estado:</strong>{' '}
                      <span className={`badge ${examen.activo ? 'active' : 'inactive'}`}>
                        {examen.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p style={{marginTop: '12px', color: '#888'}}>No hay examen creado para este tema</p>
                )}
              </div>
              <button
                onClick={() => handleEdit(tema, examen)}
                className="btn-primary"
              >
                {examen ? 'Editar Examen' : 'Crear Examen'}
              </button>
            </div>
          );
        })}
        {temas.length === 0 && (
          <p className="empty-state">Crea temas primero para crear exámenes.</p>
        )}
      </div>
    </div>
  );
};

export default ExamenesSection;


