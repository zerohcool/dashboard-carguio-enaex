import React, { useState, useMemo } from 'react';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Droplet, 
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { getRowAlerts } from '../utils/getRowAlerts';

function DataTable({ filteredData }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  const renderAlertBadges = (row) => {
    const alerts = getRowAlerts(row);
    if (alerts.length === 0) {
      return <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Sin alertas</span>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {alerts.map((a, i) => (
          <span 
            key={i} 
            className="badge" 
            style={{ 
              fontSize: '0.7rem', 
              padding: '2px 4px', 
              whiteSpace: 'nowrap',
              background: a.includes('decimales') ? 'var(--danger-glow)' : 'rgba(245, 158, 11, 0.12)',
              color: a.includes('decimales') ? '#f87171' : '#fbbf24',
              border: a.includes('decimales') ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '4px',
              fontWeight: '600'
            }}
          >
            {a}
          </span>
        ))}
      </div>
    );
  };

  // Reiniciar a la primera página si cambian los datos filtrados
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filteredData]);

  // Paginación
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Exportar datos a CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) return;

    // Encabezados en español acordes al Excel original
    const headers = [
      'N° Pozo', 'Fase', 'Banco', 'Polígono', 'Diámetro', 
      'Long. Dis. [m]', 'Long. Real [m]', 'Diferencia [m]',
      'Taco [m]', 'Agua [m]', 'Temp.', 'N° Primas', 'ID Prima',
      'Carga Fondo [kg]', 'Tipo Fondo', 'Camión Fondo',
      'Carga Columna [kg]', 'Tipo Columna', 'Camión Columna',
      'Operador', 'Den. in situ', 'Comentarios', 'Alertas de Calidad'
    ];

    const rows = filteredData.map(row => {
      const diff = row.longitudReal !== null && row.longitudDis !== null 
        ? (row.longitudReal - row.longitudDis).toFixed(2)
        : '';
        
      const rowAlerts = getRowAlerts(row).join(', ');
        
      return [
        row.pozo || '',
        row.fase || '',
        row.banco || '',
        row.poligono || '',
        row.diametro || '',
        row.longitudDis !== null ? row.longitudDis : '',
        row.longitudReal !== null ? row.longitudReal : '',
        diff,
        row.taco !== null ? row.taco : '',
        row.agua !== null ? row.agua : '',
        row.temperatura || '',
        row.nPrimas !== null ? row.nPrimas : '',
        row.idPrima || '',
        row.cargaFondo !== null ? row.cargaFondo : '',
        row.tipoFondo || '',
        row.camionFondo || '',
        row.cargaColumna !== null ? row.cargaColumna : '',
        row.tipoColumna || '',
        row.camionColumna || '',
        row.operador || '',
        row.denInSitu !== null ? row.denInSitu : '',
        (row.comentarios || '').replace(/"/g, '""'), // Escapar comillas en comentarios
        rowAlerts
      ];
    });

    // Formatear como archivo CSV usando delimitador punto y coma (;) muy común en entornos hispanohablantes para Excel
    const csvContent = [
      headers.join(';'),
      ...rows.map(e => e.map(val => typeof val === 'string' ? `"${val}"` : val).join(';'))
    ].join('\n');

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' }); // Añadimos BOM UTF-8
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Carguio_Filtrado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para determinar si hay una desviación de longitud crítica
  const getDeviationBadge = (row) => {
    if (row.longitudReal === null || row.longitudDis === null) return null;
    const diff = row.longitudReal - row.longitudDis;
    const absDiff = Math.abs(diff);

    if (absDiff > 1.0) {
      return (
        <span className="badge badge-danger" title={`Desviación crítica de ${diff.toFixed(2)}m`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <AlertTriangle size={12} /> {diff > 0 ? '+' : ''}{diff.toFixed(1)}m
        </span>
      );
    } else if (absDiff > 0.4) {
      return (
        <span className="badge badge-warning" title={`Desviación moderada de ${diff.toFixed(2)}m`} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <AlertTriangle size={12} /> {diff > 0 ? '+' : ''}{diff.toFixed(1)}m
        </span>
      );
    }
    return (
      <span className="badge badge-success" title="Dentro de tolerancia">
        OK
      </span>
    );
  };

  return (
    <div className="table-card glass-panel">
      <div className="table-header">
        <div>
          <h3 className="table-title">Detalle de Pozos</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Mostrando {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredData.length)} de {filteredData.length} pozos filtrados
          </p>
        </div>
        
        {filteredData.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pozos por pág:</span>
              <select 
                className="filter-select"
                style={{ padding: '0.35rem 0.5rem', minWidth: '70px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            
            <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleExportCSV}>
              <Download size={14} /> Exportar CSV
            </button>
          </div>
        )}
      </div>

      {filteredData.length === 0 ? (
        <div className="empty-state" style={{ padding: '2rem' }}>
          <p className="empty-state-desc">No hay datos de pozos para mostrar con los filtros aplicados.</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Pozo</th>
                  <th>Polígono</th>
                  <th>Fase / Banco</th>
                  <th>Diámetro</th>
                  <th>Diseño (m)</th>
                  <th>Real (m)</th>
                  <th>Desv.</th>
                  <th>Taco (m)</th>
                  <th>Agua (m)</th>
                  <th>Carga Fondo</th>
                  <th>Camión Fondo</th>
                  <th>Carga Col.</th>
                  <th>Operador</th>
                  <th>Comentarios</th>
                  <th>Alertas</th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((row) => {
                  const hasWater = row.agua !== null && row.agua > 0;
                  
                  return (
                    <tr key={row.id}>
                      <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{row.pozo}</td>
                      <td>
                        {row.poligono ? (
                          <span className="badge badge-info">{row.poligono}</span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(vacío)</span>
                        )}
                      </td>
                      <td>{row.fase && row.banco ? `F${row.fase} / B${row.banco}` : row.fase || row.banco || '-'}</td>
                      <td>{row.diametro || '-'}</td>
                      <td>{row.longitudDis !== null ? `${row.longitudDis.toFixed(2)}m` : '-'}</td>
                      <td style={{ color: row.longitudReal !== null ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {row.longitudReal !== null ? `${row.longitudReal.toFixed(2)}m` : '-'}
                      </td>
                      <td>{getDeviationBadge(row)}</td>
                      <td>{row.taco !== null ? `${row.taco.toFixed(2)}m` : '-'}</td>
                      <td style={{ color: hasWater ? 'var(--primary)' : 'var(--text-muted)' }}>
                        {hasWater ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontWeight: '500' }}>
                            <Droplet size={12} fill="var(--primary)" /> {row.agua.toFixed(2)}m
                          </span>
                        ) : (
                          'Seco'
                        )}
                      </td>
                      <td style={{ fontWeight: '500' }}>
                        {row.cargaFondo !== null ? `${row.cargaFondo.toLocaleString('es-CL')} kg` : '-'}
                        {row.tipoFondo && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{row.tipoFondo}</span>}
                      </td>
                      <td>{row.camionFondo || '-'}</td>
                      <td style={{ fontWeight: '500' }}>
                        {row.cargaColumna !== null && row.cargaColumna > 0 ? `${row.cargaColumna.toLocaleString('es-CL')} kg` : '-'}
                        {row.tipoColumna && <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block' }}>{row.tipoColumna}</span>}
                      </td>
                      <td>{row.operador || '-'}</td>
                      <td style={{ 
                        maxWidth: '220px', 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        color: 'var(--text-secondary)',
                        fontSize: '0.8rem' 
                      }} title={row.comentarios || ''}>
                        {row.comentarios || '-'}
                      </td>
                      <td>{renderAlertBadges(row)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="pagination">
              <span>Página {currentPage} de {totalPages}</span>
              <div className="pagination-controls">
                <button 
                  className="page-btn" 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} style={{ display: 'block' }} />
                </button>
                
                {/* Botones de número de página dinámicos */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                  // Mostrar páginas centradas alrededor de la actual
                  let pageNum = currentPage;
                  if (currentPage <= 3) {
                    pageNum = idx + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + idx;
                  } else {
                    pageNum = currentPage - 2 + idx;
                  }
                  
                  // Validar rango
                  if (pageNum < 1 || pageNum > totalPages) return null;

                  return (
                    <button 
                      key={pageNum}
                      className="page-btn"
                      style={{ 
                        backgroundColor: currentPage === pageNum ? 'var(--primary)' : '', 
                        color: currentPage === pageNum ? '#030712' : '',
                        borderColor: currentPage === pageNum ? 'var(--primary)' : '',
                        fontWeight: currentPage === pageNum ? 'bold' : 'normal'
                      }}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button 
                  className="page-btn" 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} style={{ display: 'block' }} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default DataTable;
