import React, { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { 
  Compass, 
  Zap, 
  Flame, 
  TrendingUp, 
  Droplet,
  Grid,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import DeviationSection from './DeviationSection';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

function DashboardOverview({ filteredData, rawData, rawExcelRows, theme }) {
  // 1. Calculamos las métricas clave (KPIs)
  const stats = useMemo(() => {
    const totalPozos = filteredData.length;
    if (totalPozos === 0) {
      return {
        totalPozos: 0,
        totalMetersReal: 0,
        totalMetersDis: 0,
        avgMetersReal: 0,
        totalCarga: 0,
        avgTaco: 0,
        pozosConAgua: 0,
        pctAgua: 0,
        totalPrimas: 0,
        maxPozoNum: '-',
        maxPozoVal: 0,
        minPozoNum: '-',
        minPozoVal: 0,
        pozosSimples: 0,
        pozosDobles: 0,
        pozosTriples: 0,
        pozosCuadruples: 0
      };
    }

    let totalMetersReal = 0;
    let totalMetersDis = 0;
    let countReal = 0;
    
    let totalCarga = 0;
    let totalTaco = 0;
    let countTaco = 0;
    
    let pozosConAgua = 0;
    let totalPrimas = 0;

    let maxCharge = -1;
    let maxPozo = '-';
    let minCharge = Infinity;
    let minPozo = '-';

    let pozosSimples = 0;
    let pozosDobles = 0;
    let pozosTriples = 0;
    let pozosCuadruples = 0;

    filteredData.forEach(row => {
      if (row.longitudReal !== null) {
        totalMetersReal += row.longitudReal;
        countReal++;
      }
      if (row.longitudDis !== null) {
        totalMetersDis += row.longitudDis;
      }
      
      let rowCarga = 0;
      if (row.cargaFondo !== null) {
        totalCarga += row.cargaFondo;
        rowCarga += row.cargaFondo;
      }
      if (row.cargaColumna !== null) {
        totalCarga += row.cargaColumna;
        rowCarga += row.cargaColumna;
      }

      // Encontrar pozo con mayor carga
      if (rowCarga > maxCharge) {
        maxCharge = rowCarga;
        maxPozo = row.pozo || '-';
      }

      // Encontrar pozo con menor carga (mayor a 0)
      if (rowCarga > 0 && rowCarga < minCharge) {
        minCharge = rowCarga;
        minPozo = row.pozo || '-';
      }

      if (row.taco !== null) {
        totalTaco += row.taco;
        countTaco++;
      }
      if (row.agua !== null && row.agua > 0) {
        pozosConAgua++;
      }
      if (row.nPrimas !== null) {
        totalPrimas += row.nPrimas;
        
        // Contar tipos de pozos según cantidad de primas
        if (row.nPrimas === 1) pozosSimples++;
        else if (row.nPrimas === 2) pozosDobles++;
        else if (row.nPrimas === 3) pozosTriples++;
        else if (row.nPrimas === 4) pozosCuadruples++;
      }
    });

    const avgMetersReal = countReal > 0 ? totalMetersReal / countReal : 0;
    const avgTaco = countTaco > 0 ? totalTaco / countTaco : 0;
    const pctAgua = totalPozos > 0 ? (pozosConAgua / totalPozos) * 100 : 0;

    const finalMinCharge = minCharge === Infinity ? 0 : minCharge;
    const finalMinPozo = minCharge === Infinity ? '-' : minPozo;
    const finalMaxCharge = maxCharge === -1 ? 0 : maxCharge;
    const finalMaxPozo = maxCharge === -1 ? '-' : maxPozo;

    return {
      totalPozos,
      totalMetersReal,
      totalMetersDis,
      avgMetersReal,
      totalCarga,
      avgTaco,
      pozosConAgua,
      pctAgua,
      totalPrimas,
      maxPozoNum: finalMaxPozo,
      maxPozoVal: finalMaxCharge,
      minPozoNum: finalMinPozo,
      minPozoVal: finalMinCharge,
      pozosSimples,
      pozosDobles,
      pozosTriples,
      pozosCuadruples
    };
  }, [filteredData]);

  // Resumen de Camiones
  const truckSummary = useMemo(() => {
    const summaryMap = {};

    filteredData.forEach(row => {
      const processTruck = (truckId, explosiveType, kilos) => {
        if (!truckId) return;
        
        const key = `${truckId}_${explosiveType || 'Sin Registro'}`;
        if (!summaryMap[key]) {
          summaryMap[key] = {
            camion: truckId,
            tipoExplosivo: explosiveType || 'Sin Registro',
            kilos: 0,
            pozosSet: new Set(),
            pozosDobles: 0,
            pozosTriples: 0,
            pozosCuadruples: 0,
            pozosConAgua: 0
          };
        }
        
        const item = summaryMap[key];
        item.kilos += kilos || 0;
        
        if (!item.pozosSet.has(row.pozo)) {
          item.pozosSet.add(row.pozo);
          if (row.nPrimas === 2) item.pozosDobles++;
          else if (row.nPrimas === 3) item.pozosTriples++;
          else if (row.nPrimas === 4) item.pozosCuadruples++;
          
          if (row.agua !== null && row.agua > 0) {
            item.pozosConAgua++;
          }
        }
      };

      if (row.camionFondo) {
        processTruck(row.camionFondo, row.tipoFondo, row.cargaFondo || 0);
      }
      if (row.camionColumna) {
        processTruck(row.camionColumna, row.tipoColumna, row.cargaColumna || 0);
      }
    });

    return Object.values(summaryMap).map(item => ({
      ...item,
      totalPozos: item.pozosSet.size
    })).sort((a, b) => a.camion.localeCompare(b.camion));
  }, [filteredData]);

  // 2. Gráfico 1: Carga de explosivos (Fondo + Columna) por Polígono
  const explosivesByPoligonoChart = useMemo(() => {
    const dataMap = {};
    filteredData.forEach(row => {
      const p = row.poligono || '(Sin Polígono)';
      const val = (row.cargaFondo || 0) + (row.cargaColumna || 0);
      dataMap[p] = (dataMap[p] || 0) + val;
    });

    const labels = Object.keys(dataMap).sort();
    // Convertir de kg a Toneladas
    const values = labels.map(l => (dataMap[l] / 1000).toFixed(2));

    return {
      labels,
      datasets: [
        {
          label: 'Explosivo Total (Toneladas)',
          data: values,
          backgroundColor: 'rgba(0, 210, 255, 0.4)',
          borderColor: '#00d2ff',
          borderWidth: 2,
          borderRadius: 6,
          hoverBackgroundColor: 'rgba(0, 210, 255, 0.7)',
        }
      ]
    };
  }, [filteredData]);

  // 3. Gráfico 2: Longitud Diseñada vs Real (Pozos)
  const lengthComparisonChart = useMemo(() => {
    // Si hay demasiados pozos, tomamos una muestra o los ordenamos para no colapsar el gráfico.
    // Mostramos hasta los primeros 50 pozos ordenados por pozo
    const sortedSample = [...filteredData]
      .filter(row => row.longitudReal !== null || row.longitudDis !== null)
      .slice(0, 50);

    const labels = sortedSample.map(row => `P-${row.pozo}`);
    const realData = sortedSample.map(row => row.longitudReal);
    const disData = sortedSample.map(row => row.longitudDis);

    return {
      labels,
      datasets: [
        {
          label: 'Longitud Real (m)',
          data: realData,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.2
        },
        {
          label: 'Longitud Dis. (m)',
          data: disData,
          borderColor: '#3b82f6',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 2,
          pointHoverRadius: 4,
          tension: 0.1
        }
      ]
    };
  }, [filteredData]);

  // 4. Gráfico 3: Distribución de Diámetros
  const diameterChart = useMemo(() => {
    const dataMap = {};
    filteredData.forEach(row => {
      const d = row.diametro || 'N/A';
      dataMap[d] = (dataMap[d] || 0) + 1;
    });

    const labels = Object.keys(dataMap);
    const values = labels.map(l => dataMap[l]);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            'rgba(0, 210, 255, 0.6)',
            'rgba(16, 185, 129, 0.6)',
            'rgba(245, 158, 11, 0.6)',
            'rgba(239, 68, 68, 0.6)',
            'rgba(59, 130, 246, 0.6)',
            'rgba(139, 92, 246, 0.6)'
          ],
          borderColor: '#111827',
          borderWidth: 2,
        }
      ]
    };
  }, [filteredData]);

  // 5. Gráfico 4: Distribución de explosivo por camión
  const trucksChart = useMemo(() => {
    const dataMap = {};
    filteredData.forEach(row => {
      // Combinar los camiones del pozo
      const trucks = new Set();
      if (row.camionFondo) trucks.add(row.camionFondo);
      if (row.camionColumna) trucks.add(row.camionColumna);
      
      const totalExplosivo = (row.cargaFondo || 0) + (row.cargaColumna || 0);
      
      if (trucks.size > 0) {
        trucks.forEach(t => {
          dataMap[t] = (dataMap[t] || 0) + (totalExplosivo / trucks.size); // Prorrateado
        });
      } else {
        dataMap['Sin Registro'] = (dataMap['Sin Registro'] || 0) + totalExplosivo;
      }
    });

    const labels = Object.keys(dataMap).sort();
    const values = labels.map(l => (dataMap[l] / 1000).toFixed(2)); // En Toneladas

    return {
      labels,
      datasets: [
        {
          label: 'Explosivo Prorrateado (Tns)',
          data: values,
          backgroundColor: 'rgba(245, 158, 11, 0.5)',
          borderColor: '#f59e0b',
          borderWidth: 1.5,
          borderRadius: 4,
          hoverBackgroundColor: 'rgba(245, 158, 11, 0.8)',
        }
      ]
    };
  }, [filteredData]);

  // Opciones de configuración de gráficos reactivos al tema
  const isLight = theme === 'light';
  const textColor = isLight ? '#1f2937' : '#e5e7eb';
  const gridColor = isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(255, 255, 255, 0.04)';
  const tooltipBg = isLight ? '#ffffff' : '#1f2937';
  const tooltipText = isLight ? '#1f2937' : '#d1d5db';
  const tooltipBorder = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

  const chartOptions = {
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
        ticks: { color: isLight ? '#4b5563' : '#9ca3af', font: { family: 'Outfit', size: 10 } }
      },
      y: {
        grid: { color: gridColor },
        ticks: { color: isLight ? '#4b5563' : '#9ca3af', font: { family: 'Outfit', size: 10 } }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: textColor,
          font: { family: 'Outfit', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: tooltipBg,
        bodyColor: tooltipText,
        borderColor: tooltipBorder,
        borderWidth: 1,
        titleFont: { family: 'Outfit' },
        bodyFont: { family: 'Outfit' }
      }
    }
  };

  if (filteredData.length === 0) {
    return (
      <div className="empty-state glass-panel" style={{ height: '300px', marginBottom: '2rem' }}>
        <div className="empty-state-icon">🔍</div>
        <h2 className="empty-state-title">Sin resultados coincidentes</h2>
        <p className="empty-state-desc">Intenta flexibilizar los filtros de búsqueda o restablecerlos para ver los gráficos del dashboard.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* KPIs Grid */}
      <section className="dashboard-grid">
        
        {/* KPI 1: Pozos Filtrados */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': 'var(--primary)', '--card-accent-glow': 'var(--primary-glow)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Pozos Filtrados</span>
            <span className="kpi-value">{stats.totalPozos}</span>
            <span className="kpi-detail">De un total de {rawData.length}</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Compass size={24} />
          </div>
        </div>

        {/* KPI 2: Presencia de Agua */}
        <div className="kpi-card glass-panel" style={{ 
          '--card-accent': stats.pctAgua > 30 ? 'var(--danger)' : stats.pctAgua > 10 ? 'var(--warning)' : 'var(--info)', 
          '--card-accent-glow': stats.pctAgua > 30 ? 'var(--danger-glow)' : stats.pctAgua > 10 ? 'var(--warning-glow)' : 'rgba(59, 130, 246, 0.15)' 
        }}>
          <div className="kpi-info">
            <span className="kpi-label">Presencia de Agua</span>
            <span className="kpi-value">{stats.pctAgua.toFixed(1)}%</span>
            <span className="kpi-detail">{stats.pozosConAgua} pozos con agua</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Droplet size={24} />
          </div>
        </div>

        {/* KPI 3: Taco Promedio */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#8b5cf6', '--card-accent-glow': 'rgba(139, 92, 246, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Taco Promedio</span>
            <span className="kpi-value">{stats.avgTaco.toFixed(2)} m</span>
            <span className="kpi-detail">Stemming de confinamiento</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Grid size={24} />
          </div>
        </div>

        {/* KPI 4: Pozo Mayor Carga */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#f59e0b', '--card-accent-glow': 'rgba(245, 158, 11, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Pozo Mayor Carga</span>
            <span className="kpi-value">{stats.maxPozoVal.toLocaleString('es-CL')} kg</span>
            <span className="kpi-detail">ID del Pozo: <strong>{stats.maxPozoNum}</strong></span>
          </div>
          <div className="kpi-icon-wrapper" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)' }}>
            <ArrowUp size={24} />
          </div>
        </div>

        {/* KPI 5: Pozo Menor Carga */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#10b981', '--card-accent-glow': 'rgba(16, 185, 129, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Pozo Menor Carga</span>
            <span className="kpi-value">{stats.minPozoVal.toLocaleString('es-CL')} kg</span>
            <span className="kpi-detail">ID del Pozo: <strong>{stats.minPozoNum}</strong></span>
          </div>
          <div className="kpi-icon-wrapper" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.15)' }}>
            <ArrowDown size={24} />
          </div>
        </div>

        {/* KPI 6: Primas Totales */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#ec4899', '--card-accent-glow': 'rgba(236, 72, 153, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Primas Totales</span>
            <span className="kpi-value">{stats.totalPrimas} un</span>
            <span className="kpi-detail">Boosters de iniciación cargados</span>
          </div>
          <div className="kpi-icon-wrapper">
            <Zap size={24} />
          </div>
        </div>

        {/* KPI 7: Pozos Simples */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#3b82f6', '--card-accent-glow': 'rgba(59, 130, 246, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Pozos Simples</span>
            <span className="kpi-value">{stats.pozosSimples}</span>
            <span className="kpi-detail">Pozos con 1 Prima</span>
          </div>
          <div className="kpi-icon-wrapper" style={{ fontSize: '1.15rem', fontWeight: '800', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            1P
          </div>
        </div>

        {/* KPI 8: Pozos Dobles */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#06b6d4', '--card-accent-glow': 'rgba(6, 182, 212, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Pozos Dobles</span>
            <span className="kpi-value">{stats.pozosDobles}</span>
            <span className="kpi-detail">Pozos con 2 Primas</span>
          </div>
          <div className="kpi-icon-wrapper" style={{ fontSize: '1.15rem', fontWeight: '800', background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            2P
          </div>
        </div>

        {/* KPI 9: Pozos Triples */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#a855f7', '--card-accent-glow': 'rgba(168, 85, 247, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Pozos Triples</span>
            <span className="kpi-value">{stats.pozosTriples}</span>
            <span className="kpi-detail">Pozos con 3 Primas</span>
          </div>
          <div className="kpi-icon-wrapper" style={{ fontSize: '1.15rem', fontWeight: '800', background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            3P
          </div>
        </div>

        {/* KPI 10: Pozos Cuádruples */}
        <div className="kpi-card glass-panel" style={{ '--card-accent': '#f43f5e', '--card-accent-glow': 'rgba(244, 63, 94, 0.15)' }}>
          <div className="kpi-info">
            <span className="kpi-label">Pozos Cuádruples</span>
            <span className="kpi-value">{stats.pozosCuadruples}</span>
            <span className="kpi-detail">Pozos con 4 Primas</span>
          </div>
          <div className="kpi-icon-wrapper" style={{ fontSize: '1.15rem', fontWeight: '800', background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', borderRadius: '8px', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            4P
          </div>
        </div>

      </section>

      {/* Sección Resumen de Camiones */}
      <section className="glass-panel trucks-summary-panel" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🚚 Resumen de Carguío por Camión
        </h3>
        
        {truckSummary.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', fontSize: '0.9rem' }}>No hay registros de camiones para mostrar.</p>
        ) : (
          <div className="table-wrapper" style={{ margin: 0 }}>
            <table className="data-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>ID Camión</th>
                  <th>Tipo Explosivo</th>
                  <th>Kilos Cargados</th>
                  <th>Total Pozos</th>
                  <th>Pozos Dobles (2P)</th>
                  <th>Pozos Triples (3P)</th>
                  <th>Pozos Cuádruples (4P)</th>
                  <th>Pozos con Agua</th>
                </tr>
              </thead>
              <tbody>
                {truckSummary.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: '700', color: 'var(--primary)' }}>{item.camion}</td>
                    <td>{item.tipoExplosivo}</td>
                    <td style={{ fontWeight: '600' }}>{item.kilos.toLocaleString('es-CL')} kg</td>
                    <td>{item.totalPozos}</td>
                    <td>{item.pozosDobles || '-'}</td>
                    <td>{item.pozosTriples || '-'}</td>
                    <td>{item.pozosCuadruples || '-'}</td>
                    <td style={{ color: item.pozosConAgua > 0 ? 'var(--primary)' : 'var(--text-muted)' }}>
                      {item.pozosConAgua > 0 ? `💦 ${item.pozosConAgua}` : 'Secos'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Sección Desviación de Carga Teórica vs Real */}
      <DeviationSection filteredData={filteredData} rawExcelRows={rawExcelRows} theme={theme} />

      {/* Charts Grid */}
      <section className="charts-grid">
        
        {/* Chart 1: Explosivos por Polígono */}
        <div className="chart-card glass-panel">
          <div className="chart-header">
            <h3 className="chart-title">Explosivo Cargado por Polígono</h3>
          </div>
          <div className="chart-container">
            <Bar 
              data={explosivesByPoligonoChart} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: { display: false }
                }
              }} 
            />
          </div>
        </div>

        {/* Chart 2: Muestra de Pozos Real vs Diseñado */}
        <div className="chart-card glass-panel">
          <div className="chart-header">
            <h3 className="chart-title">Longitud Real vs. Diseñada (Muestra primeros 50 pozos)</h3>
          </div>
          <div className="chart-container">
            <Line 
              data={lengthComparisonChart} 
              options={{
                ...chartOptions,
                scales: {
                  ...chartOptions.scales,
                  y: {
                    ...chartOptions.scales.y,
                    title: { display: true, text: 'Metros', color: '#9ca3af' }
                  }
                }
              }} 
            />
          </div>
        </div>

        {/* Chart 3: Proporción de Diámetros */}
        <div className="chart-card glass-panel">
          <div className="chart-header">
            <h3 className="chart-title">Distribución de Diámetros de Pozos</h3>
          </div>
          <div className="chart-container">
            <Doughnut 
              data={diameterChart} 
              options={doughnutOptions} 
            />
          </div>
        </div>

        {/* Chart 4: Explosivo Cargado por Camión */}
        <div className="chart-card glass-panel">
          <div className="chart-header">
            <h3 className="chart-title">Carga de Explosivo por Camión (Tns)</h3>
          </div>
          <div className="chart-container">
            <Bar 
              data={trucksChart} 
              options={{
                ...chartOptions,
                indexAxis: 'y', // Gráfico de barras horizontales
                plugins: {
                  ...chartOptions.plugins,
                  legend: { display: false }
                }
              }} 
            />
          </div>
        </div>

      </section>
    </div>
  );
}

export default DashboardOverview;
