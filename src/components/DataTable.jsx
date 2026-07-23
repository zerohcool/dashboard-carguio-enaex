import React, { useState, useMemo } from 'react';
import { 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Droplet, 
  AlertTriangle,
  FileSpreadsheet,
  Printer
} from 'lucide-react';
import { getRowAlerts } from '../utils/getRowAlerts';

function DataTable({ filteredData }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [isPrintingAll, setIsPrintingAll] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    if (isPrintingAll) return filteredData;
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize, isPrintingAll]);

  // Función para imprimir la planilla en formato horizontal
  const handlePrintTable = () => {
    setIsPrintingAll(true);

    const style = document.createElement('style');
    style.id = 'print-landscape-style';
    style.innerHTML = `
      @media print {
        @page {
          size: letter landscape !important;
          margin: 0.3in !important;
        }
        /* Ocultar el resto del dashboard y barras */
        header, 
        footer,
        .no-print,
        .file-info-bar,
        .filters-panel,
        .alerts-panel-section,
        .explosive-selection-banner,
        .dashboard-grid,
        .trucks-summary-panel,
        .charts-grid,
        .pagination,
        .vale-section-wrapper {
          display: none !important;
        }
        .table-card {
          display: block !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
          margin: 0 !important;
          background: #ffffff !important;
          color: #000000 !important;
        }
        .table-header {
          margin-bottom: 1rem !important;
          border-bottom: 2px solid #000000 !important;
          padding: 0.5rem 0 !important;
        }
        .data-table th {
          background: #e6effc !important;
          color: #1e3a8a !important;
          font-size: 8pt !important;
          padding: 4px 6px !important;
          border: 1px solid #cbd5e1 !important;
        }
        .data-table td {
          font-size: 7.5pt !important;
          padding: 4px 5px !important;
          border: 1px solid #cbd5e1 !important;
          color: #111827 !important;
        }
      }
    `;
    document.head.appendChild(style);

    const handleAfterPrint = () => {
      document.head.removeChild(style);
      setIsPrintingAll(false);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
    window.addEventListener('afterprint', handleAfterPrint);

    setTimeout(() => {
      window.print();
      // Fallback
      setTimeout(() => {
        if (document.getElementById('print-landscape-style')) {
          handleAfterPrint();
        }
      }, 500);
    }, 200);
  };

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
    <div className="table-card glass-panel" style={{ padding: isCollapsed && !isPrintingAll ? '1rem 1.5rem' : '1.5rem' }}>
      <div className="table-header" style={{ 
        marginBottom: isCollapsed && !isPrintingAll ? '0' : '1rem', 
        borderBottom: isCollapsed && !isPrintingAll ? 'none' : '1px solid var(--border-color)', 
        paddingBottom: isCollapsed && !isPrintingAll ? '0' : '1rem' 
      }}>
        <div>
          <h3 className="table-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={20} className="text-primary" />
            Detalle de Pozos
          </h3>
          {(!isCollapsed || isPrintingAll) ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }}>
              Mostrando {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} a {Math.min(currentPage * pageSize, filteredData.length)} de {filteredData.length} pozos filtrados
            </p>
          ) : (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', marginBottom: 0 }}>
              {filteredData.length} pozos en total (Sección minimizada)
            </p>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {(!isCollapsed || isPrintingAll) && filteredData.length > 0 && (
            <>
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
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} onClick={handlePrintTable}>
                <Printer size={14} /> Imprimir Planilla
              </button>
              
              <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }} onClick={handleExportCSV}>
                <Download size={14} /> Exportar CSV
              </button>
            </>
          )}
          
          <button 
            className="btn btn-primary" 
            style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }} 
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? 'Ver Detalle' : 'Minimizar'}
          </button>
        </div>
      </div>

      {(!isCollapsed || isPrintingAll) && (
        <>
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
                      <th>Temp.</th>
                      <th>Primas</th>
                      <th>Carga Fondo</th>
                      <th>Carga Columna</th>
                      <th>Total Real</th>
                      <th>Operador</th>
                      <th>Comentarios</th>
                      <th>Alertas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedData.map((row, idx) => {
                      const diffMeters = (row.longitudReal !== null && row.longitudReal !== undefined && row.longitudDis !== null && row.longitudDis !== undefined) 
                        ? (row.longitudReal - row.longitudDis) 
                        : null;
                      
                      const cFondo = (row.cargaFondo !== null && row.cargaFondo !== undefined) ? `${row.cargaFondo.toFixed(0)} kg` : '-';
                      const cColumna = (row.cargaColumna !== null && row.cargaColumna !== undefined) ? `${row.cargaColumna.toFixed(0)} kg` : '-';
                      const cTotal = (row.cargaTotal !== null && row.cargaTotal !== undefined) ? `${row.cargaTotal.toFixed(0)} kg` : '-';

                      const fExplosive = row.tipoFondo || '';
                      const cExplosive = row.tipoColumna || '';
                      
                      const fTruck = row.camionFondo || '';
                      const cTruck = row.camionColumna || '';

                      return (
                        <tr key={idx}>
                          <td style={{ fontWeight: '700' }}>{row.pozo || <span style={{ color: 'var(--danger)', fontSize: '0.75rem' }}>(vacío)</span>}</td>
                          <td>{row.poligono || '-'}</td>
                          <td>{row.fase || '-'}/{row.banco || '-'}</td>
                          <td style={{ fontWeight: '600' }}>{row.diametro || '-'}</td>
                          <td>{(row.longitudDis !== null && row.longitudDis !== undefined) ? row.longitudDis.toFixed(2) : '-'}</td>
                          <td>{(row.longitudReal !== null && row.longitudReal !== undefined) ? row.longitudReal.toFixed(2) : '-'}</td>
                          <td>{getDeviationBadge(row)}</td>
                          <td>{(row.taco !== null && row.taco !== undefined) ? row.taco.toFixed(2) : '-'}</td>
                          <td>
                            {row.agua !== null && row.agua > 0 ? (
                              <span style={{ color: '#60a5fa', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <Droplet size={12} /> {row.agua.toFixed(1)}m
                              </span>
                            ) : '-'}
                          </td>
                          <td>{row.temperatura !== null ? `${row.temperatura}°C` : '-'}</td>
                          <td>
                            {row.nPrimas !== null ? (
                              <span style={{ fontSize: '0.8rem' }}>
                                {row.nPrimas} {row.idPrima ? `(${row.idPrima})` : ''}
                              </span>
                            ) : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600' }}>{cFondo}</span>
                              {fExplosive && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fExplosive}</span>}
                              {fTruck && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{fTruck}</span>}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontWeight: '600' }}>{cColumna}</span>
                              {cExplosive && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cExplosive}</span>}
                              {cTruck && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cTruck}</span>}
                            </div>
                          </td>
                          <td style={{ fontWeight: '700', fontSize: '0.9rem' }}>{cTotal}</td>
                          <td style={{ fontSize: '0.8rem' }}>{row.operador || '-'}</td>
                          <td style={{ 
                            maxWidth: '150px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap', 
                            fontSize: '0.75rem',
                            color: 'var(--text-secondary)'
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

              {!isPrintingAll && totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Página {currentPage} de {totalPages}
                  </span>
                  
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button 
                      className="page-btn" 
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft size={16} style={{ display: 'block' }} />
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                      if (totalPages > 6 && Math.abs(currentPage - pageNum) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                        if (pageNum === 2 || pageNum === totalPages - 1) {
                          return <span key={pageNum} style={{ padding: '0.25rem 0.5rem', color: 'var(--text-muted)' }}>...</span>;
                        }
                        return null;
                      }

                      return (
                        <button 
                          key={pageNum} 
                          className="page-btn"
                          style={{
                            background: currentPage === pageNum ? 'var(--primary)' : 'transparent',
                            color: currentPage === pageNum ? '#ffffff' : 'var(--text-primary)',
                            borderColor: currentPage === pageNum ? 'var(--primary)' : 'var(--border-color)',
                            fontWeight: currentPage === pageNum ? '700' : 'normal'
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
        </>
      )}
    </div>
  );
}

export default DataTable;
