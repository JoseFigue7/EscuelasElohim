import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Configurar axios por defecto
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token a las peticiones
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/** Recorre todas las páginas de un listado paginado del API. */
export async function fetchAllPaginated(requestPage, pageSize = 100) {
  const results = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const response = await requestPage(page, pageSize);
    const data = response.data;

    if (Array.isArray(data)) {
      return data;
    }

    results.push(...(data.results || []));
    hasMore = Boolean(data.next);
    page += 1;
  }

  return results;
}

/** Normaliza respuestas paginadas o arrays planos del API. */
export function unwrapList(response) {
  if (Array.isArray(response)) return response;
  const data = response?.data ?? response;
  if (Array.isArray(data)) return data;
  return data?.results ?? [];
}

// Servicio de Autenticación
export const authService = {
  login: async (username, password) => {
    const response = await api.post('/auth/login/', { username, password });
    const { access, refresh } = response.data;
    localStorage.setItem('access_token', access);
    localStorage.setItem('refresh_token', refresh);
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  getProfile: async () => {
    const response = await api.get('/auth/profile/');
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  updateProfile: async (data) => {
    // Limpiar datos: convertir strings vacíos a null para campos opcionales
    const cleanedData = { ...data };
    
    // Campos opcionales: convertir strings vacíos a null
    if (cleanedData.telefono === '') cleanedData.telefono = null;
    if (cleanedData.fecha_nacimiento === '') cleanedData.fecha_nacimiento = null;
    if (cleanedData.direccion === '') cleanedData.direccion = null;
    
    // Usar PATCH para actualización parcial (no requiere todos los campos)
    const response = await api.patch('/auth/profile/', cleanedData);
    localStorage.setItem('user', JSON.stringify(response.data));
    return response.data;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },

  getUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },
};

// Servicio de Cursos
export const cursoService = {
  getAll: () => api.get('/cursos/'),
  getById: (id) => api.get(`/cursos/${id}/`),
  create: (data) => api.post('/cursos/', data),
  update: (id, data) => api.put(`/cursos/${id}/`, data),
  delete: (id) => api.delete(`/cursos/${id}/`),
};

// Servicio de Promociones
export const promocionService = {
  getAll: () => api.get('/promociones/'),
  getById: (id) => api.get(`/promociones/${id}/`),
  create: (data) => api.post('/promociones/', data),
  update: (id, data) => api.put(`/promociones/${id}/`, data),
  delete: (id) => api.delete(`/promociones/${id}/`),
};

// Servicio de Temas
export const temaService = {
  getAll: (promocionId) => 
    api.get('/temas/', { params: promocionId ? { promocion: promocionId } : {} }),
  getById: (id) => api.get(`/temas/${id}/`),
  create: (data) => api.post('/temas/', data),
  update: (id, data) => api.put(`/temas/${id}/`, data),
  patch: (id, data) => api.patch(`/temas/${id}/`, data),
  delete: (id) => api.delete(`/temas/${id}/`),
};

// Servicio de Materiales
export const materialService = {
  getAll: (temaId) => 
    api.get('/materiales/', { params: temaId ? { tema: temaId } : {} }),
  getById: (id) => api.get(`/materiales/${id}/`),
  create: (data) => {
    const formData = new FormData();
    formData.append('tema', data.tema);
    formData.append('titulo', data.titulo);
    formData.append('tipo', data.tipo || 'archivo');
    if (data.descripcion) formData.append('descripcion', data.descripcion);
    if (data.url) formData.append('url', data.url);
    if (data.archivo) formData.append('archivo', data.archivo);
    return api.post('/materiales/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  delete: (id) => api.delete(`/materiales/${id}/`),
  download: (id) => api.get(`/materiales/${id}/?download=true`, { responseType: 'blob' }),
};

// Servicio de Inscripciones
export const inscripcionService = {
  getAll: async (promocionId) => {
    const params = promocionId ? { promocion: promocionId } : {};
    return fetchAllPaginated((page, pageSize) =>
      api.get('/inscripciones/', { params: { ...params, page, page_size: pageSize } })
    );
  },
  getById: (id) => api.get(`/inscripciones/${id}/`),
  create: (data) => api.post('/inscripciones/', data),
  update: (id, data) => api.patch(`/inscripciones/${id}/`, data),
  delete: (id) => api.delete(`/inscripciones/${id}/`),
};

// Servicio de Asistencias
export const asistenciaService = {
  getAll: (temaId) => 
    api.get('/asistencias/', { params: temaId ? { tema: temaId } : {} }),
  getById: (id) => api.get(`/asistencias/${id}/`),
  create: (data) => api.post('/asistencias/', data),
  update: (id, data) => api.put(`/asistencias/${id}/`, data),
  delete: (id) => api.delete(`/asistencias/${id}/`),
};

// Servicio de Preguntas
export const preguntaService = {
  getAll: (temaId) => 
    api.get('/preguntas/', { params: temaId ? { tema: temaId } : {} }),
  getById: (id) => api.get(`/preguntas/${id}/`),
  create: (data) => api.post('/preguntas/', data),
  update: (id, data) => api.put(`/preguntas/${id}/`, data),
  delete: (id) => api.delete(`/preguntas/${id}/`),
};

// Servicio de Exámenes
export const examenService = {
  getAll: (temaId) => 
    api.get('/examenes/', { params: temaId ? { tema: temaId } : {} }),
  getById: (id) => api.get(`/examenes/${id}/`),
  create: (data) => api.post('/examenes/', data),
  update: (id, data) => api.put(`/examenes/${id}/`, data),
  delete: (id) => api.delete(`/examenes/${id}/`),
  preguntas: (id) => api.get(`/examenes/${id}/preguntas/`),
  responder: (id, respuestas) => api.post(`/examenes/${id}/responder/`, { respuestas }),
};

// Servicio de Recuperaciones
export const recuperacionService = {
  getAll: async (examenId, inscripcionId) => {
    const params = {};
    if (examenId) params.examen = examenId;
    if (inscripcionId) params.inscripcion = inscripcionId;
    return fetchAllPaginated((page, pageSize) =>
      api.get('/recuperaciones/', { params: { ...params, page, page_size: pageSize } })
    );
  },
  getById: (id) => api.get(`/recuperaciones/${id}/`),
  create: (data) => api.post('/recuperaciones/', data),
  update: (id, data) => api.put(`/recuperaciones/${id}/`, data),
  delete: (id) => api.delete(`/recuperaciones/${id}/`),
  contarPorInscripcion: (inscripcionId) => 
    api.get('/recuperaciones/contar_por_inscripcion/', { params: { inscripcion_id: inscripcionId } }),
};

// Servicio de Calificaciones
export const calificacionService = {
  getAll: async (examenId) => {
    const params = examenId ? { examen: examenId } : {};
    return fetchAllPaginated((page, pageSize) =>
      api.get('/calificaciones/', { params: { ...params, page, page_size: pageSize } })
    );
  },
  getById: (id) => api.get(`/calificaciones/${id}/`),
  getDetalle: (id) => api.get(`/calificaciones/${id}/detalle/`),
};

// Servicio de Promedios
export const promedioService = {
  getAll: (promocionId) => 
    api.get('/promedios/', { params: promocionId ? { promocion: promocionId } : {} }),
  getById: (id) => api.get(`/promedios/${id}/`),
  calcularPromedios: (promocionId) => 
    api.post('/promedios/calcular_promedios/', { promocion_id: promocionId }),
};

// Servicio de Diplomas
export const diplomaService = {
  getAll: (promocionId) =>
    api.get('/diplomas/', { params: promocionId ? { promocion: promocionId } : {} }),
  getById: (id) => api.get(`/diplomas/${id}/`),
  generarDiplomas: (promocionId) => 
    api.post('/diplomas/generar_diplomas/', { promocion_id: promocionId }),
  descargarPdf: (id) =>
    api.get(`/diplomas/${id}/`, { params: { download: 'true' }, responseType: 'blob' }),
  descargarZip: (promocionId) =>
    api.get('/diplomas/descargar_zip/', {
      params: { promocion_id: promocionId },
      responseType: 'blob',
    }),
};

// Servicio de Usuarios (Admin)
export const usuarioService = {
  getAll: async (tipo, buscar) => {
    const params = {};
    if (tipo) params.tipo = tipo;
    if (buscar) params.buscar = buscar;
    return fetchAllPaginated((page, pageSize) =>
      api.get('/auth/usuarios/', { params: { ...params, page, page_size: pageSize } })
    );
  },
  getById: (id) => api.get(`/auth/usuarios/${id}/`),
  create: (data) => api.post('/auth/usuarios/', data),
  update: (id, data) => api.put(`/auth/usuarios/${id}/`, data),
  delete: (id) => api.delete(`/auth/usuarios/${id}/`),
  cambiarPassword: (data) => api.post('/auth/usuarios/cambiar_password/', data),
  importarCsv: (file) => {
    const formData = new FormData();
    formData.append('archivo', file);
    return api.post('/auth/usuarios/importar-csv/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;

