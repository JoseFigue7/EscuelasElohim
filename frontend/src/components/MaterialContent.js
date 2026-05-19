import React from 'react';
import './MaterialContent.css';

export const getMaterialImageSrc = (material) => {
  if (material.tipo === 'imagen') {
    return material.archivo_url || material.url || null;
  }
  return null;
};

const MaterialContent = ({ material, onDownload, showTitle = true, compact = false }) => {
  const tipo = material.tipo || 'archivo';
  const imageSrc = tipo === 'imagen' ? (material.archivo_url || material.url || null) : null;

  return (
    <div className={`material-content ${compact ? 'material-content--compact' : ''}`}>
      {showTitle && <h4 className="material-content-title">{material.titulo}</h4>}
      {material.descripcion && (
        <p className="material-content-desc">{material.descripcion}</p>
      )}

      {tipo === 'enlace' && material.url && (
        <a
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="material-link"
        >
          🔗 {material.url}
        </a>
      )}

      {tipo === 'imagen' && imageSrc && (
        <div className="material-image-preview">
          <a href={imageSrc} target="_blank" rel="noopener noreferrer">
            <img src={imageSrc} alt={material.titulo} loading="lazy" />
          </a>
        </div>
      )}

      {(tipo === 'archivo' || (tipo === 'imagen' && material.archivo_url)) &&
        onDownload && (
        <button
          type="button"
          onClick={() => onDownload(material.id, material)}
          className="btn-download"
        >
          📥 Descargar{material.nombre_archivo ? ` (${material.nombre_archivo})` : ''}
        </button>
      )}

      {!compact && material.fecha_creacion && (
        <span className="material-date">
          {new Date(material.fecha_creacion).toLocaleDateString()}
        </span>
      )}
    </div>
  );
};

export default MaterialContent;
