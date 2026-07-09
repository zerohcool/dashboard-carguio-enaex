import React, { useMemo } from 'react';
import { AlertTriangle, CheckCircle2, Info } from 'lucide-react';

function AlertsSection({ filteredData }) {
  // Procesamos los pozos con anomalías
  const alertsData = useMemo(() => {
    const fondoIssues = []; // Decimales o vacíos en Carga Fondo
    const emptyFieldIssues = []; // Celdas vacías en Carga, Tipo, Camión u Operador

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
    });

    return { fondoIssues, emptyFieldIssues };
  }, [filteredData]);

  const hasAnyAlerts = alertsData.fondoIssues.length > 0 || alertsData.emptyFieldIssues.length > 0;

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
      <div className="alerts-panel-header">
        <AlertTriangle size={20} />
        <h3>Alertas de Calidad de Datos ({alertsData.fondoIssues.length + alertsData.emptyFieldIssues.length})</h3>
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
      </div>
    </section>
  );
}

export default AlertsSection;
