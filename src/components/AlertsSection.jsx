import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

function AlertsSection({ filteredData }) {
  // Procesamos los pozos con anomalías
  const alertsData = useMemo(() => {
    const fondoIssues = []; // Decimales o vacíos en Carga Fondo
    const emptyFieldIssues = []; // Celdas vacías en Carga, Tipo, Camión u Operador
    const diameterIssues = []; // Diámetros inválidos o que no están en pulgadas

    filteredData.forEach(row => {
      // 1. Carga de fondo decimal o vacía
      const isFondoDecimal = row.cargaFondo !== null && row.cargaFondo % 1 !== 0;
      const isFondoEmpty = row.cargaFondo === null;
      
      if (isFondoDecimal || isFondoEmpty) {
        fondoIssues.push({
          pozo: row.pozo,
          reason: isFondoEmpty ? 'Vacío' : `Decimal (${row.cargaFondo} kg)`,
          type: isFondoEmpty ? 'empty' : 'decimal'
        });
      }

      // 2. Celdas vacías en carga, tipo, camion u operador
      const missingFields = [];
      if (row.cargaFondo === null && row.cargaColumna === null) {
        missingFields.push('Carga');
      }
      if (row.tipoFondo === null && row.tipoColumna === null) {
        missingFields.push('Tipo');
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

      // 3. Diámetro no está en pulgadas (ej: "ERR: 160mm.", "165mm", "251", etc.) o es nulo/vacío
      let isDiameterNotInches = false;
      let diamReason = '';
      if (!row.diametro) {
        isDiameterNotInches = true;
        diamReason = 'Vacío';
      } else {
        const diamStr = String(row.diametro).toLowerCase().trim();
        const hasMm = diamStr.includes('mm') || diamStr.includes('m.m');
        const hasErr = diamStr.includes('err') || diamStr.includes('error');
        
        // Extraer números y comprobar si es mayor a 20 (heurística de mm)
        const numPart = parseFloat(diamStr.replace(/[^0-9.]/g, ''));
        const isLarge = !isNaN(numPart) && numPart > 20;
        
        if (hasMm || hasErr || isLarge || isNaN(numPart)) {
          isDiameterNotInches = true;
          diamReason = hasErr ? 'Error de celda' : hasMm ? 'Milímetros' : isLarge ? 'Mm implícito' : 'Inválido';
        }
      }
      
      if (isDiameterNotInches) {
        diameterIssues.push({
          pozo: row.pozo,
          reason: `${diamReason} (${row.diametro || 'vacío'})`
        });
      }
    });

    // 4. Múltiples tipos de explosivos en el vale filtrado
    const explosivesSet = new Set();
    filteredData.forEach(row => {
      if (row.tipoFondo) explosivesSet.add(row.tipoFondo);
      if (row.tipoColumna) explosivesSet.add(row.tipoColumna);
    });
    const explosivesList = Array.from(explosivesSet);

    return { fondoIssues, emptyFieldIssues, diameterIssues, explosivesList };
  }, [filteredData]);

  const hasAnyAlerts = 
    alertsData.fondoIssues.length > 0 || 
    alertsData.emptyFieldIssues.length > 0 || 
    alertsData.diameterIssues.length > 0 ||
    alertsData.explosivesList.length > 1;

  if (!hasAnyAlerts) {
    return (
      <div className="file-info-bar" style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.15)', marginBottom: '2rem' }}>
        <div className="file-info-details" style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', color: 'var(--success)' }}>
          <CheckCircle2 size={18} />
          <span className="file-info-name" style={{ color: 'var(--success)', fontWeight: '600' }}>
            Control de Calidad: Todos los pozos filtrados cumplen con los estándares de cargue. No se detectan anomalías.
          </span>
        </div>
      </div>
    );
  }

  return (
    <section className="alerts-panel-section">
      {/* Banner de alerta global por múltiples tipos de explosivo */}
      {alertsData.explosivesList.length > 1 && (
        <div className="file-info-bar" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', marginBottom: '1rem', color: 'var(--warning)', borderRadius: '6px' }}>
          <div className="file-info-details" style={{ width: '100%', gap: '0.5rem' }}>
            <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
            <span className="file-info-name" style={{ color: 'var(--warning)', fontWeight: '600' }}>
              Control de Calidad: El vale contiene {alertsData.explosivesList.length} tipos de explosivos ({alertsData.explosivesList.join(', ')}).
            </span>
          </div>
        </div>
      )}

      <div className="alerts-panel-header">
        <AlertTriangle size={20} />
        <h3>Alertas de Calidad de Datos ({alertsData.fondoIssues.length + alertsData.emptyFieldIssues.length + alertsData.diameterIssues.length})</h3>
      </div>
 
      <div className="alerts-panel-grid">
        {/* Card 1: Carga de Fondo Decimal o Vacía */}
        <div className="alert-card-item danger-alert">
          <div className="alert-card-title">
            <span>Carga de Fondo: Valores con Decimales o Vacíos</span>
            <span className={`alert-card-badge ${alertsData.fondoIssues.length > 0 ? 'danger' : 'success'}`}>
              {alertsData.fondoIssues.length} pozos
            </span>
          </div>
          
          {alertsData.fondoIssues.length === 0 ? (
            <span className="alert-card-empty-msg">✓ Todos los pozos tienen carga de fondo entera y registrada.</span>
          ) : (
            <div className="alert-card-pozos-list">
               {alertsData.fondoIssues.map((issue, idx) => (
                <span 
                  key={idx} 
                  className="alert-badge-pozo" 
                  title={`Carga de fondo: ${issue.reason}`}
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
                  className="alert-badge-pozo" 
                  title={`Falta rellenar: ${issue.fields}`}
                  style={{ borderLeft: '3px solid var(--warning)' }}
                >
                  P-{issue.pozo}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({issue.fields})</span>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Card 3: Diámetros con Formato Erróneo o no en Pulgadas */}
        <div className="alert-card-item danger-alert" style={{ borderLeft: '4px solid var(--danger)' }}>
          <div className="alert-card-title">
            <span>Diámetros: Valores no en Pulgadas o con Error</span>
            <span className={`alert-card-badge ${alertsData.diameterIssues.length > 0 ? 'danger' : 'success'}`} style={{
              background: alertsData.diameterIssues.length > 0 ? 'var(--danger-glow)' : 'rgba(16, 185, 129, 0.1)',
              color: alertsData.diameterIssues.length > 0 ? '#f87171' : 'var(--success)',
              border: alertsData.diameterIssues.length > 0 ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(16, 185, 129, 0.2)'
            }}>
              {alertsData.diameterIssues.length} pozos
            </span>
          </div>
          
          {alertsData.diameterIssues.length === 0 ? (
            <span className="alert-card-empty-msg">✓ Todos los pozos tienen diámetros válidos en pulgadas.</span>
          ) : (
            <div className="alert-card-pozos-list">
              {alertsData.diameterIssues.map((issue, idx) => (
                <span 
                  key={idx} 
                  className="alert-badge-pozo" 
                  title={`Detalle diámetro: ${issue.reason}`}
                  style={{ borderLeft: '3px solid var(--danger)' }}
                >
                  P-{issue.pozo}
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>({issue.reason})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default AlertsSection;
