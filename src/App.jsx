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
  FileText,
  Printer
} from 'lucide-react';
import DashboardOverview from './components/DashboardOverview';
import DataTable from './components/DataTable';
import AlertsSection from './components/AlertsSection';
import DeviationSection from './components/DeviationSection';
import ValeConsumoSection from './components/ValeConsumoSection';
import { getRowAlerts } from './utils/getRowAlerts';

function App() {
  const [file, setFile] = useState(null);
  const [data, setData] = useState(null);
  const [rawExcelRows, setRawExcelRows] = useState([]);
  const [fileUrl, setFileUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'vale'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [draggingType, setDraggingType] = useState(null); // null, 'datawall', 'final_review'
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  React.useEffect(() => {
    if (theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  }, [theme]);
  
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

  const handlePrintRawExcel = () => {
    if (!rawExcelRows || rawExcelRows.length === 0) return;
    
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.classList.add('printing-raw-excel');
    }
    
    const style = document.createElement('style');
    style.id = 'raw-excel-print-style';
    style.innerHTML = `
      @media print {
        @page {
          size: letter landscape !important;
          margin: 0.25in !important;
        }
        #root.printing-raw-excel .app-header,
        #root.printing-raw-excel .container,
        #root.printing-raw-excel .app-footer,
        #root.printing-raw-excel .no-print,
        #root.printing-raw-excel .whatsapp-float {
          display: none !important;
        }
        body, html, #root.printing-raw-excel {
          background: #ffffff !important;
          color: #000000 !important;
          margin: 0 !important;
          padding: 0 !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }
        #root.printing-raw-excel .raw-excel-print-wrapper {
          display: block !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .raw-excel-print-title {
          font-family: 'Outfit', sans-serif !important;
          font-size: 11pt !important;
          font-weight: 700 !important;
          margin-bottom: 0.5rem !important;
          color: #1e3a8a !important;
          border-bottom: 1.5px solid #1e3a8a !important;
          padding-bottom: 0.2rem !important;
        }
        .raw-excel-print-table {
          width: 100% !important;
          border-collapse: collapse !important;
          table-layout: auto !important;
        }
        .raw-excel-print-table th {
          background: #f1f5f9 !important;
          color: #1e293b !important;
          font-family: 'Outfit', sans-serif !important;
          font-size: 5.5pt !important;
          font-weight: 700 !important;
          padding: 3px 1.5px !important;
          border: 0.5px solid #94a3b8 !important;
          text-align: center !important;
          white-space: normal !important;
          word-break: break-word !important;
        }
        .raw-excel-print-table td {
          font-family: 'Outfit', sans-serif !important;
          font-size: 5.5pt !important;
          padding: 3px 1.5px !important;
          border: 0.5px solid #cbd5e1 !important;
          text-align: center !important;
          white-space: normal !important;
          word-break: break-word !important;
          color: #334155 !important;
        }
      }
    `;
    document.head.appendChild(style);
    
    const originalTitle = document.title;
    document.title = `Planilla_Original_${file?.name ? file.name.replace(/\.[^/.]+$/, "") : 'Excel'}`;

    setTimeout(() => {
      window.print();
      if (rootEl) {
        rootEl.classList.remove('printing-raw-excel');
      }
      document.title = originalTitle;
      const styleEl = document.getElementById('raw-excel-print-style');
      if (styleEl) styleEl.remove();
    }, 80);
  };

  const handleDragOver = (e, type) => {
    e.preventDefault();
    setDraggingType(type);
  };

  const handleDragLeave = () => {
    setDraggingType(null);
  };

  const handleDrop = (e, type) => {
    e.preventDefault();
    setDraggingType(null);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      if (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls')) {
        parseExcel(droppedFile, type);
      } else {
        setError('Por favor, selecciona un archivo Excel válido (.xlsx o .xls).');
      }
    }
  };

  const handleFileChange = (e, type) => {
    const files = e.target.files;
    if (files.length > 0) {
      parseExcel(files[0], type);
    }
  };

  const parseExcel = (fileObject, type) => {
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

        // Validación de formato cruzado
        const firstRowKeys = Object.keys(jsonData[0] || {});
        const hasDatawallIndicator = firstRowKeys.some(k => k === 'Carga fondo' || k === 'Carga columna' || k === 'ID Prima' || k === 'Polígono');
        const hasFinalReviewIndicator = firstRowKeys.some(k => k === 'Carga total (kg)' || k === 'Carga fondo (kg)' || k === 'Malla');

        if (type === 'datawall' && hasFinalReviewIndicator) {
          throw new Error('Formato Incorrecto: Has intentado cargar una planilla de "Final Review" en la sección de "DataWall". Por favor, cárgala en el lado derecho.');
        }
        if (type === 'final_review' && hasDatawallIndicator) {
          throw new Error('Formato Incorrecto: Has intentado cargar una planilla de "DataWall" en la sección de "Final Review". Por favor, cárgala en el lado izquierdo.');
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
          if (type === 'final_review') {
            const cFondo = safeFloat(row['Carga fondo (kg)']);
            const cColumna = safeFloat(row['Carga columna (kg)']);
            const cTotal = row['Carga total (kg)'] !== null && row['Carga total (kg)'] !== undefined 
              ? safeFloat(row['Carga total (kg)']) 
              : ((cFondo || 0) + (cColumna || 0));

            return {
              id: row['#'] || index + 1,
              fecha: row['Fecha'] || null,
              fase: row['Fase'] !== null && row['Fase'] !== undefined ? String(row['Fase']).trim() : null,
              banco: row['Banco'] !== null && row['Banco'] !== undefined ? String(row['Banco']).trim() : null,
              pozo: row['N° Pozo'] !== null && row['N° Pozo'] !== undefined ? String(row['N° Pozo']).trim() : null,
              poligono: row['Malla'] !== null && row['Malla'] !== undefined ? String(row['Malla']).trim() : '',
              diametro: row['Diámetro'] !== null && row['Diámetro'] !== undefined ? String(row['Diámetro']).trim() : null,
              longitudDis: safeFloat(row['Long. D (m)']),
              longitudReal: safeFloat(row['Long. R (m)']),
              longitudSAcotar: safeFloat(row['Long. S/Acotar (m)']),
              taco: safeFloat(row['Taco (m)']),
              agua: safeFloat(row['Agua (m)']),
              temperatura: row['Temp.'] !== null && row['Temp.'] !== undefined ? String(row['Temp.']).trim() : null,
              nPrimas: safeInt(row['N° primas']),
              idPrima: null, // No existe en Final Review
              cargaFondo: cFondo,
              tipoFondo: row['Tipo Fondo'] !== null && row['Tipo Fondo'] !== undefined ? String(row['Tipo Fondo']).trim() : null,
              camionFondo: row['Camión Fondo'] !== null && row['Camión Fondo'] !== undefined ? String(row['Camión Fondo']).trim() : null,
              cargaColumna: cColumna,
              tipoColumna: row['Tipo Columna'] !== null && row['Tipo Columna'] !== undefined ? String(row['Tipo Columna']).trim() : null,
              camionColumna: row['Camión Columna'] !== null && row['Camión Columna'] !== undefined ? String(row['Camión Columna']).trim() : null,
              operador: row['Operador'] !== null && row['Operador'] !== undefined ? String(row['Operador']).trim() : null,
              denInSitu: safeFloat(row['Den. in situ']),
              comentarios: row['Comentarios'] !== null && row['Comentarios'] !== undefined ? String(row['Comentarios']).trim() : null,
              fotos: null, // No existe en Final Review
              cargaTotal: cTotal,
            };
          } else {
            // DataWall parsing (default)
            const cFondo = safeFloat(row['Carga fondo']);
            const cColumna = safeFloat(row['Carga columna']);
            const cTotal = (cFondo || 0) + (cColumna || 0);

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
              cargaFondo: cFondo,
              tipoFondo: row['Tipo'] !== null && row['Tipo'] !== undefined ? String(row['Tipo']).trim() : null,
              camionFondo: row['Camion'] !== null && row['Camion'] !== undefined ? String(row['Camion']).trim() : null,
              cargaColumna: cColumna,
              tipoColumna: row['Tipo.'] !== null && row['Tipo.'] !== undefined ? String(row['Tipo.']).trim() : null,
              camionColumna: row['Camion.'] !== null && row['Camion.'] !== undefined ? String(row['Camion.']).trim() : null,
              operador: row['Operador'] !== null && row['Operador'] !== undefined ? String(row['Operador']).trim() : null,
              denInSitu: safeFloat(row['Den. in situ']),
              comentarios: row['Comentarios'] !== null && row['Comentarios'] !== undefined ? String(row['Comentarios']).trim() : null,
              fotos: row['Fotos'] !== null && row['Fotos'] !== undefined ? String(row['Fotos']).trim() : null,
              cargaTotal: cTotal,
            };
          }
        });

        // Limpieza: filtrar filas que no tengan un pozo válido o estén vacías
        const cleanedData = normalized.filter(row => row.pozo !== null && row.pozo !== '');

        if (cleanedData.length === 0) {
          throw new Error('No se encontraron registros de pozos válidos con el número de pozo completo.');
        }

        const url = URL.createObjectURL(fileObject);
        setFileUrl(url);

        setFile({
          name: fileObject.name,
          size: (fileObject.size / 1024).toFixed(1) + ' KB'
        });
        setRawExcelRows(jsonData);
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
    if (fileUrl) {
      URL.revokeObjectURL(fileUrl);
      setFileUrl(null);
    }
    setFile(null);
    setData(null);
    setRawExcelRows([]);
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
    <div className={`tab-${activeTab}`}>
      <header className="app-header">
        <div className="header-content">
          <div className="logo-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src="/logo-enaex-white.png" alt="Enaex" className="logo-banner-screen" style={{ height: '36px', objectFit: 'contain' }} />
            <img src="/logo-enaex-dark.png" alt="Enaex" className="logo-banner-print" style={{ height: '36px', objectFit: 'contain' }} />
            <div style={{ width: '1px', height: '28px', background: 'var(--border-color)' }}></div>
            <div className="logo-title">
              <h1>Dashboard de Carguío</h1>
              <p>Control de Tronadura y Pozos</p>
            </div>
          </div>

          {/* Segmented control for Tab Navigation (only visible when data is loaded) */}
          {data && (
            <div className="no-print header-navigation" style={{ 
              display: 'flex', 
              background: 'rgba(255, 255, 255, 0.05)', 
              border: '1px solid rgba(255, 255, 255, 0.08)', 
              borderRadius: '8px', 
              padding: '3px',
              gap: '2px'
            }}>
              <button 
                onClick={() => setActiveTab('dashboard')}
                style={{
                  height: '32px',
                  padding: '0 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  border: 'none',
                  background: activeTab === 'dashboard' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: activeTab === 'dashboard' ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'dashboard') {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'dashboard') {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                Dashboard de Carguío
              </button>
              <button 
                onClick={() => setActiveTab('vale')}
                style={{
                  height: '32px',
                  padding: '0 1.25rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  border: 'none',
                  background: activeTab === 'vale' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                  color: activeTab === 'vale' ? '#ffffff' : 'rgba(255, 255, 255, 0.65)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== 'vale') {
                    e.currentTarget.style.color = '#ffffff';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== 'vale') {
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.65)';
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                Vale de Consumo
              </button>
            </div>
          )}

          <div className="no-print" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {data && (
              <>
                <button 
                  className="btn" 
                  onClick={handleClear}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    padding: '0 1rem',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#d92d20',
                    border: '1px solid #d92d20',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#b42318';
                    e.currentTarget.style.borderColor = '#b42318';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#d92d20';
                    e.currentTarget.style.borderColor = '#d92d20';
                  }}
                >
                  <Trash2 size={15} /> Limpiar Datos
                </button>

                <button 
                  className="btn" 
                  onClick={handlePrintPDF} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '0.5rem', 
                    fontSize: '0.85rem', 
                    fontWeight: '600',
                    padding: '0 1rem',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#7f56d9',
                    border: '1px solid #7f56d9',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#6941c6';
                    e.currentTarget.style.borderColor = '#6941c6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#7f56d9';
                    e.currentTarget.style.borderColor = '#7f56d9';
                  }}
                >
                  <FileText size={15} /> Generar PDF
                </button>

                <button 
                  className="btn" 
                  onClick={handlePrintRawExcel} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    gap: '0.5rem', 
                    fontSize: '0.85rem', 
                    fontWeight: '600',
                    padding: '0 1rem',
                    height: '38px',
                    borderRadius: '8px',
                    background: '#7f56d9',
                    border: '1px solid #7f56d9',
                    color: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: '0 1px 2px rgba(16, 24, 40, 0.05)'
                  }}
                  title="Genera un PDF con la planilla original completa en orientación horizontal (Carta)"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#6941c6';
                    e.currentTarget.style.borderColor = '#6941c6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#7f56d9';
                    e.currentTarget.style.borderColor = '#7f56d9';
                  }}
                >
                  <Printer size={15} /> Imprimir Planilla
                </button>
              </>
            )}
            <button className="btn btn-secondary" style={{ padding: '0.5rem', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={toggleTheme} title={`Cambiar a modo ${theme === 'dark' ? 'claro' : 'oscuro'}`}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
            {/* Card 1: DataWall */}
            <div 
              className={`upload-zone glass-panel ${draggingType === 'datawall' ? 'dragging' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'datawall')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'datawall')}
              style={{ minHeight: '320px', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <FileUp className="upload-icon" style={{ color: 'var(--primary)' }} />
              <h2 className="upload-title" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Planilla DataWall</h2>
              <p className="upload-subtitle" style={{ fontSize: '0.8rem', minHeight: '4rem', margin: '0.5rem 0 1.5rem 0' }}>
                Arrastra tu planilla <strong>DataWall</strong> aquí, o haz clic para seleccionarla.
              </p>
              <input 
                type="file" 
                id="excel-file-datawall" 
                className="file-input" 
                accept=".xlsx, .xls"
                onChange={(e) => handleFileChange(e, 'datawall')}
              />
              <label htmlFor="excel-file-datawall" className="btn btn-primary" style={{ width: '100%', display: 'inline-block', textAlign: 'center' }}>
                Cargar DataWall
              </label>
            </div>

            {/* Card 2: Final Review */}
            <div 
              className={`upload-zone glass-panel ${draggingType === 'final_review' ? 'dragging' : ''}`}
              onDragOver={(e) => handleDragOver(e, 'final_review')}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, 'final_review')}
              style={{ minHeight: '320px', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
            >
              <FileUp className="upload-icon" style={{ color: 'var(--info)' }} />
              <h2 className="upload-title" style={{ fontSize: '1.25rem', marginTop: '1rem' }}>Planilla Final Review</h2>
              <p className="upload-subtitle" style={{ fontSize: '0.8rem', minHeight: '4rem', margin: '0.5rem 0 1.5rem 0' }}>
                Arrastra tu planilla <strong>Final Review</strong> aquí, o haz clic para seleccionarla. Contiene columna de Carga Total.
              </p>
              <input 
                type="file" 
                id="excel-file-finalreview" 
                className="file-input" 
                accept=".xlsx, .xls"
                onChange={(e) => handleFileChange(e, 'final_review')}
              />
              <label htmlFor="excel-file-finalreview" className="btn btn-info" style={{ width: '100%', display: 'inline-block', textAlign: 'center', backgroundColor: 'var(--info)', borderColor: 'var(--info)', color: '#ffffff' }}>
                Cargar Final Review
              </label>
            </div>
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
                  <a 
                    href={fileUrl || '#'} 
                    download={file?.name}
                    className="file-info-name"
                    title="Haz clic para descargar y abrir el archivo original en Excel"
                    style={{ 
                      textDecoration: 'none', 
                      color: 'var(--primary)', 
                      fontWeight: '700',
                      cursor: 'pointer',
                      borderBottom: '1px dashed var(--primary)'
                    }}
                  >
                    {file?.name}
                  </a>
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


            {activeTab === 'dashboard' ? (
              <>
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
                <AlertsSection filteredData={filteredData} rawExcelRows={rawExcelRows} />

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
                <DashboardOverview filteredData={filteredData} rawData={data} rawExcelRows={rawExcelRows} theme={theme} />

                {/* Detailed Data Table */}
                <DataTable filteredData={filteredData} />
              </>
            ) : (
              <ValeConsumoSection filteredData={filteredData} file={file} />
            )}
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

      {/* Renderizado especial para impresión de Planilla Completa */}
      {rawExcelRows && rawExcelRows.length > 0 && (
        <div className="raw-excel-print-wrapper" style={{ display: 'none' }}>
          <div className="raw-excel-print-title">
            Planilla Completa Original: {file?.name}
          </div>
          <table className="raw-excel-print-table">
            <thead>
              <tr>
                {Object.keys(rawExcelRows[0] || {}).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rawExcelRows.map((row, idx) => (
                <tr key={idx}>
                  {Object.entries(row).map(([key, val]) => (
                    <td key={key}>
                      {val === null || val === undefined || String(val).trim() === '' ? (
                        '-'
                      ) : (
                        String(val)
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default App;
