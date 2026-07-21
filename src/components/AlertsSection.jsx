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

  const shouldHighlightCell = (key, value, errorType, fullRow = {}) => {
    const cleanKey = String(key).toLowerCase().trim();
    const valStr = value !== null && value !== undefined ? String(value).trim() : '';

    const getRowValue = (rowObj, possibleKeys) => {
      for (const k of possibleKeys) {
        if (rowObj[k] !== undefined && rowObj[k] !== null) {
          return rowObj[k];
        }
      }
      return null;
    };

    if (errorType === 'fondo' || errorType === 'total_mismatch') {
      if (
        cleanKey === 'carga fondo' || cleanKey === 'carga fondo (kg)' ||
        cleanKey === 'carga columna' || cleanKey === 'carga columna (kg)' ||
        cleanKey === 'carga total' || cleanKey === 'carga total (kg)'
      ) {
        const numVal = parseFloat(valStr);
        if (valStr === '' || isNaN(numVal) || numVal % 1 !== 0) {
          return 'cell-highlight-error';
        }
        
        // También resaltar si hay un descuadre
        const cTotal = parseFloat(getRowValue(fullRow, ['Carga total (kg)', 'Carga Total', 'cargaTotal']) || 0);
        const cFondo = parseFloat(getRowValue(fullRow, ['Carga fondo (kg)', 'Carga fondo', 'Carga Fondo', 'cargaFondo']) || 0);
        const cColumna = parseFloat(getRowValue(fullRow, ['Carga columna (kg)', 'Carga columna', 'Carga Columna', 'cargaColumna']) || 0);
        if (Math.abs(cTotal - (cFondo + cColumna)) > 0.1) {
          return 'cell-highlight-error';
        }
      }
    }
    
    if (errorType === 'empty') {
      const cTotal = parseFloat(getRowValue(fullRow, ['Carga total (kg)', 'Carga Total', 'cargaTotal']));
      const cFondo = parseFloat(getRowValue(fullRow, ['Carga fondo (kg)', 'Carga fondo', 'Carga Fondo', 'cargaFondo']));
      const cColumna = parseFloat(getRowValue(fullRow, ['Carga columna (kg)', 'Carga columna', 'Carga Columna', 'cargaColumna']));
      
      const hasFondoLoad = !isNaN(cFondo) && cFondo > 0;
      const hasColumnaLoad = !isNaN(cColumna) && cColumna > 0;

      // 1. Carga vacía
      const isCargaKey = cleanKey === 'carga total' || cleanKey === 'carga total (kg)' || cleanKey === 'carga fondo' || cleanKey === 'carga fondo (kg)' || cleanKey === 'carga columna' || cleanKey === 'carga columna (kg)';
      if (isCargaKey && valStr === '') {
        const allLoadsEmpty = (isNaN(cFondo) || cFondo === 0) && (isNaN(cColumna) || cColumna === 0);
        const totalEmpty = isNaN(cTotal);
        if (totalEmpty || allLoadsEmpty) {
          return 'cell-highlight-warning';
        }
      }

      // 2. Tipo vacío
      const isTipoFondoKey = cleanKey === 'tipo fondo' || cleanKey === 'tipo';
      const isTipoColumnaKey = cleanKey === 'tipo.' || cleanKey === 'tipo columna';
      if (isTipoFondoKey && valStr === '' && hasFondoLoad) {
        return 'cell-highlight-warning';
      }
      if (isTipoColumnaKey && valStr === '' && hasColumnaLoad) {
        return 'cell-highlight-warning';
      }

      // 3. Camión vacío
      const isCamionFondoKey = cleanKey === 'camión fondo' || cleanKey === 'camion';
      const isCamionColumnaKey = cleanKey === 'camion.' || cleanKey === 'camión columna';
      if (isCamionFondoKey && valStr === '' && hasFondoLoad) {
        return 'cell-highlight-warning';
      }
      if (isCamionColumnaKey && valStr === '' && hasColumnaLoad) {
        return 'cell-highlight-warning';
      }

      // 4. Operador vacío
      if (cleanKey === 'operador' && valStr === '') {
        return 'cell-highlight-warning';
      }
    }
    
    if (errorType === 'diameter') {
      if (cleanKey === 'diametro' || cleanKey === 'diámetro') {
        return 'cell-highlight-error';
      }
    }
    
    return '';
  };

  // Procesamos los pozos con anomalías
  const alertsData = useMemo(() => {
    const fondoIssues = []; // Decimales, vacíos o descuadre en Cargas
    const emptyFieldIssues = []; // Celdas vacías críticas (Trazabilidad mandatoria)
    const diameterIssues = []; // Diámetros no en pulgadas
    const totalMismatchIssues = []; // Ya no se usa por separado, pero lo definimos vacío por compatibilidad si es necesario
    const uniqueExplosives = new Set();

    filteredData.forEach(row => {
      // 1. Carga decimal, vacía o con descuadre (suma fondo+columna o carga total)
      const hasFondoColumna = (row.cargaFondo !== null && row.cargaFondo !== undefined) || (row.cargaColumna !== null && row.cargaColumna !== undefined);
      const sumFondoColumna = (row.cargaFondo || 0) + (row.cargaColumna || 0);
      const isSumDecimal = hasFondoColumna && (sumFondoColumna % 1 !== 0);
      const isSumEmpty = !hasFondoColumna;
      const isTotalEmpty = row.cargaTotal === null || row.cargaTotal === undefined;
      const isTotalDecimal = !isTotalEmpty && (row.cargaTotal % 1 !== 0);
      
      // Descuadre entre suma y total (si hay total y hay cargas)
      const isMismatch = (row.cargaTotal !== null && row.cargaTotal !== undefined) && Math.abs(row.cargaTotal - sumFondoColumna) > 0.1;

      if (isSumDecimal || isSumEmpty || isTotalEmpty || isTotalDecimal || isMismatch) {
        let reason = '';
        if (isMismatch) {
          reason = `Descuadre: Suma ${sumFondoColumna} vs Total ${row.cargaTotal}`;
        } else if (isSumEmpty && isTotalEmpty) {
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

      // 2. Celdas vacías en columnas mandatorias (Trazabilidad)
      const missingFields = [];
      
      // Falta carga total, carga fondo y carga columna simultáneamente
      const isAllCargasEmpty = isTotalEmpty && isSumEmpty;
      if (isAllCargasEmpty) {
        missingFields.push('Cargas (Vacío Total)');
      } else {
        // Validación cruzada de campos mandatorios:
        // Si hay carga fondo, tipoFondo y camionFondo son mandatorios
        const hasFondoLoad = row.cargaFondo !== null && row.cargaFondo > 0;
        if (hasFondoLoad) {
          if (!row.tipoFondo || String(row.tipoFondo).trim() === '') missingFields.push('Tipo Fondo');
          if (!row.camionFondo || String(row.camionFondo).trim() === '') missingFields.push('Camión Fondo');
        }
        
        // Si hay carga columna, tipoColumna y camionColumna son mandatorios
        const hasColumnaLoad = row.cargaColumna !== null && row.cargaColumna > 0;
        if (hasColumnaLoad) {
          if (!row.tipoColumna || String(row.tipoColumna).trim() === '') missingFields.push('Tipo Columna');
          if (!row.camionColumna || String(row.camionColumna).trim() === '') missingFields.push('Camión Columna');
        }
      }

      // Tipo de explosivo vacío a la vez (si no se validó arriba por no haber cargas)
      const isAllTiposEmpty = (!row.tipoFondo || String(row.tipoFondo).trim() === '') &&
                              (!row.tipoColumna || String(row.tipoColumna).trim() === '');
      if (isAllTiposEmpty && !missingFields.includes('Tipo Fondo') && !missingFields.includes('Tipo Columna')) {
        missingFields.push('Tipo Explosivo');
      }

      // Camión vacío a la vez (si no se validó arriba por no haber cargas)
      const isAllCamionesEmpty = (!row.camionFondo || String(row.camionFondo).trim() === '') &&
                                 (!row.camionColumna || String(row.camionColumna).trim() === '');
      if (isAllCamionesEmpty && !missingFields.includes('Camión Fondo') && !missingFields.includes('Camión Columna')) {
        missingFields.push('Camión');
      }

      // Operador
      if (!row.operador || String(row.operador).trim() === '') {
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

        {/* Card 2: Trazabilidad Mandatoria */}
        <div className="alert-card-item warning-alert">
          <div className="alert-card-title">
            <span>Trazabilidad Mandatoria: Campos Vacíos según Carga Activa</span>
            <span className={`alert-card-badge ${alertsData.emptyFieldIssues.length > 0 ? 'warning' : 'success'}`}>
              {alertsData.emptyFieldIssues.length} pozos
            </span>
          </div>
          
          {alertsData.emptyFieldIssues.length === 0 ? (
            <span className="alert-card-empty-msg">✓ Todos los pozos activos tienen tipo, camión y operador correspondientes.</span>
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
                        const highlightClass = shouldHighlightCell(key, val, inspectingPozo.errorType, inspectingPozo.row);
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
