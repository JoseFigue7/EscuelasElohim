import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { temaService, materialService } from '../services/api';
import './PromocionDetail.css';

const PromocionDetail = () => {
  const { id } = useParams();
  const [temas, setTemas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTema, setSelectedTema] = useState(null);

  useEffect(() => {
    loadTemas();
  }, [id]);

  const loadTemas = async () => {
    try {
      setLoading(true);
      const response = await temaService.getAll(id);
      setTemas(response.data.results || response.data);
      setError('');
    } catch (err) {
      setError('Error al cargar los temas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTemaClick = async (temaId) => {
    if (selectedTema?.id === temaId) {
      setSelectedTema(null);
      return;
    }

    try {
      const response = await temaService.getById(temaId);
      setSelectedTema(response.data);
    } catch (err) {
      console.error('Error al cargar el tema:', err);
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
      console.error('Error al descargar el material:', err);
      alert('Error al descargar el material');
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="promocion-detail">
      <Link to="/" className="back-link">← Volver a mis cursos</Link>
      <h1>Temas y Materiales</h1>

      <div className="temas-list">
        {temas.map((tema) => (
          <div key={tema.id} className="tema-item">
            <div
              className="tema-header"
              onClick={() => handleTemaClick(tema.id)}
            >
              <h3>
                Tema {tema.numero_tema}: {tema.titulo}
              </h3>
              <span className="toggle-icon">
                {selectedTema?.id === tema.id ? '▼' : '▶'}
              </span>
            </div>

            {selectedTema?.id === tema.id && (
              <div className="tema-content">
                {selectedTema.descripcion && (
                  <p className="descripcion">{selectedTema.descripcion}</p>
                )}
                {selectedTema.fecha_clase && (
                  <p className="fecha">
                    Fecha de clase: {new Date(selectedTema.fecha_clase).toLocaleDateString()}
                  </p>
                )}

                {selectedTema.materiales && selectedTema.materiales.length > 0 ? (
                  <div className="materiales">
                    <h4>Materiales:</h4>
                    <ul>
                      {selectedTema.materiales.map((material) => (
                        <li key={material.id} className="material-item">
                          <span>{material.titulo}</span>
                          <button
                            onClick={() => handleDownload(material.id, material)}
                            className="btn-download"
                          >
                            Descargar
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="no-materiales">No hay materiales disponibles</p>
                )}

                <Link
                  to={`/temas/${tema.id}/examenes`}
                  className="btn-examen"
                >
                  Ver Exámenes
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {temas.length === 0 && (
        <div className="empty-state">
          <p>No hay temas disponibles para esta promoción.</p>
        </div>
      )}
    </div>
  );
};

export default PromocionDetail;



