import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { temaService, materialService, examenService, calificacionService, inscripcionService, promocionService, recuperacionService, unwrapList } from '../services/api';
import MaterialContent from '../components/MaterialContent';
import './TemaDetail.css';

const formatFechaHora = (iso) => {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-GT', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const TemaDetail = () => {
  const { promocionId, temaId } = useParams();
  const navigate = useNavigate();
  const [tema, setTema] = useState(null);
  const [promocion, setPromocion] = useState(null);
  const [materiales, setMateriales] = useState([]);
  const [examen, setExamen] = useState(null);
  const [calificaciones, setCalificaciones] = useState([]);
  const [inscripciones, setInscripciones] = useState([]);
  const [recuperaciones, setRecuperaciones] = useState([]);
  const [recuperacionesTotales, setRecuperacionesTotales] = useState({}); // Por inscripción
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showRecuperacionForm, setShowRecuperacionForm] = useState(false);
  const [showTemaMenu, setShowTemaMenu] = useState(false);
  const [showEditTemaForm, setShowEditTemaForm] = useState(false);
  const [editTemaForm, setEditTemaForm] = useState({
    titulo: '',
    descripcion: '',
    fecha_clase: '',
  });
  const [materialForm, setMaterialForm] = useState({
    tipo: 'archivo',
    titulo: '',
    descripcion: '',
    archivo: null,
    url: '',
  });
  const [recuperacionForm, setRecuperacionForm] = useState({
    inscripciones: [], // Array de IDs de inscripciones seleccionadas
    fecha_inicio: '',
    fecha_fin: '',
  });
  const [detalleCalificacion, setDetalleCalificacion] = useState(null);
  const [detalleLoading, setDetalleLoading] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Cargar datos en paralelo
      const [temaResponse, promocionResponse, materialesResponse, inscripcionesResponse] = await Promise.all([
        temaService.getById(temaId),
        promocionService.getById(promocionId),
        materialService.getAll(temaId),
        inscripcionService.getAll(promocionId),
      ]);

      const inscripcionesData = unwrapList(inscripcionesResponse);

      setTema(temaResponse.data);
      setEditTemaForm({
        titulo: temaResponse.data.titulo || '',
        descripcion: temaResponse.data.descripcion || '',
        fecha_clase: temaResponse.data.fecha_clase || '',
      });
      setPromocion(promocionResponse.data);
      setMateriales(unwrapList(materialesResponse));
      setInscripciones(inscripcionesData);

      // Cargar examen si existe
      try {
        const examenesResponse = await examenService.getAll(temaId);
        const examenes = unwrapList(examenesResponse);
        if (examenes.length > 0) {
          setExamen(examenes[0]);
          
          // Cargar calificaciones del examen
          const calificacionesResponse = await calificacionService.getAll(examenes[0].id);
          setCalificaciones(unwrapList(calificacionesResponse));
          
          // Cargar recuperaciones del examen
          const recuperacionesResponse = await recuperacionService.getAll(examenes[0].id);
          setRecuperaciones(unwrapList(recuperacionesResponse));
          
          // Cargar recuperaciones totales por inscripción
          const totalesMap = {};
          for (const inscripcion of inscripcionesData) {
            try {
              const totalResponse = await recuperacionService.contarPorInscripcion(inscripcion.id);
              totalesMap[inscripcion.id] = totalResponse.data.total_recuperaciones;
            } catch (err) {
              totalesMap[inscripcion.id] = 0;
            }
          }
          setRecuperacionesTotales(totalesMap);
        }
      } catch (err) {
        console.log('No hay examen para este tema');
      }
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('Error al cargar los datos del tema');
    } finally {
      setLoading(false);
    }
  }, [promocionId, temaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMaterialSubmit = async (e) => {
    e.preventDefault();
    const { tipo, titulo, descripcion, archivo, url } = materialForm;

    if (tipo === 'archivo' && !archivo) {
      alert('Selecciona un archivo para subir.');
      return;
    }
    if (tipo === 'enlace' && !url.trim()) {
      alert('Ingresa la URL del enlace.');
      return;
    }
    if (tipo === 'imagen' && !archivo && !url.trim()) {
      alert('Sube una imagen o ingresa la URL de una imagen.');
      return;
    }

    try {
      await materialService.create({
        tema: temaId,
        tipo,
        titulo,
        descripcion,
        archivo: archivo || undefined,
        url: url.trim() || undefined,
      });

      setMaterialForm({ tipo: 'archivo', titulo: '', descripcion: '', archivo: null, url: '' });
      setShowMaterialForm(false);
      loadData();
    } catch (err) {
      const data = err.response?.data;
      const msg =
        (data && typeof data === 'object'
          ? Object.entries(data)
              .map(([k, v]) => `${k}: ${Array.isArray(v) ? v[0] : v}`)
              .join('\n')
          : null) ||
        data?.detail ||
        err.message;
      alert('Error al guardar material: ' + msg);
    }
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('¿Estás seguro de eliminar este material?')) {
      return;
    }
    try {
      await materialService.delete(materialId);
      loadData();
    } catch (err) {
      alert('Error al eliminar material');
    }
  };

  const handleToggleVisibleParaEstudiante = async () => {
    try {
      await temaService.patch(temaId, {
        visible_para_estudiante: tema.visible_para_estudiante === false,
      });
      await loadData();
    } catch (err) {
      alert(
        'Error al actualizar visibilidad: ' +
          (err.response?.data?.detail || err.message)
      );
    }
  };

  const handleUpdateTema = async (e) => {
    e.preventDefault();
    try {
      await temaService.update(temaId, {
        ...tema,
        titulo: editTemaForm.titulo,
        descripcion: editTemaForm.descripcion || null,
        fecha_clase: editTemaForm.fecha_clase || null,
      });
      setShowEditTemaForm(false);
      setShowTemaMenu(false);
      await loadData();
      alert('Tema actualizado correctamente');
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      alert('Error al actualizar tema: ' + detail);
    }
  };

  const handleDeleteTema = async () => {
    const confirmacion = window.confirm(
      `¿Estás seguro de eliminar el tema "${tema?.titulo}"? Esta acción no se puede deshacer.`
    );
    if (!confirmacion) {
      return;
    }
    try {
      await temaService.delete(temaId);
      alert('Tema eliminado correctamente');
      navigate(`/promociones/${promocionId}/gestion`);
    } catch (err) {
      const detail =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        err.message;
      alert('Error al eliminar tema: ' + detail);
    }
  };

  const handleDownload = async (materialId, material) => {
    try {
      const response = await materialService.download(materialId);
      
      // Priorizar el nombre del archivo del serializer (más confiable)
      let nombreArchivo = material.nombre_archivo;
      
      // Si no está disponible en el serializer, intentar extraer del header Content-Disposition
      if (!nombreArchivo) {
        const contentDisposition = response.headers['content-disposition'] || response.headers['Content-Disposition'];
        
        if (contentDisposition) {
          // Intentar extraer el nombre del archivo (soporta ambos formatos: filename="..." y filename*=UTF-8''...)
          let filenameMatch = contentDisposition.match(/filename\*?=['"]?([^'";\n]+)['"]?/i);
          
          if (!filenameMatch) {
            // Intentar con formato RFC 5987: filename*=UTF-8''...
            filenameMatch = contentDisposition.match(/filename\*=UTF-8''([^;\n]+)/i);
            if (filenameMatch) {
              // Decodificar URL encoding
              nombreArchivo = decodeURIComponent(filenameMatch[1]);
            }
          } else {
            // Formato simple: filename="..."
            nombreArchivo = filenameMatch[1].replace(/['"]/g, '');
          }
        }
      }
      
      // Fallback final: usar el título o un nombre genérico
      if (!nombreArchivo) {
        nombreArchivo = material.titulo || 'material';
      }
      
      // Obtener el tipo de contenido del header de la respuesta
      const contentType = response.headers['content-type'] || response.headers['Content-Type'] || 'application/octet-stream';
      
      // Crear el blob con el tipo de contenido correcto
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', nombreArchivo);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Liberar el objeto URL
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar:', err);
      alert('Error al descargar el material');
    }
  };

  const handleCreateRecuperacion = async (e) => {
    e.preventDefault();
    if (!examen) {
      alert('No hay examen para este tema');
      return;
    }
    
    if (recuperacionForm.inscripciones.length === 0) {
      alert('Debe seleccionar al menos un estudiante');
      return;
    }
    
    try {
      await recuperacionService.create({
        examen: examen.id,
        inscripciones: recuperacionForm.inscripciones, // Enviar array de inscripciones
        fecha_inicio: recuperacionForm.fecha_inicio,
        fecha_fin: recuperacionForm.fecha_fin,
        activa: true,
      });
      
      setShowRecuperacionForm(false);
      setRecuperacionForm({ inscripciones: [], fecha_inicio: '', fecha_fin: '' });
      loadData();
      const count = recuperacionForm.inscripciones.length;
      alert(`${count} recuperación${count > 1 ? 'es' : ''} creada${count > 1 ? 's' : ''} correctamente`);
    } catch (err) {
      alert('Error al crear recuperación: ' + (err.response?.data?.detail || err.response?.data?.error || err.message));
    }
  };
  
  const handleToggleInscripcion = (inscripcionId) => {
    setRecuperacionForm(prev => {
      const inscripciones = [...prev.inscripciones];
      const index = inscripciones.indexOf(inscripcionId);
      if (index > -1) {
        inscripciones.splice(index, 1);
      } else {
        inscripciones.push(inscripcionId);
      }
      return { ...prev, inscripciones };
    });
  };

  const handleDeleteRecuperacion = async (recuperacionId) => {
    if (!window.confirm('¿Estás seguro de eliminar esta recuperación?')) {
      return;
    }
    
    try {
      await recuperacionService.delete(recuperacionId);
      loadData();
      alert('Recuperación eliminada correctamente');
    } catch (err) {
      alert('Error al eliminar recuperación');
    }
  };

  const verDetalleExamen = async (calificacionId) => {
    setDetalleLoading(true);
    try {
      const response = await calificacionService.getDetalle(calificacionId);
      setDetalleCalificacion(response.data);
    } catch (err) {
      console.error('Error al cargar detalle del examen:', err);
      alert('No se pudo cargar el detalle del examen');
    } finally {
      setDetalleLoading(false);
    }
  };

  const cerrarDetalleExamen = () => setDetalleCalificacion(null);

  // Calcular estadísticas del examen (solo intentos normales, no recuperaciones)
  const umbralAprobacion = examen?.porcentaje_aprobacion ?? 70;
  const calificacionesNormales = calificaciones.filter(
    (c) => !c.es_recuperacion && !c.recuperacion
  );

  const getInscripcionId = (cal) =>
    typeof cal.inscripcion === 'object' ? cal.inscripcion.id : cal.inscripcion;

  const calPorInscripcion = new Map();
  calificacionesNormales.forEach((cal) => {
    calPorInscripcion.set(String(getInscripcionId(cal)), cal);
  });

  const esAprobado = (cal) => parseFloat(cal.porcentaje) >= umbralAprobacion;

  const estudiantesEstado = inscripciones.map((ins) => {
    const cal = calPorInscripcion.get(String(ins.id));
    if (!cal) {
      return { inscripcion: ins, estado: 'pendiente', calificacion: null };
    }
    if (esAprobado(cal)) {
      return { inscripcion: ins, estado: 'aprobado', calificacion: cal };
    }
    return { inscripcion: ins, estado: 'reprobado', calificacion: cal };
  });

  const estadisticas = {
    totalEstudiantes: inscripciones.length,
    estudiantesConExamen: calificacionesNormales.length,
    estudiantesSinExamen: inscripciones.length - calificacionesNormales.length,
    aprobados: calificacionesNormales.filter((c) => esAprobado(c)).length,
    reprobados: calificacionesNormales.filter((c) => !esAprobado(c)).length,
    promedioGeneral: calificacionesNormales.length > 0
      ? (
          calificacionesNormales.reduce((sum, c) => sum + parseFloat(c.porcentaje), 0) /
          calificacionesNormales.length
        ).toFixed(2)
      : 0,
  };

  if (loading) {
    return <div className="loading-container"><div className="spinner"></div><p>Cargando...</p></div>;
  }

  if (error || !tema) {
    return <div className="error">{error || 'Tema no encontrado'}</div>;
  }

  return (
    <div className="tema-detail">
      <Link 
        to={`/promociones/${promocionId}/gestion`} 
        className="back-link"
      >
        ← Volver a la promoción
      </Link>

      <div className="tema-header-section">
        <div>
          <h1>Tema {tema.numero_tema}: {tema.titulo}</h1>
          {promocion && (
            <p className="curso-info">
              Curso: <strong>{promocion.curso_nombre || tema.curso_nombre}</strong> - 
              Promoción: <strong>{promocion.nombre}</strong>
            </p>
          )}
          {tema.descripcion && (
            <p className="tema-descripcion">{tema.descripcion}</p>
          )}
          {tema.fecha_clase && (
            <p className="fecha-clase">
              📅 Fecha de clase: {new Date(tema.fecha_clase).toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          )}
        </div>
        <div className="tema-header-controls">
          <label
            className="tema-visible-switch"
            title={tema.visible_para_estudiante !== false ? 'Visible para estudiantes' : 'Oculto para estudiantes'}
          >
            <span>Visible para estudiantes</span>
            <span className="switch">
              <input
                type="checkbox"
                checked={tema.visible_para_estudiante !== false}
                onChange={handleToggleVisibleParaEstudiante}
              />
              <span className="switch-slider" />
            </span>
          </label>
          <div className="tema-config-container">
          <button
            type="button"
            className="tema-config-btn"
            onClick={() => setShowTemaMenu((prev) => !prev)}
            aria-label="Configurar tema"
            title="Configurar tema"
          >
            ⚙️
          </button>
          {showTemaMenu && (
            <div className="tema-config-menu">
              <button
                type="button"
                className="tema-config-menu-item"
                onClick={() => {
                  setShowEditTemaForm(true);
                  setShowTemaMenu(false);
                }}
              >
                Editar tema
              </button>
              <button
                type="button"
                className="tema-config-menu-item danger"
                onClick={() => {
                  setShowTemaMenu(false);
                  handleDeleteTema();
                }}
              >
                Eliminar tema
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {showEditTemaForm && (
        <div className="section-card">
          <div className="section-header">
            <h2>✏️ Editar Tema</h2>
          </div>
          <form onSubmit={handleUpdateTema} className="material-form">
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={editTemaForm.titulo}
                onChange={(e) => setEditTemaForm((prev) => ({ ...prev, titulo: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción</label>
              <textarea
                value={editTemaForm.descripcion}
                onChange={(e) => setEditTemaForm((prev) => ({ ...prev, descripcion: e.target.value }))}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label>Fecha de clase</label>
              <input
                type="date"
                value={editTemaForm.fecha_clase || ''}
                onChange={(e) => setEditTemaForm((prev) => ({ ...prev, fecha_clase: e.target.value }))}
              />
            </div>
            <div className="material-actions">
              <button type="submit" className="btn-primary">Guardar cambios</button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowEditTemaForm(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dashboard de Estadísticas */}
      {examen && (
        <div className="dashboard-stats">
          <h2>📊 Dashboard del Examen</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{estadisticas.totalEstudiantes}</div>
              <div className="stat-label">Total Estudiantes</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{estadisticas.estudiantesConExamen}</div>
              <div className="stat-label">Han Realizado el Examen</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{estadisticas.estudiantesSinExamen}</div>
              <div className="stat-label">Pendientes</div>
            </div>
            <div className="stat-card success">
              <div className="stat-value">{estadisticas.aprobados}</div>
              <div className="stat-label">Aprobados (≥{umbralAprobacion}%)</div>
            </div>
            <div className="stat-card danger">
              <div className="stat-value">{estadisticas.reprobados}</div>
              <div className="stat-label">Reprobados (&lt;{umbralAprobacion}%)</div>
            </div>
            <div className="stat-card primary">
              <div className="stat-value">{estadisticas.promedioGeneral}%</div>
              <div className="stat-label">Promedio General</div>
            </div>
          </div>
          <p className="examen-config-hint">
            Umbral de aprobación: {umbralAprobacion}%
          </p>

          <div className="estudiantes-estado-section">
            <h3>Estado por estudiante</h3>
            <div className="calificaciones-table">
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Estado</th>
                    <th>Porcentaje</th>
                    <th>Fecha y hora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantesEstado.map(({ inscripcion, estado, calificacion }) => (
                    <tr key={inscripcion.id}>
                      <td><strong>{inscripcion.alumno_nombre}</strong></td>
                      <td>
                        <span className={`badge ${
                          estado === 'aprobado' ? 'success' : estado === 'reprobado' ? 'danger' : 'warning'
                        }`}>
                          {estado === 'aprobado' && '✅ Aprobado'}
                          {estado === 'reprobado' && '❌ Reprobado'}
                          {estado === 'pendiente' && '⏳ Pendiente'}
                        </span>
                      </td>
                      <td>
                        {calificacion ? `${calificacion.porcentaje}%` : '—'}
                      </td>
                      <td>
                        {calificacion ? formatFechaHora(calificacion.fecha_completado) : '—'}
                      </td>
                      <td>
                        {calificacion ? (
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => verDetalleExamen(calificacion.id)}
                          >
                            Ver examen
                          </button>
                        ) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Sección de Materiales */}
      <div className="section-card">
        <div className="section-header">
          <h2>📚 Materiales del Tema</h2>
          <button 
            onClick={() => setShowMaterialForm(!showMaterialForm)} 
            className="btn-primary"
          >
            {showMaterialForm ? 'Cancelar' : '+ Añadir Material'}
          </button>
        </div>

        {showMaterialForm && (
          <form onSubmit={handleMaterialSubmit} className="material-form">
            <div className="form-group">
              <label>Tipo de material *</label>
              <div className="material-tipo-options">
                {[
                  { value: 'archivo', label: '📄 Archivo' },
                  { value: 'enlace', label: '🔗 Enlace' },
                  { value: 'imagen', label: '🖼️ Imagen' },
                ].map((opt) => (
                  <label key={opt.value} className="material-tipo-option">
                    <input
                      type="radio"
                      name="material-tipo"
                      value={opt.value}
                      checked={materialForm.tipo === opt.value}
                      onChange={() =>
                        setMaterialForm({
                          ...materialForm,
                          tipo: opt.value,
                          archivo: null,
                          url: '',
                        })
                      }
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label>Título *</label>
              <input
                type="text"
                value={materialForm.titulo}
                onChange={(e) => setMaterialForm({ ...materialForm, titulo: e.target.value })}
                placeholder="Ej: Guía de estudio, Video de clase, Diagrama..."
                required
              />
            </div>
            <div className="form-group">
              <label>Descripción (opcional)</label>
              <textarea
                value={materialForm.descripcion}
                onChange={(e) => setMaterialForm({ ...materialForm, descripcion: e.target.value })}
                placeholder="Descripción del material..."
                rows="3"
              />
            </div>
            {materialForm.tipo === 'enlace' && (
              <div className="form-group">
                <label>URL del enlace *</label>
                <input
                  type="url"
                  value={materialForm.url}
                  onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                  placeholder="https://ejemplo.com/recurso"
                  required
                />
              </div>
            )}
            {materialForm.tipo === 'archivo' && (
              <div className="form-group">
                <label>Archivo *</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.rar"
                  onChange={(e) =>
                    setMaterialForm({ ...materialForm, archivo: e.target.files[0] || null })
                  }
                  required
                />
                <small className="form-hint">
                  PDF, Word, PowerPoint, Excel, texto o archivos comprimidos.
                </small>
              </div>
            )}
            {materialForm.tipo === 'imagen' && (
              <>
                <div className="form-group">
                  <label>Subir imagen</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) =>
                      setMaterialForm({ ...materialForm, archivo: e.target.files[0] || null })
                    }
                  />
                </div>
                <div className="form-group">
                  <label>O URL de imagen</label>
                  <input
                    type="url"
                    value={materialForm.url}
                    onChange={(e) => setMaterialForm({ ...materialForm, url: e.target.value })}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                  <small className="form-hint">
                    La imagen se mostrará directamente en la lista de materiales.
                  </small>
                </div>
              </>
            )}
            <button type="submit" className="btn-primary">Guardar material</button>
          </form>
        )}

        <div className="materiales-list">
          {materiales.length > 0 ? (
            materiales.map((material) => (
              <div key={material.id} className="material-item material-item--full">
                <MaterialContent
                  material={material}
                  onDownload={handleDownload}
                  showTitle
                />
                <span className="material-type-badge">
                  {material.tipo === 'enlace' ? 'Enlace' : material.tipo === 'imagen' ? 'Imagen' : 'Archivo'}
                </span>
                <div className="material-actions">
                  {material.tipo === 'archivo' && (
                    <button
                      type="button"
                      onClick={() => handleDownload(material.id, material)}
                      className="btn-download"
                    >
                      📥 Descargar
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteMaterial(material.id)}
                    className="btn-delete"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">
              <p>No hay materiales disponibles para este tema.</p>
            </div>
          )}
        </div>
      </div>

      {/* Sección de Calificaciones del Examen */}
      {examen && (
        <div className="section-card">
          <div className="section-header">
            <h2>📋 Calificaciones del Examen</h2>
            {examen.titulo && <p className="examen-titulo">Examen: {examen.titulo}</p>}
          </div>

          {calificacionesNormales.length > 0 ? (
            <div className="calificaciones-table">
              <table>
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Puntaje Obtenido</th>
                    <th>Puntaje Total</th>
                    <th>Porcentaje</th>
                    <th>Estado</th>
                    <th>Fecha y hora</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {calificacionesNormales.map((calificacion) => {
                    const aprobado = esAprobado(calificacion);
                    return (
                    <tr key={calificacion.id}>
                      <td><strong>{calificacion.alumno_nombre}</strong></td>
                      <td>{calificacion.puntaje_obtenido}</td>
                      <td>{calificacion.puntaje_total}</td>
                      <td>
                        <span className={`porcentaje ${aprobado ? 'aprobado' : 'reprobado'}`}>
                          {calificacion.porcentaje}%
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${aprobado ? 'success' : 'danger'}`}>
                          {aprobado ? '✅ Aprobado' : '❌ Reprobado'}
                        </span>
                      </td>
                      <td>{formatFechaHora(calificacion.fecha_completado)}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-secondary btn-sm"
                          onClick={() => verDetalleExamen(calificacion.id)}
                        >
                          Ver examen
                        </button>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p>Ningún estudiante ha realizado el examen aún.</p>
            </div>
          )}

          {/* Lista de estudiantes pendientes */}
          {estadisticas.estudiantesSinExamen > 0 && (
            <div className="pendientes-section">
              <h3>Estudiantes Pendientes ({estadisticas.estudiantesSinExamen})</h3>
              <div className="pendientes-list">
                {estudiantesEstado
                  .filter((item) => item.estado === 'pendiente')
                  .map(({ inscripcion }) => (
                    <div key={inscripcion.id} className="pendiente-item">
                      <span>{inscripcion.alumno_nombre}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sección de Recuperaciones */}
          <div className="recuperaciones-section">
            <div className="section-header" style={{marginTop: '40px', paddingTop: '32px', borderTop: '2px solid var(--border-color-light)'}}>
              <div>
                <h2>🔄 Recuperación (opcional)</h2>
                <p className="examen-config-hint" style={{ margin: '4px 0 0' }}>
                  Tú decides si haces recuperación, cuándo y para qué estudiantes.
                </p>
              </div>
              <button
                onClick={() => setShowRecuperacionForm(!showRecuperacionForm)}
                className="btn-primary"
              >
                {showRecuperacionForm ? 'Cancelar' : '+ Nueva Recuperación'}
              </button>
            </div>

            {showRecuperacionForm && (
              <form onSubmit={handleCreateRecuperacion} className="material-form" style={{marginTop: '24px'}}>
                <div className="form-group">
                  <label>Seleccionar Estudiantes *</label>
                  <div style={{
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '16px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    backgroundColor: '#f9fafb'
                  }}>
                    {inscripciones.length === 0 ? (
                      <p style={{color: '#666', margin: 0}}>No hay estudiantes inscritos</p>
                    ) : (
                      <>
                        <div style={{marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap'}}>
                          <button
                            type="button"
                            onClick={() => {
                              setRecuperacionForm(prev => ({
                                ...prev,
                                inscripciones: inscripciones.map(insc => insc.id)
                              }));
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '14px',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Seleccionar todos
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRecuperacionForm(prev => ({ ...prev, inscripciones: [] }));
                            }}
                            style={{
                              padding: '6px 12px',
                              fontSize: '14px',
                              backgroundColor: '#f3f4f6',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                          >
                            Deseleccionar todos
                          </button>
                          <span style={{color: '#666', fontSize: '14px'}}>
                            {recuperacionForm.inscripciones.length} seleccionado{recuperacionForm.inscripciones.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {inscripciones.map((inscripcion) => {
                          const isSelected = recuperacionForm.inscripciones.includes(inscripcion.id);
                          const tieneRecuperaciones = recuperacionesTotales[inscripcion.id] > 0;
                          const calEstudiante = calPorInscripcion.get(String(inscripcion.id));
                          return (
                            <label
                              key={inscripcion.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '10px',
                                marginBottom: '8px',
                                backgroundColor: isSelected ? '#eff6ff' : '#fff',
                                border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleInscripcion(inscripcion.id)}
                                style={{
                                  marginRight: '12px',
                                  width: '18px',
                                  height: '18px',
                                  cursor: 'pointer'
                                }}
                              />
                              <div style={{flex: 1}}>
                                <div style={{fontWeight: '500', color: '#111827'}}>
                                  {inscripcion.alumno_nombre || inscripcion.alumno?.first_name || inscripcion.alumno?.username}
                                </div>
                                {calEstudiante && (
                                  <small style={{ display: 'block', marginTop: '4px' }}>
                                    Examen: {calEstudiante.porcentaje}% · {formatFechaHora(calEstudiante.fecha_completado)}
                                    {' · '}
                                    <button
                                      type="button"
                                      className="link-button"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        verDetalleExamen(calEstudiante.id);
                                      }}
                                    >
                                      Ver respuestas
                                    </button>
                                  </small>
                                )}
                                {tieneRecuperaciones && (
                                  <small style={{color: '#dc2626', fontSize: '12px', display: 'block', marginTop: '4px'}}>
                                    ⚠️ Ya tiene {recuperacionesTotales[inscripcion.id]} recuperación{recuperacionesTotales[inscripcion.id] > 1 ? 'es' : ''} en la promoción
                                  </small>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </>
                    )}
                  </div>
                  {recuperacionForm.inscripciones.length === 0 && (
                    <small style={{color: '#dc2626', marginTop: '8px', display: 'block'}}>
                      * Debe seleccionar al menos un estudiante
                    </small>
                  )}
                </div>
                <div className="form-row" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px'}}>
                  <div className="form-group">
                    <label>Fecha y Hora de Inicio *</label>
                    <input
                      type="datetime-local"
                      value={recuperacionForm.fecha_inicio}
                      onChange={(e) => setRecuperacionForm({ ...recuperacionForm, fecha_inicio: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Fecha y Hora de Fin *</label>
                    <input
                      type="datetime-local"
                      value={recuperacionForm.fecha_fin}
                      onChange={(e) => setRecuperacionForm({ ...recuperacionForm, fecha_fin: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="btn-primary">Crear Recuperación</button>
              </form>
            )}

            {recuperaciones.length > 0 ? (
              <div className="recuperaciones-table" style={{marginTop: '24px'}}>
                <table>
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Recuperación #</th>
                      <th>Fecha Inicio</th>
                      <th>Fecha Fin</th>
                      <th>Estado</th>
                      <th>Total Recuperaciones</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recuperaciones.map((recuperacion) => (
                      <tr key={recuperacion.id}>
                        <td><strong>{recuperacion.alumno_nombre}</strong></td>
                        <td>{recuperacion.numero_recuperacion}</td>
                        <td>{new Date(recuperacion.fecha_inicio).toLocaleString('es-ES')}</td>
                        <td>{new Date(recuperacion.fecha_fin).toLocaleString('es-ES')}</td>
                        <td>
                          <span className={`badge ${recuperacion.completada ? 'success' : recuperacion.activa ? 'warning' : 'danger'}`}>
                            {recuperacion.completada ? '✅ Completada' : recuperacion.activa ? '⏳ Activa' : '❌ Inactiva'}
                          </span>
                        </td>
                        <td>{recuperacionesTotales[recuperacion.inscripcion] || 0}</td>
                        <td>
                          <button
                            onClick={() => handleDeleteRecuperacion(recuperacion.id)}
                            className="btn-delete"
                            style={{padding: '6px 12px', fontSize: '14px'}}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state" style={{marginTop: '24px'}}>
                <p>No hay recuperaciones creadas para este examen.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {!examen && (
        <div className="section-card">
          <div className="info-text">
            <strong>ℹ️ Información:</strong> Este tema aún no tiene un examen asignado. 
            Puedes crear uno desde la pestaña "Exámenes" en la gestión de la promoción.
          </div>
        </div>
      )}

      {(detalleCalificacion || detalleLoading) && (
        <div className="examen-detalle-overlay" onClick={cerrarDetalleExamen}>
          <div className="examen-detalle-modal" onClick={(e) => e.stopPropagation()}>
            {detalleLoading ? (
              <p className="examen-detalle-loading">Cargando examen...</p>
            ) : (
              <>
                <div className="examen-detalle-header">
                  <div>
                    <h2>Examen de {detalleCalificacion.alumno_nombre}</h2>
                    {detalleCalificacion.es_recuperacion && (
                      <span className="badge warning">Recuperación</span>
                    )}
                  </div>
                  <button type="button" className="btn-close" onClick={cerrarDetalleExamen}>×</button>
                </div>

                <div className="examen-detalle-resumen">
                  <span>Puntaje: {detalleCalificacion.puntaje_obtenido} / {detalleCalificacion.puntaje_total}</span>
                  <span className={`badge ${detalleCalificacion.aprobado ? 'success' : 'danger'}`}>
                    {detalleCalificacion.porcentaje}% · {detalleCalificacion.aprobado ? 'Aprobado' : 'Reprobado'}
                  </span>
                  <span>Realizado: {formatFechaHora(detalleCalificacion.fecha_completado)}</span>
                </div>

                <div className="examen-detalle-respuestas">
                  {(detalleCalificacion.respuestas || []).map((respuesta, index) => (
                    <div
                      key={respuesta.id}
                      className={`respuesta-item ${respuesta.es_correcta ? 'correcta' : 'incorrecta'}`}
                    >
                      <div className="respuesta-item-header">
                        <span className="respuesta-numero">Pregunta {index + 1}</span>
                        <span className={`badge ${respuesta.es_correcta ? 'success' : 'danger'}`}>
                          {respuesta.es_correcta ? '✓ Correcta' : '✗ Incorrecta'} · {respuesta.puntos_obtenidos} pts
                        </span>
                      </div>
                      <p className="respuesta-pregunta">{respuesta.pregunta_texto}</p>
                      <div className="respuesta-lineas">
                        <p className="respuesta-respondio">
                          <strong>Respondió:</strong> {respuesta.respuesta_dada_texto}
                        </p>
                        {!respuesta.es_correcta && (
                          <p className="respuesta-correcta"><strong>Respuesta correcta:</strong> {respuesta.respuesta_correcta_texto}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TemaDetail;

