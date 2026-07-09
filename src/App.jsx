import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  FileUp, 
  Trash2, 
  Filter, 
  Search, 
  AlertCircle, 
  HardDrive, 
  MapPin, 
  Calendar,
  Layers,
  Sun,
  Moon,
  FileText
} from 'lucide-react';
import DashboardOverview from './components/DashboardOverview';
import DataTable from './components/DataTable';
import AlertsSection from './components/AlertsSection';
import DeviationSection from './components/DeviationSection';
import { getRowAlerts } from './utils/getRowAlerts';

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [theme, setTheme] = useState('dark');

  const toggleTheme = () => {
    if (theme === 'dark') {
      setTheme('light');
      document.body.classList.add('light-theme');
    } else {
      setTheme('dark');
      document.body.classList.remove('light-theme');
    }
  };
  
  // Filters state
  const [filters, setFilters] = useState({
    fase: '',
    banco: '',
    poligono: '',
    diametro: '',
    search: '',
    fecha: '',
    tipoExplosivo: '',
  });

  const getPDFTitle = () => {
    if (!file || !file.name) return 'Resumen Vale';
    
    // Buscar patrón tipo V-12790 o V12790
    const matchV = file.name.match(/V-?\d+/i);
    if (matchV) {
      const numberPart = matchV[0].toUpperCase();
      const cleanNumber = numberPart.replace('V-', '').replace('V', '');
      return `Resumen Vale ${cleanNumber}`;
    }
    
    // Buscar cualquier secuencia de 4 o más dígitos (número de vale)
    const matchNum = file.name.match(/\d{4,}/);
    if (matchNum) {
      return `Resumen Vale ${matchNum[0]}`;
    }
    
    // Nombre limpio del archivo
    const cleanName = file.name.replace(/\.[^/.]+$/, "");
    return `Resumen ${cleanName}`;
  };

  const handlePrintPDF = () => {
    const originalTitle = document.title;
    document.title = getPDFTitle();
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 150);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = () => {
    setDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        parseExcel(droppedFile);
      } else {
        setError('Por favor, selecciona un archivo Excel válido (.xlsx o .xls).');
      }
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      parseExcel(files[0]);
    }
  };

  const parseExcel = (fileObject) => {
    setLoading(true);
    setError(null);
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const dataBytes = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataBytes, { type: 'array', cellDates: true });
        
        // Buscamos la pestaña 'Export' o usamos la primera hoja disponible
        const sheetName = workbook.SheetNames.includes('Export') 
          ? 'Export' 
          : workbook.SheetNames[0];
        
        const sheet = workbook.Sheets[sheetName];
        if (!sheet) {
          throw new Error('No se pudo encontrar ninguna hoja con datos.');
        }
        
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: null });
        if (jsonData.length === 0) {
          throw new Error('El archivo Excel está vacío.');
        }

        // Helper para convertir valores numéricos de forma segura
        const safeFloat = (val) => {
          if (val === null || val === undefined || val === '') return null;
          if (typeof val === 'number') return val;
          // Reemplazar comas si viene como string
          const parsed = parseFloat(String(val).replace(',', '.').trim());
          return isNaN(parsed) ? null : parsed;
        };

        const safeInt = (val) => {
          if (val === null || val === undefined || val === '') return null;
          if (typeof val === 'number') return Math.round(val);
          const parsed = parseInt(String(val).trim(), 10);
          return isNaN(parsed) ? null : parsed;
        };

        // Mapear cada fila a una clave uniforme
        const normalized = jsonData.map((row, index) => {
          return {
            id: row['.'] || row['ID'] || index + 1,
            fecha: row['Fecha Carguío Adelanto'] || null,
            fase: row['Fase'] !== null && row['Fase'] !== undefined ? String(row['Fase']).trim() : null,
            banco: row['Banco'] !== null && row['Banco'] !== undefined ? String(row['Banco']).trim() : null,
            pozo: row['N° Pozo'] !== null && row['N° Pozo'] !== undefined ? String(row['N° Pozo']).trim() : null,
            poligono: row['Polígono'] !== null && row['Polígono'] !== undefined ? String(row['Polígono']).trim() : '',
            diametro: row['Diametro'] !== null && row['Diametro'] !== undefined ? String(row['Diametro']).trim() : null,
            longitudDis: safeFloat(row['Longitud Dis. [m]']),
            longitudReal: safeFloat(row['Longitud Real [m]']),
            longitudSAcotar: safeFloat(row['Longitud S/Acotar [m]']),
            taco: safeFloat(row['Taco (m)']),
            agua: safeFloat(row['Agua (m)']),
            temperatura: row['Temperatura'] !== null && row['Temperatura'] !== undefined ? String(row['Temperatura']).trim() : null,
            nPrimas: safeInt(row['N° Primas']),
            idPrima: row['ID Prima'] !== null && row['ID Prima'] !== undefined ? String(row['ID Prima']).trim() : null,
            cargaFondo: safeFloat(row['Carga fondo']),
            tipoFondo: row['Tipo'] !== null && row['Tipo'] !== undefined ? String(row['Tipo']).trim() : null,
            camionFondo: row['Camion'] !== null && row['Camion'] !== undefined ? String(row['Camion']).trim() : null,
            cargaColumna: safeFloat(row['Carga columna']),
            tipoColumna: row['Tipo.'] !== null && row['Tipo.'] !== undefined ? String(row['Tipo.']).trim() : null,
            camionColumna: row['Camion.'] !== null && row['Camion.'] !== undefined ? String(row['Camion.']).trim() : null,
            operador: row['Operador'] !== null && row['Operador'] !== undefined ? String(row['Operador']).trim() : null,
            denInSitu: safeFloat(row['Den. in situ']),
            comentarios: row['Comentarios'] !== null && row['Comentarios'] !== undefined ? String(row['Comentarios']).trim() : null,
            fotos: row['Fotos'] !== null && row['Fotos'] !== undefined ? String(row['Fotos']).trim() : null,
          };
        });

        // Limpieza: filtrar filas que no tengan un pozo válido o estén vacías
        const cleanedData = normalized.filter(row => row.pozo !== null && row.pozo !== '');

        if (cleanedData.length === 0) {
          throw new Error('No se encontraron registros de pozos válidos con el número de pozo completo.');
        }

        setFile({
          name: fileObject.name,
          size: (fileObject.size / 1024).toFixed(1) + ' KB'
        });
        setData(cleanedData);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(`Error procesando archivo Excel. Detalle: ${err.message}`);
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError('Error al leer el archivo desde el disco.');
      setLoading(false);
    };

    reader.readAsArrayBuffer(fileObject);
  };

  const handleClear = () => {
    setFile(null);
    setData(null);
    setError(null);
    setFilters({
      fase: '',
      banco: '',
      poligono: '',
      diametro: '',
      search: '',
      fecha: '',
      tipoExplosivo: '',
    });
  };

  // Listas de filtros únicos calculados a partir de los datos originales
  const filterOptions = useMemo(() => {
    if (!data) return { fases: [], bancos: [], poligonos: [], diametros: [], tipos: [], fechas: [] };

    const fases = Array.from(new Set(data.map(r => r.fase).filter(Boolean))).sort();
    const bancos = Array.from(new Set(data.map(r => r.banco).filter(Boolean))).sort();
    const poligonos = Array.from(new Set(data.map(r => r.poligono).filter(Boolean))).sort();
    const diametros = Array.from(new Set(data.map(r => r.diametro).filter(Boolean))).sort();
    
    // Calcular tipos de explosivos únicos
    const tiposSet = new Set();
    data.forEach(r => {
      if (r.tipoFondo) tiposSet.add(r.tipoFondo);
      if (r.tipoColumna) tiposSet.add(r.tipoColumna);
    });
    const tipos = Array.from(tiposSet).sort();

    // Calcular fechas únicas en formato local YYYY-MM-DD
    const fechasSet = new Set();
    data.forEach(r => {
      if (r.fecha) {
        const dateObj = new Date(r.fecha);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        fechasSet.add(`${year}-${month}-${day}`);
      }
    });
    const fechas = Array.from(fechasSet).sort();

    return { fases, bancos, poligonos, diametros, tipos, fechas };
  }, [data]);

  // Auto-seleccionar tipo de explosivo y fecha si solo existe 1 opción disponible
  React.useEffect(() => {
    if (!data) return;
    
    setFilters(prev => {
      let updated = { ...prev };
      let changed = false;
      
      // Auto-seleccionar tipo de explosivo si hay exactamente 1
      if (filterOptions.tipos.length === 1) {
        if (prev.tipoExplosivo !== filterOptions.tipos[0]) {
          updated.tipoExplosivo = filterOptions.tipos[0];
          changed = true;
        }
      } else {
        if (prev.tipoExplosivo && !filterOptions.tipos.includes(prev.tipoExplosivo)) {
          updated.tipoExplosivo = '';
          changed = true;
        }
      }
      
      // Auto-seleccionar fecha si hay exactamente 1
      if (filterOptions.fechas.length === 1) {
        if (prev.fecha !== filterOptions.fechas[0]) {
          updated.fecha = filterOptions.fechas[0];
          changed = true;
        }
      } else {
        if (prev.fecha && !filterOptions.fechas.includes(prev.fecha)) {
          updated.fecha = '';
          changed = true;
        }
      }
      
      return changed ? updated : prev;
    });
  }, [data, filterOptions.tipos, filterOptions.fechas]);

  // Filtrado reactivo de los datos
  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter(row => {
      const matchesFase = !filters.fase || row.fase === filters.fase;
      const matchesBanco = !filters.banco || row.banco === filters.banco;
      const matchesPoligono = !filters.poligono || row.poligono === filters.poligono;
      const matchesDiametro = !filters.diametro || row.diametro === filters.diametro;
      
      const matchesSearch = !filters.search || 
        (row.pozo && row.pozo.toLowerCase().includes(filters.search.toLowerCase())) ||
        (row.operador && row.operador.toLowerCase().includes(filters.search.toLowerCase())) ||
        (row.comentarios && row.comentarios.toLowerCase().includes(filters.search.toLowerCase())) ||
        (row.camionFondo && row.camionFondo.toLowerCase().includes(filters.search.toLowerCase()));

      // Filtro de fecha única seleccionada
      let matchesFecha = true;
      if (filters.fecha) {
        if (!row.fecha) {
          matchesFecha = false;
        } else {
          const dateObj = new Date(row.fecha);
          const year = dateObj.getFullYear();
          const month = String(dateObj.getMonth() + 1).padStart(2, '0');
          const day = String(dateObj.getDate()).padStart(2, '0');
          const rowDateStr = `${year}-${month}-${day}`;
          if (rowDateStr !== filters.fecha) {
            matchesFecha = false;
          }
        }
      }

      // Filtro de tipo de explosivo
      const matchesTipo = !filters.tipoExplosivo || 
        row.tipoFondo === filters.tipoExplosivo || 
        row.tipoColumna === filters.tipoExplosivo;

      return matchesFase && matchesBanco && matchesPoligono && matchesDiametro && matchesSearch && matchesFecha && matchesTipo;
    });
  }, [data, filters]);

  // Fecha del reporte o datos
  const dateFormatted = useMemo(() => {
    if (!data || data.length === 0) return '';
    const dates = data.map(r => r.fecha).filter(Boolean);
    if (dates.length === 0) return '';
    
    // Si la fecha es de tipo Date de JS
    const parsedDates = dates.map(d => new Date(d)).filter(d => !isNaN(d.getTime()));
    if (parsedDates.length === 0) return '';
    
    const minDate = new Date(Math.min(...parsedDates));
    const maxDate = new Date(Math.max(...parsedDates));
    
    const format = (d) => d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    return minDate.getTime() === maxDate.getTime() 
      ? format(minDate) 
      : `${format(minDate)} - ${format(maxDate)}`;
  }, [data]);

  // Calcular resumen del explosivo seleccionado y sus kilos
  const activeExplosiveSummary = useMemo(() => {
    const type = filters.tipoExplosivo || 'Todos los Explosivos';
    let totalKg = 0;
    
    filteredData.forEach(row => {
      if (filters.tipoExplosivo) {
        if (row.tipoFondo === filters.tipoExplosivo && row.cargaFondo !== null) {
          totalKg += row.cargaFondo;
        }
        if (row.tipoColumna === filters.tipoExplosivo && row.cargaColumna !== null) {
          totalKg += row.cargaColumna;
        }
      } else {
        if (row.cargaFondo !== null) totalKg += row.cargaFondo;
        if (row.cargaColumna !== null) totalKg += row.cargaColumna;
      }
    });

    return { type, totalKg };
  }, [filteredData, filters.tipoExplosivo]);

  const formatDateString = (dateStr) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${day}-${month}-${year}`;
  };

  return (
    <div id="root">
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo-enaex.png" alt="Enaex" style={{ height: '36px', objectFit: 'contain' }} />
            <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }}></div>
            <div className="logo-title">
              <h1>Dashboard de Carguío</h1>
              <p>Control de Tronadura y Pozos</p>
            </div>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={toggleTheme} title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {data && (
              <>
                <button className="btn btn-primary" onClick={handlePrintPDF} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', padding: '0.5rem 1rem' }}>
                  <FileText size={15} /> Generar PDF
                </button>
                <button className="btn btn-secondary" onClick={handleClear}>
                  <Trash2 size={16} /> Limpiar Datos
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        {/* Error Alert */}
        {error && (
          <div className="file-info-bar" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <div className="file-info-details">
              <AlertCircle className="file-info-icon" style={{ color: 'var(--danger)' }} />
              <div>
                <span className="file-info-name" style={{ color: 'var(--danger)' }}>Error de Archivo</span>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Load Excel Section */}
        {!data && !loading && (
          <div 
            className={`upload-zone glass-panel ${dragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <FileUp className="upload-icon" />
            <h2 className="upload-title">Carga tu vale de carguío en formato Excel</h2>
            <p className="upload-subtitle">
              Arrastra y suelta tu archivo `.xlsx` aquí, o haz clic en el botón para explorarlo en tu computador.
            </p>
            <input 
              type="file" 
              id="excel-file" 
              className="file-input" 
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <label htmlFor="excel-file" className="btn">
              Seleccionar Archivo Excel
            </label>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="empty-state glass-panel" style={{ height: '350px' }}>
            <div className="upload-icon animate-pulse" style={{ animation: 'pulse 1.5s infinite' }}>⏳</div>
            <h2 className="empty-state-title">Procesando planilla Excel...</h2>
            <p className="empty-state-desc">Estamos extrayendo y estructurando los datos del carguío. Espera un momento.</p>
          </div>
        )}

        {/* Dashboard Workspace */}
        {data && (
          <>
            {/* File Info Bar */}
            <div className="file-info-bar glass-panel">
              <div className="file-info-details">
                <HardDrive className="file-info-icon" />
                <div>
                  <span className="file-info-name">{file?.name}</span>
                  <span className="file-info-size"> ({file?.size})</span>
                </div>
              </div>
              
              <div className="file-info-details" style={{ gap: '1.5rem' }}>
                {dateFormatted && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                    <Calendar size={14} className="text-secondary" />
                    <span>Fecha: <strong>{dateFormatted}</strong></span>
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.85rem' }}>
                  <Layers size={14} className="text-secondary" />
                  <span>Pozos totales en archivo: <strong>{data.length}</strong></span>
                </div>
              </div>
            </div>

            {/* Filters Bar */}
            <section className="filters-panel glass-panel no-print">
              <div className="filter-group search-group">
                <label className="filter-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Search size={12} /> Buscar
                </label>
                <input 
                  type="text" 
                  className="search-input" 
                  placeholder="Buscar por Pozo, Operador, Camión, Comentarios..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>

              {filterOptions.fases.length > 1 && (
                <div className="filter-group">
                  <label className="filter-label">Fase</label>
                  <select 
                    className="filter-select"
                    value={filters.fase}
                    onChange={(e) => setFilters(prev => ({ ...prev, fase: e.target.value }))}
                  >
                    <option value="">Todas las Fases</option>
                    {filterOptions.fases.map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOptions.bancos.length > 1 && (
                <div className="filter-group">
                  <label className="filter-label">Banco</label>
                  <select 
                    className="filter-select"
                    value={filters.banco}
                    onChange={(e) => setFilters(prev => ({ ...prev, banco: e.target.value }))}
                  >
                    <option value="">Todos los Bancos</option>
                    {filterOptions.bancos.map(b => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOptions.poligonos.length > 1 && (
                <div className="filter-group">
                  <label className="filter-label">Polígono</label>
                  <select 
                    className="filter-select"
                    value={filters.poligono}
                    onChange={(e) => setFilters(prev => ({ ...prev, poligono: e.target.value }))}
                  >
                    <option value="">Todos los Polígonos</option>
                    {filterOptions.poligonos.map(p => (
                      <option key={p} value={p}>{p || '(Sin Polígono)'}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOptions.diametros.length > 1 && (
                <div className="filter-group">
                  <label className="filter-label">Diámetro</label>
                  <select 
                    className="filter-select"
                    value={filters.diametro}
                    onChange={(e) => setFilters(prev => ({ ...prev, diametro: e.target.value }))}
                  >
                    <option value="">Todos los Diámetros</option>
                    {filterOptions.diametros.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOptions.fechas.length > 1 && (
                <div className="filter-group">
                  <label className="filter-label">Fecha</label>
                  <select 
                    className="filter-select"
                    value={filters.fecha}
                    onChange={(e) => setFilters(prev => ({ ...prev, fecha: e.target.value }))}
                  >
                    <option value="">Todas las Fechas</option>
                    {filterOptions.fechas.map(f => (
                      <option key={f} value={f}>{formatDateString(f)}</option>
                    ))}
                  </select>
                </div>
              )}

              {filterOptions.tipos.length > 0 && (
                <div className="filter-group">
                  <label className="filter-label">Tipo Explosivo</label>
                  <select 
                    className="filter-select"
                    value={filters.tipoExplosivo}
                    onChange={(e) => setFilters(prev => ({ ...prev, tipoExplosivo: e.target.value }))}
                  >
                    <option value="">Todos los Tipos</option>
                    {filterOptions.tipos.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            {/* Sección de Alertas de Calidad de Datos */}
            <AlertsSection filteredData={filteredData} />

            {/* Título de Selección de Explosivo y Kilos */}
            <div className="explosive-selection-banner glass-panel">
              <div className="explosive-banner-info">
                <h2>{activeExplosiveSummary.type}</h2>
                <p>Tipo de explosivo activo en el filtro</p>
              </div>
              <div className="explosive-banner-metric">
                <span className="explosive-banner-kg">
                  {activeExplosiveSummary.totalKg.toLocaleString('es-CL')}
                </span>
                <span className="explosive-banner-label">Kilos Cargados Totales</span>
              </div>
            </div>

            {/* Dashboard Visualizations */}
            <DashboardOverview filteredData={filteredData} rawData={data} theme={theme} />

            {/* Detailed Data Table */}
            <DataTable filteredData={filteredData} />
          </>
        )}
      </main>

      <footer className="app-footer no-print" style={{ 
        textAlign: 'center', 
        padding: '2rem 1.5rem', 
        marginTop: '3rem', 
        borderTop: '1px solid var(--border-color)', 
        color: 'var(--text-secondary)',
        fontSize: '0.85rem'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div>
            <strong>razecl web design Ⓡ</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span>Andres Alquinta Ayala</span>
            <a 
              href="https://wa.me/56966735408" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                color: 'inherit', 
                textDecoration: 'none',
                gap: '0.25rem',
                fontWeight: '600',
                transition: 'color var(--transition-fast)'
              }}
              className="whatsapp-link"
            >
              <svg 
                viewBox="0 0 24 24" 
                width="14" 
                height="14" 
                fill="currentColor" 
                style={{ color: '#25D366' }}
              >
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.457L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.37 9.864-9.799.002-2.63-1.023-5.101-2.885-6.97C16.388 1.968 13.916.94 11.287.94c-5.442 0-9.87 4.372-9.874 9.802-.001 1.962.515 3.878 1.494 5.582L1.848 22.24l6.096-1.597.003-.002zM17.653 14.512c-.322-.16-.1.9-.32-.239l-.482-.241c-.161-.08-.37-.033-.561.111l-.815.613c-.111.083-.243.109-.371.045-.371-.184-.799-.462-1.189-.851-.39-.39-.667-.818-.851-1.189-.064-.128-.038-.26.045-.371l.613-.815c.144-.191.191-.4.111-.561l-.241-.482c-.34-.68-.24-.1.9-.32-.239-.12-.26-.14-.401-.14h-.3c-.141 0-.323.052-.492.239-.168.188-.646.632-.646 1.541s.664 1.785.757 1.91c.092.126 1.308 1.999 3.169 2.802.443.192.788.306 1.058.393.445.142.85.122 1.171.074.357-.053 1.098-.449 1.253-.881.155-.432.155-.804.109-.881-.047-.078-.172-.124-.495-.285z"/>
              </svg>
              <span>+56 9 6673 5408</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
