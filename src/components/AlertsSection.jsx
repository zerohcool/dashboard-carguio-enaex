import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

const isNotPureInches = (diamStr) => {
  if (!diamStr) return false;
  const cleanStr = String(diamStr).toLowerCase();
  if (cleanStr.includes('err') || cleanStr.includes('mm') || cleanStr.includes('m.m')) {
    return true;
  }
  let numVal = parseFloat(cleanStr.replace(/"/g, '').trim());
  if (cleanStr.includes('/')) return false;
  if (!isNaN(numVal) && numVal > 20) return true;
  return false;
};

function AlertsSection({ filteredData, rawExcelRows }) {
  const [inspectingPozo, setInspectingPozo] = useState(null);

  const handleInspectPozo = (pozoNum, errorType) => {
    if (!rawExcelRows || rawExcelRows.length === 0) return;

    const foundRow = rawExcelRows.find(row => {
      const pVal = row['N° Pozo'] || row['pozo'] || row['Pozo'];
      if (pVal !== undefined && pVal !== null) {
        return String(pVal).trim() === String(pozoNum).trim();
      }
      return false;
    });

    if (foundRow) {
      setInspectingPozo({
        pozo: pozoNum,
        row: foundRow,
        errorType: errorType
      });
    }
  };

  const shouldHighlightCell = (key, value, errorType) => {
    const cleanKey = String(key).toLowerCase().trim();
    const valStr = value !== null && value !== undefined ? String(value).trim() : '';

    if (errorType === 'fondo') {
      if (
        cleanKey === 'carga fondo' || cleanKey === 'carga fondo (kg)' ||
        cleanKey === 'carga columna' || cleanKey === 'carga columna (kg)' ||
        cleanKey === 'carga total' || cleanKey === 'carga total (kg)'
      ) {
        const numVal = parseFloat(valStr);
        if (valStr === '' || isNaN(numVal) || numVal % 1 !== 0) {
          return 'cell-highlight-error';
        }
      }
    }
    
    if (errorType === 'empty') {
      const isCargaKey = cleanKey === 'carga total' || cleanKey === 'carga total (kg)' || cleanKey === 'carga fondo' || cleanKey === 'carga fondo (kg)' || cleanKey === 'carga columna' || cleanKey === 'carga columna (kg)';
      const isTipoKey = cleanKey === 'tipo fondo' || cleanKey === 'tipo' || cleanKey === 'tipo.' || cleanKey === 'tipo columna';
      const isCamionKey = cleanKey === 'camión fondo' || cleanKey === 'camion' || cleanKey === 'camion.' || cleanKey === 'camión columna';
      const isOperadorKey = cleanKey === 'operador';

      if (valStr === '') {
        if (isCargaKey || isTipoKey || isCamionKey || isOperadorKey) {
          return 'cell-highlight-warning';
        }
      }
    }
    
    if (errorType === 'diameter') {
      if (cleanKey === 'diametro' || cleanKey === 'diámetro') {
        return 'cell-highlight-error';
      }
    }

    if (errorType === 'total_mismatch') {
      if (
        cleanKey === 'carga fondo' || cleanKey === 'carga fondo (kg)' ||
        cleanKey === 'carga columna' || cleanKey === 'carga columna (kg)' ||
        cleanKey === 'carga total' || cleanKey === 'carga total (kg)'
      ) {
        return 'cell-highlight-error';
      }
    }
    
    return '';
  };

  // Procesamos los pozos con anomalías
  const alertsData = useMemo(() => {
    const fondoIssues = []; // Decimales o vacíos en Carga
    const emptyFieldIssues = []; // Celdas vacías en Carga, Tipo, Camión u Operador
    const diameterIssues = []; // Diámetros no en pulgadas
    const totalMismatchIssues = []; // Suma de cargas no coincide con carga total
    const uniqueExplosives = new Set();

    filteredData.forEach(row => {
      // 1. Carga decimal o vacía (suma fondo+columna o carga total)
      const hasFondoColumna = (row.cargaFondo !== null && row.cargaFondo !== undefined) || (row.cargaColumna !== null && row.cargaColumna !== undefined);
      const sumFondoColumna = (row.cargaFondo || 0) + (row.cargaColumna || 0);
      const isSumDecimal = hasFondoColumna && (sumFondoColumna % 1 !== 0);
      const isSumEmpty = !hasFondoColumna;
      const isTotalEmpty = row.cargaTotal === null || row.cargaTotal === undefined;
      const isTotalDecimal = !isTotalEmpty && (row.cargaTotal % 1 !== 0);

      if (isSumDecimal || isSumEmpty || isTotalEmpty || isTotalDecimal) {
        let reason = '';
        if (isSumEmpty && isTotalEmpty) {
          reason = 'Vacío';
        } else if (isSumDecimal || isTotalDecimal) {
          const parts = [];
          if (isSumDecimal) parts.push(`Suma: ${sumFondoColumna}`);
          if (isTotalDecimal) parts.push(`Total: ${row.cargaTotal}`);
          reason = `Decimal (${parts.join(', ')})`;
        } else if (isTotalEmpty) {
          reason = 'Total Vacío';
        } else {
          reason = 'Cargas Vacías';
        }

        fondoIssues.push({
          pozo: row.pozo,
          reason,
          type: (isSumEmpty || isTotalEmpty) ? 'empty' : 'decimal'
        });
      }

      // 2. Celdas vacías en columnas mandatorias
      const missingFields = [];
      if (row.cargaTotal === null || row.cargaTotal === undefined) {
        missingFields.push('Carga Total');
      }
      if (row.cargaFondo === null && row.cargaColumna === null) {
        missingFields.push('Cargas (Fondo y Columna)');
      }
      if (row.tipoFondo === null && row.tipoColumna === null) {
        missingFields.push('Tipo Explosivo');
      }
      if (row.camionFondo === null && row.camionColumna === null) {
        missingFields.push('Camión');
      }
      if (row.operador === null || row.operador.trim() === '') {
        missingFields.push('Operador');
      }

      if (missingFields.length > 0) {
        emptyFieldIssues.push({
          pozo: row.pozo,
          fields: missingFields.join(', ')
        });
      }

      // 3. Diámetro no en pulgadas
      if (isNotPureInches(row.diametro)) {
        diameterIssues.push({
          pozo: row.pozo,
          diametro: row.diametro || '(vacío)'
        });
      }

      // 4. Inconsistencia en Carga Total (Suma no coincide)
      if (row.cargaTotal !== null && row.cargaTotal !== undefined) {
        const expectedTotal = (row.cargaFondo || 0) + (row.cargaColumna || 0);
        if (Math.abs(row.cargaTotal - expectedTotal) > 0.1) {
          totalMismatchIssues.push({
            pozo: row.pozo,
            reason: `Suma: ${expectedTotal} kg vs Total: ${row.cargaTotal} kg`
          });
        }
      }

      // Coleccionar tipos de explosivo únicos
      if (row.tipoFondo) uniqueExplosives.add(row.tipoFondo);
      if (row.tipoColumna) uniqueExplosives.add(row.tipoColumna);
    });

    const hasMultipleExplosives = uniqueExplosives.size > 1;
    const explosiveListStr = Array.from(uniqueExplosives).join(', ');

    return { 
      fondoIssues, 
      emptyFieldIssues, 
      diameterIssues, 
      totalMismatchIssues,
      hasMultipleExplosives, 
      explosiveListStr 
    };
  }, [filteredData]);

  const hasAnyAlerts = 
    alertsData.fondoIssues.length > 0 || 
    alertsData.emptyFieldIssues.length > 0 || 
    alertsData.diameterIssues.length > 0 ||
    alertsData.totalMismatchIssues.length > 0 ||
    alertsData.hasMultipleExplosives;

  if (!hasAnyAlerts) {
    return (
      <div className="file-info-bar no-print" style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', marginBottom: '2rem' }}>
        <div className="file-info-details" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', color: 'var(--success)' }}>
          <CheckCircle2 size={18} />
          <span className="file-info-name" style={{ color: 'var(--success)', fontWeight: '600' }}>
            Control de Calidad: Todos los pozos filtrados cumplen con los estándares de cargue. No se detectan anomalías.
          </span>
        </div>
      </div>
    );
  }

  const totalAlertsCount = 
    alertsData.fondoIssues.length + 
    alertsData.emptyFieldIssues.length + 
    alertsData.diameterIssues.length + 
    alertsData.totalMismatchIssues.length +
    (alertsData.hasMultipleExplosives ? 1 : 0);

  return (
    <section className="alerts-panel-section">
      <div className="alerts-panel-header">
        <AlertTriangle size={20} />
        <h3>Alertas de Calidad de Datos ({totalAlertsCount})</h3>
      </div>

      {alertsData.hasMultipleExplosives && (
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.06)', 
          border: '1px solid rgba(245, 158, 11, 0.25)', 
          padding: '0.5rem 0.8rem', 
          borderRadius: '6px', 
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: '#d97706',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>
            <strong>Alerta de Operación:</strong> Se detectó más de un tipo de explosivo en los datos filtrados (<strong>{alertsData.explosiveListStr}</strong>). Por favor, valida que corresponda a la planificación.
          </span>
        </div>
      )}

      <div className="alerts-panel-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
        {/* Card 1: Carga Decimal o Vacía */}
        <div className="alert-card-item danger-alert">
          <div className="alert-card-title">
            <span>Cargas: Valores con Decimales o Vacíos</span>
            <span className={`alert-card-badge ${alertsData.fondoIssues.length > 0 ? 'danger' : 'success'}`}>
              {alertsData.fondoIssues.length} pozos
            </span>
          </div>
          
          {alertsData.fondoIssues.length === 0 ? (
            <span className="alert-card-empty-msg">✓ Todos los pozos tienen cargas enteras y registradas.</span>
          ) : (
             <div className="alert-card-pozos-list">
              {alertsData.fondoIssues.map((issue, idx) => (
                <span 
                  key={idx} 
                  className="alert-badge-pozo clickable-alert-badge" 
                  title={`Haz clic para inspeccionar fila. Carga de fondo: ${issue.reason}`}
                  onClick={() => handleInspectPozo(issue.pozo, 'fondo')}
                  style={{ 
                    borderLeft: issue.type === 'decimal' ? '3px solid var(--danger)' : '3px solid var(--text-muted)'
                  }}
                >
                  P-{issue.pozo}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({issue.reason})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card 2: Campos Vacíos Críticos */}
        <div className="alert-card-item warning-alert">
          <div className="alert-card-title">
            <span>Celdas Vacías en Columnas Críticas (Carga, Tipo, Camión u Operador)</span>
            <span className={`alert-card-badge ${alertsData.emptyFieldIssues.length > 0 ? 'warning' : 'success'}`}>
              {alertsData.emptyFieldIssues.length} pozos
            </span>
          </div>
          
          {alertsData.emptyFieldIssues.length === 0 ? (
            <span className="alert-card-empty-msg">✓ No hay pozos con celdas críticas vacías.</span>
          ) : (
            <div className="alert-card-pozos-list">
              {alertsData.emptyFieldIssues.map((issue, idx) => (
                <span 
                  key={idx} 
                  className="alert-badge-pozo clickable-alert-badge" 
                  title={`Haz clic para inspeccionar fila. Falta rellenar: ${issue.fields}`}
                  onClick={() => handleInspectPozo(issue.pozo, 'empty')}
                  style={{ borderLeft: '3px solid var(--warning)' }}
                >
                  P-{issue.pozo}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({issue.fields})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Diámetro no es en Pulgadas */}
        <div className="alert-card-item danger-alert" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="alert-card-title">
            <span>Diámetro de Pozos: Formato en Milímetros o ERR</span>
            <span className={`alert-card-badge ${alertsData.diameterIssues.length > 0 ? 'danger' : 'success'}`} style={{
              background: alertsData.diameterIssues.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: alertsData.diameterIssues.length > 0 ? '#ef4444' : '#10b981'
            }}>
              {alertsData.diameterIssues.length} pozos
            </span>
          </div>
          
          {alertsData.diameterIssues.length === 0 ? (
            <span className="alert-card-empty-msg">✓ Todos los pozos tienen diámetros en formato de pulgadas.</span>
          ) : (
            <div className="alert-card-pozos-list">
              {alertsData.diameterIssues.map((issue, idx) => (
                <span 
                  key={idx} 
                  className="alert-badge-pozo clickable-alert-badge" 
                  title={`Haz clic para inspeccionar fila. Diámetro actual: ${issue.diametro}`}
                  onClick={() => handleInspectPozo(issue.pozo, 'diameter')}
                  style={{ borderLeft: '3px solid #ef4444' }}
                >
                  P-{issue.pozo}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({issue.diametro})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card 4: Inconsistencia en Carga Total */}
        <div className="alert-card-item danger-alert" style={{ borderLeft: '4px solid #f97316' }}>
          <div className="alert-card-title">
            <span>Inconsistencia: Carga Total vs. Suma de Cargas</span>
            <span className={`alert-card-badge ${alertsData.totalMismatchIssues.length > 0 ? 'danger' : 'success'}`} style={{
              background: alertsData.totalMismatchIssues.length > 0 ? 'rgba(249, 115, 22, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              color: alertsData.totalMismatchIssues.length > 0 ? '#f97316' : '#10b981'
            }}>
              {alertsData.totalMismatchIssues.length} pozos
            </span>
          </div>
          
          {alertsData.totalMismatchIssues.length === 0 ? (
            <span className="alert-card-empty-msg">✓ Todos los pozos coinciden la carga total con la suma de fondo y columna.</span>
          ) : (
            <div className="alert-card-pozos-list">
              {alertsData.totalMismatchIssues.map((issue, idx) => (
                <span 
                  key={idx} 
                  className="alert-badge-pozo clickable-alert-badge" 
                  title={`Haz clic para inspeccionar fila. ${issue.reason}`}
                  onClick={() => handleInspectPozo(issue.pozo, 'total_mismatch')}
                  style={{ borderLeft: '3px solid #f97316' }}
                >
                  P-{issue.pozo}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({issue.reason.split(' vs ')[0]})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Inspector de Fila Original */}
      {inspectingPozo && (
        <div className="modal-overlay no-print" onClick={() => setInspectingPozo(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="modal-header-title">
                <AlertTriangle size={18} style={{ color: '#ef4444' }} />
                <span>
                  Inspector de Fila Original: Pozo <strong>{inspectingPozo.pozo}</strong>
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setInspectingPozo(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body-area">
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Mostrando la fila tal como aparece en el archivo Excel original. La celda que generó la alerta se destaca en color.
              </p>
              
              <div className="inspect-table-wrapper">
                <table className="inspect-table">
                  <thead>
                    <tr>
                      {Object.keys(inspectingPozo.row).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Object.entries(inspectingPozo.row).map(([key, val]) => {
                        const highlightClass = shouldHighlightCell(key, val, inspectingPozo.errorType);
                        return (
                          <td key={key} className={highlightClass}>
                            {val === null || val === undefined || String(val).trim() === '' ? (
                              <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(vacío)</span>
                            ) : (
                              String(val)
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AlertsSection;
