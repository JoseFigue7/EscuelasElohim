import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { temaService, inscripcionService, usuarioService, promedioService, diplomaService, promocionService } from '../services/api';
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
  const [diplomas, setDiplomas] = useState([]);
  const [diplomaWarnings, setDiplomaWarnings] = useState([]);
  const [diplomaInfo, setDiplomaInfo] = useState('');
  const [promedios, setPromedios] = useState([]);
  const [promediosLoading, setPromediosLoading] = useState(false);
  const [editPromocion, setEditPromocion] = useState({
    nombre: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    activa: true,
  });
  const [newTema, setNewTema] = useState({
    titulo: '',
    descripcion: '',
    fecha_clase: '',
  });
  const [selectedAlumno, setSelectedAlumno] = useState('');
  const [alumnoSearch, setAlumnoSearch] = useState('');
  const [temaSearch, setTemaSearch] = useState('');

  const resolveDiplomaUrl = (archivo) => {
    if (!archivo) return null;
    if (archivo.startsWith('http://') || archivo.startsWith('https://')) {
      return archivo;
    }
    const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    return `${baseUrl}${archivo.startsWith('/') ? '' : '/'}${archivo}`;
  };

  const safeFilenamePart = (value) => {
    if (!value) return '';
    return value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120);
  };


  const loadData = useCallback(async () => {
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
  }, [id]);

  const handleToggleTemaVisible = async (tema, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await temaService.patch(tema.id, {
        visible_para_estudiante: tema.visible_para_estudiante === false,
      });
      loadData();
    } catch (err) {
      alert(
        'Error al actualizar visibilidad del tema: ' +
          (err.response?.data?.detail || err.message)
      );
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
      setNewTema({ titulo: '', descripcion: '', fecha_clase: '' });
      loadData();
    } catch (err) {
      console.error('Error completo:', err.response?.data);
      const data = err.response?.data;
      const firstFieldError = data && typeof data === 'object'
        ? Object.entries(data).find(([, value]) => Array.isArray(value) && value.length > 0)
        : null;
      const readableError = firstFieldError
        ? `${firstFieldError[0]}: ${firstFieldError[1][0]}`
        : (data?.detail || data?.curso || err.message);
      alert('Error al crear tema: ' + readableError);
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

  const handleToggleInscripcion = async (inscripcion) => {
    const accion = inscripcion.activa ? 'inactivar' : 'activar';
    const confirmacion = window.confirm(
      `¿Estás seguro que quieres ${accion} la inscripción de este alumno en esta promoción? ` +
        'Esto solo afecta esta promoción y no inactiva la cuenta del alumno.'
    );
    if (!confirmacion) {
      return;
    }
    try {
      await inscripcionService.update(inscripcion.id, { activa: !inscripcion.activa });
      loadData();
    } catch (err) {
      alert('Error al actualizar inscripción: ' + (err.response?.data?.detail || err.message));
    }
  };

  const handleEliminarInscripcion = async (inscripcion) => {
    if (!window.confirm('¿Estás seguro que quieres eliminar a este alumno del curso?')) {
      return;
    }
    try {
      await inscripcionService.delete(inscripcion.id);
      loadData();
    } catch (err) {
      alert('Error al eliminar inscripción: ' + (err.response?.data?.detail || err.message));
    }
  };

  const generarDiplomasPromocion = async ({ showAlert = true } = {}) => {
    try {
      const response = await diplomaService.generarDiplomas(id);
      if (showAlert) {
        alert(response.data.mensaje);
      }
      setDiplomaWarnings(Array.isArray(response.data.advertencias) ? response.data.advertencias : []);
      const diplomasRespuesta = Array.isArray(response.data.diplomas) ? response.data.diplomas : [];
      const creados = diplomasRespuesta.filter((item) => item?.creado).length;
      const totalAprobados = diplomasRespuesta.length;
      const totalConArchivo = diplomasRespuesta.filter((item) => item?.archivo).length;
      if (creados === 0) {
        if (totalAprobados === 0) {
          setDiplomaInfo('No hay alumnos aprobados (>= 80%) para generar diplomas.');
        } else if (totalConArchivo > 0) {
          setDiplomaInfo(
            `Ya existen ${totalConArchivo} diplomas generados. Se iniciará la descarga.`
          );
        } else {
          setDiplomaInfo(
            'No se generaron archivos para los aprobados. Revisa los avisos o el servidor.'
          );
        }
      } else {
        setDiplomaInfo('');
      }
      if (Array.isArray(response.data.diplomas)) {
        return response.data.diplomas;
      }
      return null;
    } catch (err) {
      const detail =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.response?.data?.mensaje ||
        err.message ||
        'Error al generar diplomas';
      alert(`Error al generar diplomas: ${detail}`);
      setDiplomaInfo('');
      throw err;
    }
  };

  const loadDiplomas = useCallback(async () => {
    try {
      const response = await diplomaService.getAll(id);
      const data = response.data.results || response.data;
      setDiplomas(data);
      return data;
    } catch (err) {
      console.error('Error al cargar diplomas:', err);
      setDiplomas([]);
      return [];
    } finally {
    }
  }, [id]);

  const handleDescargarDiploma = async ({ inscripcionId, alumnoNombre, cursoNombre }) => {
    let diploma = diplomasByInscripcion.get(String(inscripcionId));
    let archivoUrl = resolveDiplomaUrl(diploma?.archivo);
    let diplomaId = diploma?.id;
    if (!archivoUrl) {
      try {
        const diplomasGenerados = await generarDiplomasPromocion({ showAlert: false });
        let updatedDiplomas = Array.isArray(diplomasGenerados) ? diplomasGenerados : null;
        const hasInscripcionData = Array.isArray(updatedDiplomas)
          ? updatedDiplomas.some((item) => item?.inscripcion || item?.inscripcion?.id)
          : false;
        if (!hasInscripcionData) {
          updatedDiplomas = await loadDiplomas();
        }
        const updatedDiploma = updatedDiplomas.find(
          (item) => String(item?.inscripcion?.id ?? item?.inscripcion) === String(inscripcionId)
        );
        archivoUrl = resolveDiplomaUrl(updatedDiploma?.archivo);
        diplomaId = updatedDiploma?.id ?? diplomaId;
      } catch (err) {
        return;
      }
    }
    if (!archivoUrl) {
      alert('El diploma aún no está disponible para descargar.');
      return;
    }
    const alumnoSafe = safeFilenamePart(alumnoNombre) || 'alumno';
    const cursoSafe = safeFilenamePart(cursoNombre) || 'curso';
    const downloadFilename = `Diploma_${alumnoSafe}_${cursoSafe}.pdf`;
    try {
      if (diplomaId) {
        const response = await diplomaService.descargarPdf(diplomaId);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = downloadFilename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
        return;
      }
    } catch (err) {
      // Fallback to direct URL
    }
    const link = document.createElement('a');
    link.href = archivoUrl;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDescargarDiplomasMasivo = async () => {
    const aprobados = filasPromedios.filter(({ promedio }) => Boolean(promedio?.aprobado));
    if (aprobados.length === 0) {
      alert('No hay alumnos aprobados (>= 80%) para descargar diplomas.');
      return;
    }
    if (aprobados.length === 1) {
      const { inscripcion, promedio } = aprobados[0];
      const alumnoNombre =
        inscripcion?.alumno_nombre || promedio?.alumno_nombre || 'Alumno';
      const cursoNombre =
        inscripcion?.curso_nombre ||
        inscripcion?.curso?.nombre ||
        promocion?.curso_nombre ||
        promocion?.curso?.nombre ||
        '';
      await handleDescargarDiploma({ inscripcionId: inscripcion.id, alumnoNombre, cursoNombre });
      return;
    }
    try {
      const response = await diplomaService.descargarZip(id);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const promocionSafe = safeFilenamePart(promocion?.nombre) || `promocion_${id}`;
      link.download = `Diplomas_${promocionSafe}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          if (parsed?.error) {
            alert(parsed.error);
            return;
          }
        } catch (parseError) {
          // Ignore parse errors and fallback to generic message
        }
      }
      alert('No se pudo descargar el ZIP de diplomas.');
      return;
    }
  };

  const loadPromedios = useCallback(async ({ calcular = false, silent = false } = {}) => {
    setPromediosLoading(true);
    let calcularError = null;
    if (calcular) {
      try {
        await promedioService.calcularPromedios(id);
      } catch (err) {
        calcularError = err;
        console.error('Error al calcular promedios:', err);
      }
    }
    try {
      const response = await promedioService.getAll(id);
      setPromedios(response.data.results || response.data);
    } catch (err) {
      console.error('Error al cargar promedios:', err);
      setPromedios([]);
    } finally {
      setPromediosLoading(false);
    }
    if (calcular && !silent) {
      if (calcularError) {
        alert('Error al calcular promedios');
      } else {
        alert('Promedios calculados correctamente');
      }
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === 'promedios') {
      loadPromedios({ calcular: true, silent: true });
      loadDiplomas();
    }
  }, [activeTab, loadDiplomas, loadPromedios]);

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

  const promediosByInscripcion = new Map(
    promedios.map((promedio) => [
      String(promedio?.inscripcion?.id ?? promedio?.inscripcion),
      promedio,
    ])
  );
  const diplomasByInscripcion = new Map(
    diplomas.map((diploma) => [
      String(diploma?.inscripcion?.id ?? diploma?.inscripcion),
      diploma,
    ])
  );
  const filasPromedios = inscripciones.map((inscripcion) => ({
    inscripcion,
    promedio: promediosByInscripcion.get(String(inscripcion.id)),
  }));
  const formatFecha = (value) => {
    if (!value) return null;
    return new Date(value).toLocaleString('es-ES');
  };
  const normalizedTemaSearch = temaSearch.trim().toLowerCase();
  const filteredTemas = temas.filter((tema) =>
    (tema.titulo || '').toLowerCase().includes(normalizedTemaSearch)
  );
  const hasTemaSearch = normalizedTemaSearch.length > 0;
  const normalizedAlumnoSearch = alumnoSearch.trim().toLowerCase();
  const filteredInscripciones = inscripciones.filter((inscripcion) => {
    if (!normalizedAlumnoSearch) return true;
    const alumnoNombre = (inscripcion.alumno_nombre || '').toLowerCase();
    const alumnoUsername = (inscripcion.alumno_username || '').toLowerCase();
    return (
      alumnoNombre.includes(normalizedAlumnoSearch) ||
      alumnoUsername.includes(normalizedAlumnoSearch)
    );
  });
  const hasAlumnoSearch = normalizedAlumnoSearch.length > 0;

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
                  Curso: <strong>{promocion.curso_nombre}</strong> - Los temas se comparten entre todas las promociones de este curso.
                  Usa el interruptor &quot;Visible&quot; para mostrar u ocultar cada tema a los estudiantes.
                </p>
              )}
            </div>
          </div>

          <div className="temas-toolbar">
            <div className="temas-toolbar-left">
              <div className="temas-search">
                <input
                  type="text"
                  placeholder="Buscar tema por nombre..."
                  value={temaSearch}
                  onChange={(e) => setTemaSearch(e.target.value)}
                  className="temas-search-input"
                  aria-label="Buscar tema por nombre"
                />
                {hasTemaSearch && (
                  <span className="temas-search-count">
                    {filteredTemas.length} resultado{filteredTemas.length === 1 ? '' : 's'}
                  </span>
                )}
              </div>
            </div>
            <div className="temas-toolbar-right">
              <button onClick={() => setShowNewTema(!showNewTema)} className="btn-primary">
                {showNewTema ? 'Cancelar' : '+ Nuevo Tema'}
              </button>
            </div>
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
            {filteredTemas.map((tema) => (
              <Link
                key={tema.id}
                to={`/promociones/${id}/temas/${tema.id}`}
                className={`tema-item ${tema.visible_para_estudiante === false ? 'tema-oculto' : ''}`}
              >
                <div className="tema-item-main">
                  <h3>Tema {tema.numero_tema}: {tema.titulo}</h3>
                  {tema.fecha_clase && (
                    <p>Fecha: {new Date(tema.fecha_clase).toLocaleDateString()}</p>
                  )}
                  {tema.visible_para_estudiante === false && (
                    <span className="tema-oculto-badge">Oculto para estudiantes</span>
                  )}
                </div>
                <div className="tema-item-actions">
                  <label
                    className="switch-label"
                    title={tema.visible_para_estudiante !== false ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
                    onClick={(e) => e.preventDefault()}
                  >
                    <span className="switch-text">Visible</span>
                    <span className="switch">
                      <input
                        type="checkbox"
                        checked={tema.visible_para_estudiante !== false}
                        onChange={(e) => handleToggleTemaVisible(tema, e)}
                      />
                      <span className="switch-slider" />
                    </span>
                  </label>
                  <span className="tema-item-arrow">→</span>
                </div>
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
            {temas.length > 0 && hasTemaSearch && filteredTemas.length === 0 && (
              <div className="empty-state">
                <p>No hay temas que coincidan con tu búsqueda.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'alumnos' && (
        <div className="alumnos-section">
          <div className="section-header">
            <h2>Alumnos Inscritos</h2>
          </div>
          <p className="info-text">
            Inactivar una inscripción solo aplica a esta promoción; la cuenta del alumno permanece activa.
          </p>

          <div className="section-toolbar">
            <div className="section-toolbar-left">
              <div className="temas-search">
                <input
                  type="text"
                  placeholder="Buscar alumno por nombre..."
                  value={alumnoSearch}
                  onChange={(e) => setAlumnoSearch(e.target.value)}
                  className="temas-search-input"
                  aria-label="Buscar alumno por nombre"
                />
              </div>
            </div>
            <div className="section-toolbar-right">
              <button onClick={() => setShowNewInscripcion(!showNewInscripcion)} className="btn-primary">
                {showNewInscripcion ? 'Cancelar' : '+ Inscribir Alumno'}
              </button>
            </div>
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

          {inscripciones.length === 0 ? (
            <p className="empty-state">No hay alumnos inscritos.</p>
          ) : (
            <div className="promedios-table-wrapper">
              <table className="promedios-table">
                <thead>
                  <tr>
                    <th>Alumno</th>
                    <th>Estado cuenta</th>
                    <th>Estado inscripción</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInscripciones.map((inscripcion) => (
                    <tr key={inscripcion.id}>
                      <td>{inscripcion.alumno_nombre || 'Alumno'}</td>
                      <td>
                        <span className={`badge ${inscripcion.alumno_activo ? 'active' : 'inactive'}`}>
                          {inscripcion.alumno_activo ? 'Activa' : 'Inactiva'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${inscripcion.activa ? 'active' : 'inactive'}`}>
                          {inscripcion.activa ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleToggleInscripcion(inscripcion)}
                          >
                            {inscripcion.activa ? 'Inactivar inscripción' : 'Activar inscripción'}
                          </button>
                          <button
                            type="button"
                            className="btn-delete"
                            onClick={() => handleEliminarInscripcion(inscripcion)}
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {hasAlumnoSearch && filteredInscripciones.length === 0 && (
                <div className="empty-state" style={{ marginTop: '16px' }}>
                  <p>No hay alumnos que coincidan con tu búsqueda.</p>
                </div>
              )}
            </div>
          )}
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
              <button onClick={handleDescargarDiplomasMasivo} className="btn-primary">
                Descargar Diplomas
              </button>
            </div>
          </div>
          <p className="info-text">
            Calcula los promedios finales de todos los estudiantes. Los que tengan promedio &ge; 80%
            serán considerados aprobados y podrán recibir su diploma.
          </p>
          {diplomaWarnings.length > 0 && (
            <div className="info-text" style={{ color: '#9c6b00' }}>
              <strong>Advertencias al generar diplomas:</strong>
              <ul style={{ marginTop: '8px' }}>
                {diplomaWarnings.map((item, idx) => (
                  <li key={`${item.alumno}-${idx}`}>
                    {item.alumno || 'Alumno'} — {item.detalle || 'Sin detalle'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {diplomaWarnings.length === 0 && diplomaInfo && (
            <div className="info-text" style={{ color: '#9c6b00' }}>
              {diplomaInfo}
            </div>
          )}

          <div className="promedios-table-section">
            <h3>Promedios por alumno</h3>
            {promediosLoading ? (
              <p className="info-text">Cargando promedios...</p>
            ) : inscripciones.length === 0 ? (
              <div className="empty-state">
                <p>No hay alumnos inscritos para mostrar promedios.</p>
              </div>
            ) : (
              <div className="promedios-table-wrapper">
                <table className="promedios-table">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Curso</th>
                      <th>Promedio</th>
                      <th>Estado</th>
                      <th>Fecha de cálculo</th>
                      <th>Diploma</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filasPromedios.map(({ inscripcion, promedio }) => {
                      const promedioFinalValue = Number.parseFloat(promedio?.promedio_final);
                      const promedioFinal = Number.isFinite(promedioFinalValue)
                        ? promedioFinalValue.toFixed(2)
                        : null;
                      const fechaCalculo = formatFecha(promedio?.fecha_calculo);
                      const alumnoNombre =
                        inscripcion?.alumno_nombre || promedio?.alumno_nombre || 'Alumno';
                      const cursoNombre =
                        inscripcion?.curso_nombre ||
                        inscripcion?.curso?.nombre ||
                        promocion?.curso_nombre ||
                        promocion?.curso?.nombre ||
                        '';
                      const aprobado = Number.isFinite(promedioFinalValue)
                        ? (typeof promedio?.aprobado === 'boolean'
                            ? promedio.aprobado
                            : promedioFinalValue >= 80)
                        : false;
                      const puedeDescargar = aprobado;

                      return (
                        <tr key={inscripcion.id}>
                          <td>{alumnoNombre}</td>
                          <td>{cursoNombre}</td>
                          <td>{promedioFinal !== null ? `${promedioFinal}%` : 'Sin calcular'}</td>
                          <td>
                            <span className={`badge ${aprobado ? 'active' : 'inactive'}`}>
                              {promedio ? (aprobado ? 'Aprobado' : 'Reprobado') : 'Sin promedio'}
                            </span>
                          </td>
                          <td>{fechaCalculo || 'Sin cálculo'}</td>
                          <td>
                            <button
                              className="btn-secondary"
                              type="button"
                              disabled={!puedeDescargar}
                              onClick={() =>
                                handleDescargarDiploma({
                                  inscripcionId: inscripcion.id,
                                  alumnoNombre,
                                  cursoNombre,
                                })
                              }
                            >
                              Descargar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
};

export default GestionarPromocion;
