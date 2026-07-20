import React, { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Scale, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Densidades de productos configuradas
const DENSIDADES = {
  'anfo': 0.77,
  'blendex 930': 1.0,
  'blendex 940': 1.2,
  'blendex 950': 1.32,
  'emultex': 1.32,
  'vertex 930': 1.0,
  'vertex 940': 1.23,
  'vertex 950': 1.32,
  'vertex 970': 1.34,
  'vertex s': 1.29
};

// Función para obtener la densidad del producto (fuzzy match)
export const getProductDensity = (productName) => {
  if (!productName) return 0;
  const nameLower = productName.toLowerCase().trim();
  
  for (const [key, val] of Object.entries(DENSIDADES)) {
    const normalizedKey = key.replace(/\s+/g, '');
    const normalizedName = nameLower.replace(/[-\s]/g, '');
    if (normalizedName.includes(normalizedKey)) {
      return val;
    }
  }
  return 0;
};

// Función para obtener la tolerancia del producto
export const getProductTolerance = (productName) => {
  if (!productName) return 0.05; // 5% por defecto
  const nameLower = productName.toLowerCase().trim();
  if (nameLower.includes('anfo') || nameLower.includes('emultex')) {
    return 0.03; // ±3%
  }
  return 0.05; // ±5%
};

// Función para parsear el diámetro de pulgadas o milímetros a un número flotante en pulgadas
export const parseDiameterToInches = (diamStr) => {
  if (!diamStr) return 0;
  let cleanStr = String(diamStr).toLowerCase().replace(/"/g, '').trim();
  
  // Detectar si contiene explícitamente "mm" o "m.m"
  const isMmExplicit = cleanStr.includes('mm') || cleanStr.includes('m.m');
  cleanStr = cleanStr.replace(/mm|m\.m/g, '').trim();
  
  let inches = 0;
  
  if (cleanStr.includes(' ')) {
    const parts = cleanStr.split(' ');
    const whole = parseFloat(parts[0]);
    if (parts[1] && parts[1].includes('/')) {
      const fracParts = parts[1].split('/');
      const num = parseFloat(fracParts[0]);
      const den = parseFloat(fracParts[1]);
      inches = whole + (num / den);
    } else {
      inches = whole;
    }
  } else if (cleanStr.includes('/')) {
    const parts = cleanStr.split('/');
    const num = parseFloat(parts[0]);
    const den = parseFloat(parts[1]);
    inches = num / den;
  } else {
    inches = parseFloat(cleanStr);
  }
  
  if (isNaN(inches)) return 0;
  
  // Heurística: Si tiene "mm" explícito, o si el valor es mayor a 20
  // (ningún pozo de tronadura mide >20 pulgadas, pero sí 165mm, 251mm, etc.)
  if (isMmExplicit || inches > 20) {
    return inches / 25.4; // Convertir mm a pulgadas
  }
  
  return inches;
};

function DeviationSection({ filteredData, rawExcelRows, theme }) {
  const [inspectingPozo, setInspectingPozo] = useState(null);

  const handleInspectPozo = (pozoNum) => {
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
        row: foundRow
      });
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Resetear páginas de tabla al cambiar los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredData]);

  // Calcular las desviaciones para cada pozo calificado
  const deviationData = useMemo(() => {
    return filteredData.map(row => {
      if (
        row.longitudReal === null || 
        row.taco === null || 
        !row.diametro || 
        row.cargaTotal === null
      ) {
        return null;
      }
      
      const dInches = parseDiameterToInches(row.diametro);
      if (dInches <= 0) return null;
      
      const density = getProductDensity(row.tipoFondo);
      if (density <= 0) return null;
      
      const height = row.longitudReal - row.taco;
      if (height <= 0) return null;
      
      // Fórmula del volumen de cilindro en base a pulgadas y metros:
      // Carga Teórica (kg) = Altura Carga (m) * 0.5067 * Diámetro² (in) * Densidad (g/cc)
      const cargaTeorica = height * 0.50671 * (dInches * dInches) * density;
      const desviacionKg = row.cargaTotal - cargaTeorica;
      const desviacionPct = (desviacionKg / cargaTeorica) * 100;
      
      const tolerance = getProductTolerance(row.tipoFondo);
      const isConforme = Math.abs(desviacionPct) <= (tolerance * 100);
      
      return {
        pozo: row.pozo,
        poligono: row.poligono,
        diametro: row.diametro,
        longitudReal: row.longitudReal,
        taco: row.taco,
        alturaCarga: height,
        explosivo: row.tipoFondo,
        densidad: density,
        cargaReal: row.cargaTotal,
        cargaTeorica: parseFloat(cargaTeorica.toFixed(1)),
        desviacionKg: parseFloat(desviacionKg.toFixed(1)),
        desviacionPct: parseFloat(desviacionPct.toFixed(1)),
        tolerance: tolerance * 100,
        isConforme
      };
    }).filter(Boolean);
  }, [filteredData]);

  // Resumen Estadístico
  const stats = useMemo(() => {
    const count = deviationData.length;
    if (count === 0) return null;

    let totalReal = 0;
    let totalTeorica = 0;
    let fueraTolerancia = 0;

    deviationData.forEach(item => {
      totalReal += item.cargaReal;
      totalTeorica += item.cargaTeorica;
      if (!item.isConforme) fueraTolerancia++;
    });

    const desvGlobalKg = totalReal - totalTeorica;
    const desvGlobalPct = (desvGlobalKg / totalTeorica) * 100;

    return {
      count,
      totalReal,
      totalTeorica,
      fueraTolerancia,
      desvGlobalKg,
      desvGlobalPct
    };
  }, [deviationData]);

  // Paginación
  const totalPages = Math.ceil(deviationData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return deviationData.slice(start, start + pageSize);
  }, [deviationData, currentPage, pageSize]);

  // Configuración del gráfico de desviación
  const isLight = theme === 'light';
  const textColor = isLight ? '#1f2937' : '#e5e7eb';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
  const tooltipBg = isLight ? '#ffffff' : '#1f2937';
  const tooltipText = isLight ? '#1f2937' : '#d1d5db';
  const tooltipBorder = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

  const chartData = useMemo(() => {
    const labels = paginatedData.map(item => item.pozo);
    const realValues = paginatedData.map(item => item.cargaReal);
    const teoricaValues = paginatedData.map(item => item.cargaTeorica);

    return {
      labels,
      datasets: [
        {
          label: 'Carga Real (kg)',
          data: realValues,
          borderColor: '#10b981', // green
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          borderWidth: 2.5,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#10b981',
          tension: 0.3,
          fill: true
        },
        {
          label: 'Carga Teórica (kg)',
          data: teoricaValues,
          borderColor: '#3b82f6', // blue
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: '#3b82f6',
          tension: 0.3,
          fill: false
        }
      ]
    };
  }, [paginatedData]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: textColor,
          font: { family: 'Outfit', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        titleColor: textColor,
        bodyColor: tooltipText,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleFont: { family: 'Outfit', weight: 'bold' },
        bodyFont: { family: 'Outfit' }
      }
    },
    scales: {
      x: {
        grid: { color: gridColor },
        ticks: { color: isLight ? '#4b5563' : '#9ca3af', font: { family: 'Outfit', size: 9 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: isLight ? '#4b5563' : '#9ca3af', font: { family: 'Outfit', size: 9 } },
        title: { display: true, text: 'Kilogramos (kg)', color: isLight ? '#4b5563' : '#9ca3af', font: { family: 'Outfit', size: 10, weight: 'bold' } }
      }
    }
  }), [textColor, gridColor, tooltipBg, tooltipText, tooltipBorder, isLight]);

  if (deviationData.length === 0) {
    return (
      <section className="glass-panel no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚖️ Desviación de Carga Teórica vs Real
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          No hay datos suficientes para calcular la carga teórica. Asegúrate de que los pozos tengan ingresados Diámetro, Longitud Real, Taco, Carga de Fondo y un Tipo de Explosivo válido.
        </p>
      </section>
    );
  }

  return (
    <section className="glass-panel no-print" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          ⚖️ Desviación de Carga Teórica vs Real
        </h3>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.05)', padding: '0.35rem 0.6rem', borderRadius: '6px' }}>
          Fórmula: Altura Carga (Real - Taco) * 0.5067 * Diámetro² * Densidad
        </span>
      </div>

      {/* Tarjetas de Resumen de Desviaciones */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          
          <div className="kpi-card" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem 1.25rem', '--card-accent': 'var(--info)' }}>
            <div className="kpi-info">
              <span className="kpi-label" style={{ fontSize: '0.75rem' }}>Pozos Evaluados</span>
              <span className="kpi-value" style={{ fontSize: '1.35rem' }}>{stats.count} pozos</span>
              <span className="kpi-detail">Con datos de perforación y carga</span>
            </div>
          </div>

          <div className="kpi-card" style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem 1.25rem', '--card-accent': 'var(--primary)' }}>
            <div className="kpi-info">
              <span className="kpi-label" style={{ fontSize: '0.75rem' }}>Carga Real vs Teórica</span>
              <span className="kpi-value" style={{ fontSize: '1.35rem' }}>{stats.totalReal.toLocaleString('es-CL')} kg</span>
              <span className="kpi-detail">Teórica: {stats.totalTeorica.toLocaleString('es-CL')} kg</span>
            </div>
          </div>

          <div className="kpi-card" style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            padding: '1rem 1.25rem', 
            '--card-accent': Math.abs(stats.desvGlobalPct) > 5 ? 'var(--danger)' : 'var(--success)'
          }}>
            <div className="kpi-info">
              <span className="kpi-label" style={{ fontSize: '0.75rem' }}>Desviación Global</span>
              <span className="kpi-value" style={{ fontSize: '1.35rem' }}>
                {stats.desvGlobalKg > 0 ? '+' : ''}{stats.desvGlobalKg.toLocaleString('es-CL', { maximumFractionDigits: 1 })} kg
              </span>
              <span className="kpi-detail" style={{ color: Math.abs(stats.desvGlobalPct) > 5 ? 'var(--danger)' : 'var(--success)', fontWeight: 'bold' }}>
                {stats.desvGlobalPct > 0 ? '+' : ''}{stats.desvGlobalPct.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="kpi-card" style={{ 
            background: 'rgba(255, 255, 255, 0.02)', 
            padding: '1rem 1.25rem', 
            '--card-accent': stats.fueraTolerancia > 0 ? 'var(--warning)' : 'var(--success)'
          }}>
            <div className="kpi-info">
              <span className="kpi-label" style={{ fontSize: '0.75rem' }}>Fuera de Tolerancia</span>
              <span className="kpi-value" style={{ fontSize: '1.35rem', color: stats.fueraTolerancia > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {stats.fueraTolerancia} pozos
              </span>
              <span className="kpi-detail">
                {stats.fueraTolerancia > 0 ? 'Exceden el rango ±3% / ±5%' : 'Todos en rango óptimo'}
              </span>
            </div>
          </div>

        </div>
      )}

      {/* Tabla de Desviaciones */}
      <div className="table-wrapper" style={{ margin: 0, overflow: 'visible' }}>
        <table className="data-table deviation-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Pozo</th>
              <th>Polígono</th>
              <th>Diámetro</th>
              <th>Real (m)</th>
              <th>Taco (m)</th>
              <th>Altura Carga (m)</th>
              <th>Carga Real (kg)</th>
              <th>Carga Teórica (kg)</th>
              <th>Desviación (kg)</th>
              <th>Desviación (%)</th>
              <th>Tolerancia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((item, idx) => {
              const dInches = parseDiameterToInches(item.diametro);
              const subidaLineal = dInches > 0 && item.densidad > 0 
                ? (0.50671 * (dInches * dInches) * item.densidad) 
                : 0;

              return (
                <tr key={idx}>
                  <td 
                    className="pozo-cell-clickable" 
                    onClick={() => handleInspectPozo(item.pozo)}
                    title="Haz clic para inspeccionar la fila original en el Excel"
                    style={{ fontWeight: '700' }}
                  >
                    {item.pozo}
                  </td>
                  <td>
                    {item.poligono ? (
                      <span className="badge badge-info">{item.poligono}</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(vacío)</span>
                    )}
                  </td>
                  <td className="tooltip-container" style={{ fontWeight: '500' }}>
                    {item.diametro}
                    {subidaLineal > 0 && (
                      <span className="tooltip-text">{`Subida lineal ${subidaLineal.toFixed(1)} kg x mt`}</span>
                    )}
                  </td>
                <td>{item.longitudReal !== null ? `${item.longitudReal.toFixed(2)} m` : '-'}</td>
                <td>{item.taco !== null ? `${item.taco.toFixed(2)} m` : '-'}</td>
                <td>{item.alturaCarga.toFixed(2)} m</td>
                <td style={{ fontWeight: '600' }}>
                  {item.cargaReal.toLocaleString('es-CL')} kg
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', fontWeight: '400', marginTop: '0.1rem' }}>
                    {item.explosivo} ({item.densidad} g/cc)
                  </span>
                </td>
                <td>{item.cargaTeorica.toLocaleString('es-CL')} kg</td>
                <td style={{ color: item.desviacionKg > 0 ? 'var(--danger)' : 'var(--info)' }}>
                  {item.desviacionKg > 0 ? '+' : ''}{item.desviacionKg.toLocaleString('es-CL')} kg
                </td>
                <td style={{ color: item.isConforme ? 'var(--success)' : 'var(--danger)', fontWeight: '600' }}>
                  {item.desviacionPct > 0 ? '+' : ''}{item.desviacionPct.toFixed(1)}%
                </td>
                <td style={{ color: 'var(--text-secondary)' }}>±{item.tolerance}%</td>
                <td>
                  {item.isConforme ? (
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={10} /> Conforme
                    </span>
                  ) : (
                    <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <AlertTriangle size={10} /> Desviado
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="pagination" style={{ marginTop: '1rem' }}>
          <span>Página {currentPage} de {totalPages}</span>
          <div className="pagination-controls">
            <button 
              className="page-btn" 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={16} style={{ display: 'block' }} />
            </button>
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

      {/* Gráfico de Carga Real vs Teórica */}
      <div className="chart-card glass-panel" style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(255,255,255,0.01)' }}>
        <div className="chart-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <h3 className="chart-title" style={{ fontSize: '1.1rem', fontWeight: '700', margin: 0 }}>
            Comparación de Carga Real vs. Teórica (Página {currentPage} - {paginatedData.length} pozos)
          </h3>
        </div>
        <div className="chart-container" style={{ height: '300px', position: 'relative' }}>
          <Line 
            data={chartData} 
            options={chartOptions} 
          />
        </div>
      </div>

      {/* Modal Inspector de Fila Original desde Desviaciones */}
      {inspectingPozo && (
        <div className="modal-overlay no-print" onClick={() => setInspectingPozo(null)}>
          <div className="modal-content-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-bar">
              <div className="modal-header-title">
                <Scale size={18} style={{ color: 'var(--primary)' }} />
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
                Mostrando la fila tal como aparece en el archivo Excel original.
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
                      {Object.entries(inspectingPozo.row).map(([key, val]) => (
                        <td key={key}>
                          {val === null || val === undefined || String(val).trim() === '' ? (
                            <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>(vacío)</span>
                          ) : (
                            String(val)
                          )}
                        </td>
                      ))}
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

export default DeviationSection;
