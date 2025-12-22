import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { temaService, inscripcionService, asistenciaService, usuarioService, preguntaService, examenService, promedioService, diplomaService, promocionService } from '../services/api';
import PreguntasSection from '../components/PreguntasSection';
import ExamenesSection from '../components/ExamenesSection';
import './GestionarPromocion.css';

const GestionarPromocion = () => {
  const { id } = useParams();
  const [temas, setTemas] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [promocion, setPromocion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('temas');
  const [showNewTema, setShowNewTema] = useState(false);
  const [showNewInscripcion, setShowNewInscripcion] = useState(false);
  const [showEditPromocion, setShowEditPromocion] = useState(false);
  const [editPromocion, setEditPromocion] = useState({
    nombre: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    activa: true,
  });
  const [newTema, setNewTema] = useState({
    numero_tema: '',
    titulo: '',
    descripcion: '',
    fecha_clase: '',
  });
  const [selectedAlumno, setSelectedAlumno] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promocionResponse, temasResponse, inscripcionesResponse, alumnosResponse] = await Promise.all([
        promocionService.getById(id),
        temaService.getAll(id),
        inscripcionService.getAll(id),
        usuarioService.getAll('alumno'),
      ]);
      setPromocion(promocionResponse.data);
      setTemas(temasResponse.data.results || temasResponse.data);
      setInscripciones(inscripcionesResponse.data.results || inscripcionesResponse.data);
      setAlumnos(alumnosResponse.data.results || alumnosResponse.data);
    } catch (err) {
      console.error('Error al cargar datos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTema = async (e) => {
    e.preventDefault();
    if (!promocion || !promocion.curso) {
      alert('Error: No se pudo obtener el curso de la promoción');
      return;
    }
    try {
      // El curso viene como ID del serializer
      const cursoId = promocion.curso;
      await temaService.create({ ...newTema, curso: cursoId });
      setShowNewTema(false);
      setNewTema({ numero_tema: '', titulo: '', descripcion: '', fecha_clase: '' });
      loadData();
    } catch (err) {
      console.error('Error completo:', err.response?.data);
      alert('Error al crear tema: ' + (err.response?.data?.detail || err.response?.data?.curso || err.message));
    }
  };

  const handleInscribirAlumno = async (e) => {
    e.preventDefault();
    if (!selectedAlumno) {
      alert('Selecciona un alumno');
      return;
    }
    try {
      await inscripcionService.create({
        alumno: selectedAlumno,
        promocion: id,
        activa: true,
      });
      setShowNewInscripcion(false);
      setSelectedAlumno('');
      loadData();
    } catch (err) {
      alert('Error al inscribir alumno: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleCalcularPromedios = async () => {
    if (!window.confirm('¿Calcular promedios para todos los estudiantes de esta promoción?')) {
      return;
    }
    try {
      await promedioService.calcularPromedios(id);
      alert('Promedios calculados correctamente');
      loadData();
    } catch (err) {
      alert('Error al calcular promedios');
    }
  };

  const handleGenerarDiplomas = async () => {
    if (!window.confirm('¿Generar diplomas para estudiantes aprobados (>=80%)?')) {
      return;
    }
    try {
      const response = await diplomaService.generarDiplomas(id);
      alert(response.data.mensaje);
    } catch (err) {
      alert('Error al generar diplomas');
    }
  };

  const handleEditPromocion = () => {
    if (promocion) {
      setEditPromocion({
        nombre: promocion.nombre || '',
        descripcion: promocion.descripcion || '',
        fecha_inicio: promocion.fecha_inicio ? promocion.fecha_inicio.split('T')[0] : '',
        fecha_fin: promocion.fecha_fin ? promocion.fecha_fin.split('T')[0] : '',
        activa: promocion.activa !== undefined ? promocion.activa : true,
      });
      setShowEditPromocion(true);
    }
  };

  const handleUpdatePromocion = async (e) => {
    e.preventDefault();
    try {
      await promocionService.update(id, editPromocion);
      setShowEditPromocion(false);
      loadData();
      alert('Promoción actualizada correctamente');
    } catch (err) {
      alert('Error al actualizar promoción: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleFinalizarPromocion = async () => {
    if (!window.confirm('¿Estás seguro de finalizar esta promoción? Esto la marcará como inactiva.')) {
      return;
    }
    try {
      await promocionService.update(id, { activa: false });
      loadData();
      alert('Promoción finalizada correctamente');
    } catch (err) {
      alert('Error al finalizar promoción: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleActivarPromocion = async () => {
    if (!window.confirm('¿Estás seguro de reactivar esta promoción?')) {
      return;
    }
    try {
      await promocionService.update(id, { activa: true });
      loadData();
      alert('Promoción reactivada correctamente');
    } catch (err) {
      alert('Error al reactivar promoción: ' + (err.response?.data?.detail || err.message));
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div className="gestionar-promocion">
      <Link to="/" className="back-link">← Volver al dashboard</Link>
      
      <div className="promocion-header-section">
        <div>
          <h1>{promocion?.nombre || 'Gestionar Promoción'}</h1>
          {promocion && (
            <div className="promocion-info">
              <span className={`badge ${promocion.activa ? 'active' : 'inactive'}`}>
                {promocion.activa ? '🟢 Activa' : '🔴 Finalizada'}
              </span>
              <span className="promocion-fechas">
                📅 Inicio: {new Date(promocion.fecha_inicio).toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
                {promocion.fecha_fin && (
                  <> - Fin: {new Date(promocion.fecha_fin).toLocaleDateString('es-ES', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}</>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="promocion-actions">
          {promocion?.activa ? (
            <button onClick={handleFinalizarPromocion} className="btn-secondary">
              🏁 Finalizar Promoción
            </button>
          ) : (
            <button onClick={handleActivarPromocion} className="btn-primary">
              ▶️ Reactivar Promoción
            </button>
          )}
          <button onClick={handleEditPromocion} className="btn-primary">
            ✏️ Editar Promoción
          </button>
        </div>
      </div>

      {showEditPromocion && (
        <div className="section-card">
          <div className="section-header">
            <h2>✏️ Editar Promoción</h2>
            <button onClick={() => setShowEditPromocion(false)} className="btn-close">×</button>
          </div>
          <form onSubmit={handleUpdatePromocion} className="promocion-edit-form">
            <div className="form-group">
              <label>Nombre de la Promoción *</label>
              <input
                type="text"
                value={editPromocion.nombre}
                onChange={(e) => setEditPromocion({ ...editPromocion, nombre: e.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={editPromocion.descripcion}
                onChange={(e) => setEditPromocion({ ...editPromocion, descripcion: e.target.value })}
                rows={3}
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha de Inicio *</label>
                <input
                  type="date"
                  value={editPromocion.fecha_inicio}
                  onChange={(e) => setEditPromocion({ ...editPromocion, fecha_inicio: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha de Fin (opcional)</label>
                <input
                  type="date"
                  value={editPromocion.fecha_fin}
                  onChange={(e) => setEditPromocion({ ...editPromocion, fecha_fin: e.target.value })}
                />
                <small>Puedes dejarlo vacío si aún no está definida</small>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-primary">Guardar Cambios</button>
              <button type="button" onClick={() => setShowEditPromocion(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="tabs">
        <button
          className={activeTab === 'temas' ? 'active' : ''}
          onClick={() => setActiveTab('temas')}
        >
          Temas
        </button>
        <button
          className={activeTab === 'alumnos' ? 'active' : ''}
          onClick={() => setActiveTab('alumnos')}
        >
          Alumnos
        </button>
        <button
          className={activeTab === 'preguntas' ? 'active' : ''}
          onClick={() => setActiveTab('preguntas')}
        >
          Banco de Preguntas
        </button>
        <button
          className={activeTab === 'examenes' ? 'active' : ''}
          onClick={() => setActiveTab('examenes')}
        >
          Exámenes
        </button>
        <button
          className={activeTab === 'promedios' ? 'active' : ''}
          onClick={() => setActiveTab('promedios')}
        >
          Promedios y Diplomas
        </button>
      </div>

      {activeTab === 'temas' && (
        <div className="temas-section">
          <div className="section-header">
            <div>
              <h2>Temas del Curso</h2>
              {promocion && promocion.curso_nombre && (
                <p style={{margin: '4px 0 0 0', color: '#666', fontSize: '0.95rem'}}>
                  Curso: <strong>{promocion.curso_nombre}</strong> - Los temas se comparten entre todas las promociones de este curso
                </p>
              )}
            </div>
            <button onClick={() => setShowNewTema(!showNewTema)} className="btn-primary">
              {showNewTema ? 'Cancelar' : '+ Nuevo Tema'}
            </button>
          </div>

          {showNewTema && (
            <form onSubmit={handleCreateTema} className="new-form">
              <div style={{background: '#e8f4f8', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bee5eb'}}>
                <small style={{color: '#0c5460', fontWeight: '500'}}>
                  ⓘ Este tema se creará para el curso <strong>{promocion?.curso_nombre}</strong> y estará disponible para todas las promociones de este curso.
                </small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Número de Tema *</label>
                  <input
                    type="number"
                    value={newTema.numero_tema}
                    onChange={(e) => setNewTema({ ...newTema, numero_tema: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Fecha de Clase</label>
                  <input
                    type="date"
                    value={newTema.fecha_clase}
                    onChange={(e) => setNewTema({ ...newTema, fecha_clase: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Título *</label>
                <input
                  type="text"
                  value={newTema.titulo}
                  onChange={(e) => setNewTema({ ...newTema, titulo: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={newTema.descripcion}
                  onChange={(e) => setNewTema({ ...newTema, descripcion: e.target.value })}
                  rows={3}
                />
              </div>
              <button type="submit" className="btn-primary">Crear Tema</button>
            </form>
          )}

          <div className="temas-list">
            {temas.map((tema) => (
              <Link
                key={tema.id}
                to={`/promociones/${id}/temas/${tema.id}`}
                className="tema-item"
              >
                <div>
                  <h3>Tema {tema.numero_tema}: {tema.titulo}</h3>
                  {tema.fecha_clase && (
                    <p>Fecha: {new Date(tema.fecha_clase).toLocaleDateString()}</p>
                  )}
                </div>
                <span>→</span>
              </Link>
            ))}
            {temas.length === 0 && (
              <div className="empty-state">
                <p>No hay temas creados aún para este curso.</p>
                <p style={{marginTop: '8px', fontSize: '0.9rem', color: '#888'}}>
                  Al crear un tema, estará disponible para todas las promociones de este curso.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'alumnos' && (
        <div className="alumnos-section">
          <div className="section-header">
            <h2>Alumnos Inscritos</h2>
            <button onClick={() => setShowNewInscripcion(!showNewInscripcion)} className="btn-primary">
              {showNewInscripcion ? 'Cancelar' : '+ Inscribir Alumno'}
            </button>
          </div>

          {showNewInscripcion && (
            <form onSubmit={handleInscribirAlumno} className="new-form">
              <div className="form-group">
                <label>Seleccionar Alumno *</label>
                <select
                  value={selectedAlumno}
                  onChange={(e) => setSelectedAlumno(e.target.value)}
                  required
                >
                  <option value="">Seleccionar...</option>
                  {alumnos
                    .filter(alumno => !inscripciones.some(ins => ins.alumno === alumno.id))
                    .map((alumno) => (
                      <option key={alumno.id} value={alumno.id}>
                        {alumno.first_name} {alumno.last_name} ({alumno.username})
                      </option>
                    ))}
                </select>
              </div>
              <button type="submit" className="btn-primary">Inscribir</button>
            </form>
          )}

          <div className="alumnos-list">
            {inscripciones.map((inscripcion) => (
              <div key={inscripcion.id} className="alumno-item">
                <div>
                  <h3>{inscripcion.alumno_nombre}</h3>
                  <p>
                    Fecha de inscripción:{' '}
                    {new Date(inscripcion.fecha_inscripcion).toLocaleDateString()}
                  </p>
                </div>
                <span className={`badge ${inscripcion.activa ? 'active' : 'inactive'}`}>
                  {inscripcion.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            ))}
            {inscripciones.length === 0 && (
              <p className="empty-state">No hay alumnos inscritos.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'preguntas' && (
        <PreguntasSection 
          temas={temas}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'examenes' && (
        <ExamenesSection 
          temas={temas}
          onRefresh={loadData}
        />
      )}

      {activeTab === 'promedios' && (
        <div className="promedios-section">
          <div className="section-header">
            <h2>Promedios y Diplomas</h2>
            <div className="action-buttons">
              <button onClick={handleCalcularPromedios} className="btn-secondary">
                Calcular Promedios
              </button>
              <button onClick={handleGenerarDiplomas} className="btn-primary">
                Generar Diplomas
              </button>
            </div>
          </div>
          <p className="info-text">
            Calcula los promedios finales de todos los estudiantes. Los que tengan promedio >= 80% 
            serán considerados aprobados y podrán recibir su diploma.
          </p>
        </div>
      )}
    </div>
  );
};

export default GestionarPromocion;
