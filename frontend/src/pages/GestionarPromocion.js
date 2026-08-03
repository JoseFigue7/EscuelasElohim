import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  API_URL,
  temaService,
  inscripcionService,
  usuarioService,
  promedioService,
  diplomaService,
  promocionService,
  recuperacionService,
  unwrapList,
} from '../services/api';
import PreguntasSection from '../components/PreguntasSection';
import ExamenesSection from '../components/ExamenesSection';
import './GestionarPromocion.css';

const toServerDateTime = (localValue) => {
  if (!localValue) return localValue;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return localValue;
  return date.toISOString();
};

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
    docentes: [],
  });
  const [docentesAsignables, setDocentesAsignables] = useState([]);
  const [newTema, setNewTema] = useState({
    titulo: '',
    descripcion: '',
    fecha_clase: '',
  });
  const [selectedAlumno, setSelectedAlumno] = useState('');
  const [alumnoSearch, setAlumnoSearch] = useState('');
  const [inscripcionAlumnoSearch, setInscripcionAlumnoSearch] = useState('');
  const [temaSearch, setTemaSearch] = useState('');
  const [showRecuperacionMasiva, setShowRecuperacionMasiva] = useState(false);
  const [recuperacionMasivaForm, setRecuperacionMasivaForm] = useState({
    temas: [],
    fecha_inicio: '',
    fecha_fin: '',
  });
  const [recuperacionMasivaLoading, setRecuperacionMasivaLoading] = useState(false);

  const resolveDiplomaUrl = (archivo) => {
    if (!archivo) return null;
    if (archivo.startsWith('http://') || archivo.startsWith('https://')) {
      return archivo;
    }
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}${archivo.startsWith('/') ? '' : '/'}${archivo}`;
  };

  const safeFilenamePart = (value) => {
    if (!value) return '';
    return value.replace(/[^A-Za-z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120);
  };


  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [promocionResponse, temasResponse, inscripcionesData, alumnosData, docentesData, adminsData] = await Promise.all([
        promocionService.getById(id),
        temaService.getAll(id),
        inscripcionService.getAll(id),
        usuarioService.getAll('alumno'),
        usuarioService.getAll('docente'),
        usuarioService.getAll('admin'),
      ]);
      setPromocion(promocionResponse.data);
      setTemas(unwrapList(temasResponse));
      setInscripciones(unwrapList(inscripcionesData));
      setAlumnos(unwrapList(alumnosData));
      const docentesMap = new Map();
      [...unwrapList(docentesData), ...unwrapList(adminsData)].forEach((u) => docentesMap.set(u.id, u));
      setDocentesAsignables(Array.from(docentesMap.values()));
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

  const handleMoveTema = async (temaId, direction) => {
    if (hasTemaSearch) {
      alert('Limpia la búsqueda para poder reordenar los temas.');
      return;
    }
    if (!promocion?.curso) return;

    const index = temas.findIndex((t) => t.id === temaId);
    const newIndex = index + direction;
    if (index < 0 || newIndex < 0 || newIndex >= temas.length) return;

    const nuevoOrden = [...temas];
    const [moved] = nuevoOrden.splice(index, 1);
    nuevoOrden.splice(newIndex, 0, moved);
    setTemas(nuevoOrden);

    try {
      const response = await temaService.reordenar(
        promocion.curso,
        nuevoOrden.map((t) => t.id)
      );
      setTemas(Array.isArray(response.data) ? response.data : nuevoOrden);
    } catch (err) {
      console.error('Error al reordenar temas:', err.response?.data || err);
      loadData();
      alert(
        'Error al reordenar temas: ' +
          (err.response?.data?.error || err.response?.data?.detail || err.message)
      );
    }
  };

  const openRecuperacionMasiva = () => {
    setRecuperacionMasivaForm({
      temas: temas.map((t) => t.id),
      fecha_inicio: '',
      fecha_fin: '',
    });
    setShowRecuperacionMasiva(true);
  };

  const toggleTemaRecuperacion = (temaId) => {
    setRecuperacionMasivaForm((prev) => {
      const temasIds = [...prev.temas];
      const index = temasIds.indexOf(temaId);
      if (index > -1) {
        temasIds.splice(index, 1);
      } else {
        temasIds.push(temaId);
      }
      return { ...prev, temas: temasIds };
    });
  };

  const handleCreateRecuperacionMasiva = async (e) => {
    e.preventDefault();
    if (!id) return;
    if (recuperacionMasivaForm.temas.length === 0) {
      alert('Selecciona al menos un tema');
      return;
    }
    if (!recuperacionMasivaForm.fecha_inicio || !recuperacionMasivaForm.fecha_fin) {
      alert('Indica fecha de inicio y fin');
      return;
    }

    setRecuperacionMasivaLoading(true);
    try {
      const response = await recuperacionService.crearPorPromocion({
        promocion: Number(id),
        temas: recuperacionMasivaForm.temas,
        fecha_inicio: toServerDateTime(recuperacionMasivaForm.fecha_inicio),
        fecha_fin: toServerDateTime(recuperacionMasivaForm.fecha_fin),
        activa: true,
      });

      const data = response.data || {};
      let mensaje = `Se crearon ${data.creadas || 0} recuperaciones.`;
      if (Array.isArray(data.detalle) && data.detalle.length > 0) {
        const resumen = data.detalle
          .filter((d) => d.creadas > 0)
          .map((d) => `• ${d.tema_titulo}: ${d.creadas} alumno(s)`)
          .join('\n');
        if (resumen) mensaje += `\n\n${resumen}`;
      }
      if (data.advertencia) {
        mensaje += `\n\n${data.advertencia}`;
      }

      setShowRecuperacionMasiva(false);
      setRecuperacionMasivaForm({ temas: [], fecha_inicio: '', fecha_fin: '' });
      alert(mensaje);
    } catch (err) {
      const data = err.response?.data;
      let msg = err.message;
      if (typeof data === 'string') {
        msg = data;
      } else if (data?.non_field_errors) {
        msg = Array.isArray(data.non_field_errors)
          ? data.non_field_errors.join('\n')
          : String(data.non_field_errors);
      } else if (data?.detail) {
        msg = data.detail;
      } else if (data?.error) {
        msg = data.error;
      } else if (data && typeof data === 'object') {
        msg = Object.entries(data)
          .map(([key, value]) => {
            const text = Array.isArray(value) ? value.join(' ') : String(value);
            return key === 'non_field_errors' ? text : `${key}: ${text}`;
          })
          .join('\n');
      }
      alert('Error al crear recuperaciones: ' + msg);
    } finally {
      setRecuperacionMasivaLoading(false);
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
      setInscripcionAlumnoSearch('');
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
      const data = unwrapList(response);
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

  const handleDescargarNotas = async () => {
    try {
      const response = await promocionService.exportarNotas(id);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const promocionSafe = safeFilenamePart(promocion?.nombre) || `promocion_${id}`;
      link.download = `Notas_${promocionSafe}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      let detail = 'No se pudo descargar el Excel de notas.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const parsed = JSON.parse(text);
          detail = parsed.error || parsed.detail || detail;
        } catch (_) {
          // keep default
        }
      } else if (err.response?.data?.error || err.response?.data?.detail) {
        detail = err.response.data.error || err.response.data.detail;
      }
      alert(detail);
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
      setPromedios(unwrapList(response));
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
      const docentesIds = (promocion.docentes && promocion.docentes.length > 0)
        ? promocion.docentes
        : (promocion.docente ? [promocion.docente] : []);
      setEditPromocion({
        nombre: promocion.nombre || '',
        descripcion: promocion.descripcion || '',
        fecha_inicio: promocion.fecha_inicio ? promocion.fecha_inicio.split('T')[0] : '',
        fecha_fin: promocion.fecha_fin ? promocion.fecha_fin.split('T')[0] : '',
        activa: promocion.activa !== undefined ? promocion.activa : true,
        docentes: docentesIds,
      });
      setShowEditPromocion(true);
    }
  };

  const toggleDocenteAsignado = (docenteId) => {
    setEditPromocion((prev) => {
      const docentes = prev.docentes.includes(docenteId)
        ? prev.docentes.filter((id) => id !== docenteId)
        : [...prev.docentes, docenteId];
      return { ...prev, docentes };
    });
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
  const inscritosAlumnoIds = new Set(
    inscripciones.map((ins) => String(ins.alumno?.id ?? ins.alumno))
  );
  const normalizedInscripcionSearch = inscripcionAlumnoSearch.trim().toLowerCase();
  const alumnosDisponiblesInscripcion = alumnos.filter(
    (alumno) => !inscritosAlumnoIds.has(String(alumno.id))
  );
  const filteredAlumnosInscripcion = alumnosDisponiblesInscripcion.filter((alumno) => {
    if (!normalizedInscripcionSearch) return true;
    const nombre = `${alumno.first_name || ''} ${alumno.last_name || ''}`.trim().toLowerCase();
    const username = (alumno.username || '').toLowerCase();
    const email = (alumno.email || '').toLowerCase();
    return (
      nombre.includes(normalizedInscripcionSearch) ||
      username.includes(normalizedInscripcionSearch) ||
      email.includes(normalizedInscripcionSearch)
    );
  });

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
              {promocion.docentes_nombres?.length > 0 && (
                <span className="promocion-docentes">
                  👨‍🏫 Docentes: {promocion.docentes_nombres.join(', ')}
                </span>
              )}
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
          <button onClick={openRecuperacionMasiva} className="btn-secondary">
            🔄 Habilitar exámenes de recuperación
          </button>
          <button onClick={handleEditPromocion} className="btn-primary">
            ✏️ Editar Promoción
          </button>
        </div>
      </div>

      {showRecuperacionMasiva && (
        <div className="section-card recuperacion-masiva-card">
          <div className="section-header">
            <div>
              <h2>🔄 Habilitar exámenes de recuperación</h2>
              <p className="info-text" style={{ margin: '8px 0 0' }}>
                Selecciona los temas. Se asignará recuperación automáticamente a quienes
                <strong> no presentaron</strong> o <strong> reprobaron</strong> el examen
                (no a quienes ya aprobaron).
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowRecuperacionMasiva(false)}
              className="btn-close"
            >
              ×
            </button>
          </div>
          <form onSubmit={handleCreateRecuperacionMasiva} className="promocion-edit-form">
            <div className="form-group">
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setRecuperacionMasivaForm((prev) => ({
                      ...prev,
                      temas: temas.map((t) => t.id),
                    }))
                  }
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() =>
                    setRecuperacionMasivaForm((prev) => ({ ...prev, temas: [] }))
                  }
                >
                  Quitar todos
                </button>
                <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>
                  {recuperacionMasivaForm.temas.length} tema
                  {recuperacionMasivaForm.temas.length !== 1 ? 's' : ''} seleccionado
                  {recuperacionMasivaForm.temas.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="temas-recuperacion-list">
                {temas.length === 0 ? (
                  <p className="info-text">No hay temas en esta promoción.</p>
                ) : (
                  temas.map((tema) => {
                    const checked = recuperacionMasivaForm.temas.includes(tema.id);
                    return (
                      <label
                        key={tema.id}
                        className={`tema-recuperacion-option ${checked ? 'selected' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTemaRecuperacion(tema.id)}
                        />
                        <span>{tema.titulo}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
              <div className="form-group">
                <label>Fecha y hora de inicio *</label>
                <input
                  type="datetime-local"
                  value={recuperacionMasivaForm.fecha_inicio}
                  onChange={(e) =>
                    setRecuperacionMasivaForm({
                      ...recuperacionMasivaForm,
                      fecha_inicio: e.target.value,
                    })
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>Fecha y hora de fin *</label>
                <input
                  type="datetime-local"
                  value={recuperacionMasivaForm.fecha_fin}
                  onChange={(e) =>
                    setRecuperacionMasivaForm({
                      ...recuperacionMasivaForm,
                      fecha_fin: e.target.value,
                    })
                  }
                  required
                />
              </div>
            </div>
            <div className="form-actions" style={{ display: 'flex', gap: '12px' }}>
              <button
                type="submit"
                className="btn-primary"
                disabled={recuperacionMasivaLoading || recuperacionMasivaForm.temas.length === 0}
              >
                {recuperacionMasivaLoading
                  ? 'Creando...'
                  : 'Crear recuperaciones'}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowRecuperacionMasiva(false)}
                disabled={recuperacionMasivaLoading}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

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
            <div className="form-group">
              <label>Docentes asignados</label>
              <div className="docentes-asignados-list">
                {docentesAsignables.length === 0 ? (
                  <p className="form-hint">No hay docentes o administradores disponibles.</p>
                ) : (
                  docentesAsignables.map((docente) => (
                    <label key={docente.id} className="checkbox-label docente-asignado-item">
                      <input
                        type="checkbox"
                        checked={editPromocion.docentes.includes(docente.id)}
                        onChange={() => toggleDocenteAsignado(docente.id)}
                      />
                      <span>
                        {docente.first_name || docente.last_name
                          ? `${docente.first_name || ''} ${docente.last_name || ''}`.trim()
                          : docente.username}
                        {' '}
                        <small>({docente.tipo === 'admin' ? 'Admin' : 'Docente'})</small>
                      </span>
                    </label>
                  ))
                )}
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
            {filteredTemas.map((tema) => {
              const fullIndex = temas.findIndex((t) => t.id === tema.id);
              return (
              <div
                key={tema.id}
                className={`tema-item ${tema.visible_para_estudiante === false ? 'tema-oculto' : ''}`}
              >
                {!hasTemaSearch && (
                  <div className="tema-orden-controls">
                    <button
                      type="button"
                      className="btn-orden"
                      title="Subir"
                      disabled={fullIndex <= 0}
                      onClick={() => handleMoveTema(tema.id, -1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-orden"
                      title="Bajar"
                      disabled={fullIndex < 0 || fullIndex >= temas.length - 1}
                      onClick={() => handleMoveTema(tema.id, 1)}
                    >
                      ↓
                    </button>
                  </div>
                )}
                <Link
                  to={`/promociones/${id}/temas/${tema.id}`}
                  className="tema-item-link"
                >
                  <div className="tema-item-main">
                    <h3>{tema.titulo}</h3>
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
              </div>
              );
            })}
            {temas.length === 0 && (
              <div className="empty-state">
                <p>No hay temas creados aún para este curso.</p>
                <p style={{marginTop: '8px', fontSize: '0.9rem', color: '#888'}}>
                  Al crear un tema, estará disponible para todas las promociones de este curso.
                  Usa las flechas ↑ ↓ para ordenarlos.
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
              <button
                onClick={() => {
                  if (showNewInscripcion) {
                    setShowNewInscripcion(false);
                    setInscripcionAlumnoSearch('');
                    setSelectedAlumno('');
                  } else {
                    setShowNewInscripcion(true);
                  }
                }}
                className="btn-primary"
              >
                {showNewInscripcion ? 'Cancelar' : '+ Inscribir Alumno'}
              </button>
            </div>
          </div>

          {showNewInscripcion && (
            <form onSubmit={handleInscribirAlumno} className="new-form inscripcion-form">
              <div className="form-group">
                <label>Buscar alumno para inscribir *</label>
                <input
                  type="text"
                  value={inscripcionAlumnoSearch}
                  onChange={(e) => {
                    setInscripcionAlumnoSearch(e.target.value);
                    setSelectedAlumno('');
                  }}
                  className="temas-search-input"
                  placeholder="Nombre, usuario o correo..."
                  autoFocus
                />
                <small className="inscripcion-search-hint">
                  {filteredAlumnosInscripcion.length} alumno(s) disponible(s)
                  {alumnosDisponiblesInscripcion.length !== alumnos.length &&
                    ` · ${alumnos.length - alumnosDisponiblesInscripcion.length} ya inscrito(s)`}
                </small>
              </div>
              <div className="alumno-picker-list">
                {filteredAlumnosInscripcion.length === 0 ? (
                  <p className="alumno-picker-empty">
                    {alumnosDisponiblesInscripcion.length === 0
                      ? 'Todos los alumnos ya están inscritos en esta promoción.'
                      : 'No hay alumnos que coincidan con tu búsqueda.'}
                  </p>
                ) : (
                  filteredAlumnosInscripcion.map((alumno) => {
                    const nombre = `${alumno.first_name || ''} ${alumno.last_name || ''}`.trim();
                    const isSelected = String(selectedAlumno) === String(alumno.id);
                    return (
                      <button
                        key={alumno.id}
                        type="button"
                        className={`alumno-picker-item${isSelected ? ' selected' : ''}`}
                        onClick={() => setSelectedAlumno(String(alumno.id))}
                      >
                        <span className="alumno-picker-name">{nombre || alumno.username}</span>
                        <span className="alumno-picker-meta">@{alumno.username}</span>
                        {alumno.email && (
                          <span className="alumno-picker-meta">{alumno.email}</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
              <button type="submit" className="btn-primary" disabled={!selectedAlumno}>
                Inscribir alumno seleccionado
              </button>
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
              <button onClick={handleDescargarNotas} className="btn-secondary">
                Descargar Notas
              </button>
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
