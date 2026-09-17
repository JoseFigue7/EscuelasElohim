import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { promocionService, promedioService, unwrapList } from '../services/api';
import './Dashboard.css';

const AlumnoDashboard = () => {
  const [promociones, setPromociones] = useState([]);
  const [promediosByPromo, setPromediosByPromo] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [promosRes, notasRes] = await Promise.all([
        promocionService.getAll(),
        promedioService.getMisNotas().catch(() => ({ data: [] })),
      ]);
      setPromociones(unwrapList(promosRes));
      const map = {};
      (Array.isArray(notasRes.data) ? notasRes.data : []).forEach((item) => {
        map[item.promocion_id] = item;
      });
      setPromediosByPromo(map);
      setError('');
    } catch (err) {
      setError('Error al cargar las promociones');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h1>Mis Cursos</h1>
      {promociones.length === 0 ? (
        <div className="empty-state">
          <p>No estás inscrito en ninguna promoción actualmente.</p>
        </div>
      ) : (
        <div className="cards-grid">
          {promociones.map((promocion) => {
            const detalle = promediosByPromo[promocion.id];
            const promedio = detalle ? Number(detalle.promedio_final) : null;
            return (
              <Link
                key={promocion.id}
                to={`/promociones/${promocion.id}`}
                className="card"
              >
                <h2>{promocion.nombre}</h2>
                <p className="curso-name">{promocion.curso_nombre}</p>
                {promedio != null && (
                  <p
                    className="curso-promedio"
                    style={{
                      margin: '10px 0 0',
                      fontWeight: 700,
                      color: detalle.aprobado ? '#166534' : '#991b1b',
                    }}
                  >
                    Promedio: {promedio.toFixed(1)}%
                    {detalle.aprobado ? ' · Aprobado' : ' · En curso'}
                  </p>
                )}
                <div className="card-footer">
                  <span>
                    Inicio: {new Date(promocion.fecha_inicio).toLocaleDateString()}
                  </span>
                  {promocion.fecha_fin && (
                    <span>
                      Fin: {new Date(promocion.fecha_fin).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <p style={{ marginTop: 24, color: '#6b7280' }}>
        Ver detalle de todas tus notas en{' '}
        <Link to="/calificaciones">Calificaciones</Link>.
      </p>
    </div>
  );
};

export default AlumnoDashboard;
