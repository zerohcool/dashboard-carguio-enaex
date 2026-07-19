import React, { useState, useEffect, useMemo } from 'react';
import { Printer, RefreshCw, FileText } from 'lucide-react';

function ValeConsumoSection({ filteredData, file }) {
  // Extracción del número de vale para pre-llenar
  const initialValeNum = useMemo(() => {
    if (!file || !file.name) return '';
    const matchV = file.name.match(/V-?(\d+)/i);
    if (matchV) return matchV[1];
    const matchNum = file.name.match(/\d{4,}/);
    return matchNum ? matchNum[0] : '';
  }, [file]);

  // Valores generales autocompletados con posibilidad de edición
  const [generalFields, setGeneralFields] = useState({
    nVale: '',
    fecha: '',
    banco: '',
    material: '',
    pozos: '',
    malla: '',
    fase: '',
  });

  // Inicializar campos generales basados en los datos cargados
  useEffect(() => {
    if (!filteredData || filteredData.length === 0) return;

    // Obtener valores únicos
    const fases = Array.from(new Set(filteredData.map(r => r.fase).filter(Boolean))).sort().join(', ');
    const bancos = Array.from(new Set(filteredData.map(r => r.banco).filter(Boolean))).sort().join(', ');
    const mallas = Array.from(new Set(filteredData.map(r => r.poligono).filter(Boolean))).sort().join(', ');
    const countPozos = filteredData.length;
    
    // Obtener la fecha del vale
    let dateStr = '';
    const dates = filteredData.map(r => r.fecha).filter(Boolean);
    if (dates.length > 0) {
      const parsedDate = new Date(dates[0]);
      if (!isNaN(parsedDate.getTime())) {
        const y = parsedDate.getFullYear();
        const m = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const d = String(parsedDate.getDate()).padStart(2, '0');
        dateStr = `${d}-${m}-${y}`;
      }
    } else {
      // Fecha actual como fallback
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      dateStr = `${d}-${m}-${y}`;
    }

    setGeneralFields({
      nVale: initialValeNum,
      fecha: dateStr,
      banco: bancos,
      material: '',
      pozos: `${countPozos} pozos`,
      malla: mallas,
      fase: fases,
    });
  }, [filteredData, initialValeNum]);

  // 1. EXPLOSIVOS
  // Nombres de explosivos requeridos en el formato oficial
  const officialExplosivesList = [
    'ANFO GRANEL',
    'BLENDEX 930',
    'BLENDEX 940',
    'BLENDEX 950',
    'EMULTEX BN 1600',
    'DENSIEX',
    'VERTEX 930',
    'VERTEX 950',
    'VERTEX 970'
  ];

  // Agrupar y sumar los explosivos del Excel de forma inteligente
  const [explosivosRows, setExplosivosRows] = useState([]);

  useEffect(() => {
    if (!filteredData) return;

    // Helper de comparación de nombres de explosivos
    const getCargaForExplosive = (officialName) => {
      let total = 0;
      const cleanOfficial = officialName.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      filteredData.forEach(row => {
        // Carga de Fondo
        if (row.tipoFondo && row.cargaFondo) {
          const cleanFondo = row.tipoFondo.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanFondo.includes(cleanOfficial) || cleanOfficial.includes(cleanFondo)) {
            total += row.cargaFondo;
          }
        }
        // Carga de Columna
        if (row.tipoColumna && row.cargaColumna) {
          const cleanColumna = row.tipoColumna.toLowerCase().replace(/[^a-z0-9]/g, '');
          if (cleanColumna.includes(cleanOfficial) || cleanOfficial.includes(cleanFondo)) { // fallback matching
            total += row.cargaColumna;
          }
        }
      });
      return total > 0 ? Math.round(total) : '';
    };

    const rows = officialExplosivesList.map(name => ({
      descripcion: name,
      und: 'KG',
      utilizado: getCargaForExplosive(name)
    }));

    setExplosivosRows(rows);
  }, [filteredData]);

  // 2. ALTOS EXPLOSIVOS
  // Inicialización de la tabla Altos Explosivos
  const [altosExplosivosRows, setAltosExplosivosRows] = useState([
    { descripcion: 'ENALINE 1 1/2 x 12 MTS. REF.', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: 'CORDON DETONANTE BRITACORD 5N', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: 'APD- P-150 CILINDRICO', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: 'X-BOOSTER 450', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: '', und: 'MTS', solicitado: '', devolucion: '', consumo: '' },
  ]);

  // Pre-llenar booster automáticamente en base a las primas del Excel
  useEffect(() => {
    if (!filteredData) return;
    
    // Sumar el total de primas
    const totalPrimas = filteredData.reduce((acc, row) => acc + (row.nPrimas || 0), 0);
    
    setAltosExplosivosRows(prev => prev.map(row => {
      if (row.descripcion === 'X-BOOSTER 450') {
        return {
          ...row,
          solicitado: totalPrimas || '',
          devolucion: 0,
          consumo: totalPrimas || ''
        };
      }
      return row;
    }));
  }, [filteredData]);

  // 3. DETONADORES
  const [detonadoresRows, setDetonadoresRows] = useState([
    { descripcion: 'DAVEYTRONIC 20MTS REF M85 XD 20ms', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: '', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: 'BRINEL 1000 MS 21 MTS.', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: '', und: 'UND', solicitado: '', devolucion: '', consumo: '' },
  ]);

  // Auto-llenar detonadores electrónicos según cantidad de pozos
  useEffect(() => {
    if (!filteredData) return;
    const count = filteredData.length;
    setDetonadoresRows(prev => prev.map((row, index) => {
      // Por defecto, pre-llenar la primera fila con Daveytronic igual al total de pozos
      if (index === 0) {
        return {
          ...row,
          solicitado: count || '',
          devolucion: 0,
          consumo: count || ''
        };
      }
      return row;
    }));
  }, [filteredData]);

  // 4. ACCESORIOS
  const [accesoriosRows, setAccesoriosRows] = useState([
    { descripcion: 'CABLE DE DISPARO', und: 'MTS', solicitado: '', devolucion: '', consumo: '' },
    { descripcion: '', und: '', solicitado: '', devolucion: '', consumo: '' },
  ]);

  // 5. RESPONSABLES
  const [responsables, setResponsables] = useState({
    entregadoPor: '',
    retiradoPor: '',
    firmaEntregado: '',
    firmaRetirado: '',
  });

  // 6. DETALLES DE CONFIGURACIÓN Y OBSERVACIONES
  const [configValues, setConfigValues] = useState({
    simples: '',
    dobles: '',
    triples: '',
    dobleConfig: '',
    backup: '',
    observaciones: '',
  });

  // Manejadores de cambios
  const handleGeneralChange = (field, val) => {
    setGeneralFields(prev => ({ ...prev, [field]: val }));
  };

  const handleExplosivosChange = (index, val) => {
    setExplosivosRows(prev => prev.map((row, idx) => 
      idx === index ? { ...row, utilizado: val } : row
    ));
  };

  const handleRowChange = (table, index, field, val) => {
    const numericVal = val === '' ? '' : Number(val);
    
    const updateRows = (rows) => rows.map((row, idx) => {
      if (idx === index) {
        const updated = { ...row, [field]: val };
        // Recalcular consumo automáticamente: Consumo = Solicitado - Devolución
        const sol = field === 'solicitado' ? numericVal : Number(row.solicitado || 0);
        const dev = field === 'devolucion' ? numericVal : Number(row.devolucion || 0);
        updated.consumo = (sol !== '' && dev !== '') ? Math.max(0, sol - dev) : '';
        return updated;
      }
      return row;
    });

    if (table === 'altos') setAltosExplosivosRows(updateRows);
    if (table === 'detonadores') setDetonadoresRows(updateRows);
    if (table === 'accesorios') setAccesoriosRows(updateRows);
  };

  const handleResponsableChange = (field, val) => {
    setResponsables(prev => ({ ...prev, [field]: val }));
  };

  const handleConfigChange = (field, val) => {
    setConfigValues(prev => ({ ...prev, [field]: val }));
  };

  const triggerPrintVale = () => {
    window.print();
  };

  return (
    <div className="vale-section-wrapper">
      {/* Botonera de control (no imprimible) */}
      <div className="no-print" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '1.25rem 1.5rem',
        background: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <FileText style={{ color: 'var(--primary)' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>Vale de Consumo Autocompletado</h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Genera la réplica imprimible del vale de Enaex para Minera Sierra Gorda.
            </p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={triggerPrintVale} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1.25rem' }}>
          <Printer size={16} /> Imprimir Vale de Consumo
        </button>
      </div>

      {/* Formato del Vale de Consumo Replicado (Imprimible) */}
      <div className="vale-document-sheet print-only-area">
        {/* Encabezado del Vale */}
        <div className="vale-doc-header">
          <div className="vale-doc-logos">
            <div className="logo-box">
              <span className="logo-placeholder enaex-logo">Enaex</span>
            </div>
            <div className="logo-box sierra-gorda-box">
              <span className="logo-placeholder sg-logo">Sierra Gorda <small>SCM</small></span>
            </div>
          </div>
          <div className="vale-doc-title-container">
            <h1 className="vale-doc-main-title">VALE CONSUMO DE EXPLOSIVOS</h1>
            <h2 className="vale-doc-subtitle">MINERA SIERRA GORDA</h2>
          </div>
          <div className="vale-doc-number-box">
            <span className="vale-num-label">N° VALE :</span>
            <input 
              type="text" 
              className="vale-num-input" 
              value={generalFields.nVale}
              onChange={(e) => handleGeneralChange('nVale', e.target.value)}
            />
          </div>
        </div>

        {/* Campos Generales */}
        <div className="vale-general-grid">
          <div className="vale-grid-cell">
            <span className="vale-cell-label">FECHA:</span>
            <input type="text" className="vale-cell-input" value={generalFields.fecha} onChange={(e) => handleGeneralChange('fecha', e.target.value)} />
          </div>
          <div className="vale-grid-cell">
            <span className="vale-cell-label">BANCO:</span>
            <input type="text" className="vale-cell-input" value={generalFields.banco} onChange={(e) => handleGeneralChange('banco', e.target.value)} />
          </div>
          <div className="vale-grid-cell">
            <span className="vale-cell-label">MATERIAL:</span>
            <input type="text" className="vale-cell-input" value={generalFields.material} onChange={(e) => handleGeneralChange('material', e.target.value)} />
          </div>
          <div className="vale-grid-cell">
            <span className="vale-cell-label">POZOS:</span>
            <input type="text" className="vale-cell-input" value={generalFields.pozos} onChange={(e) => handleGeneralChange('pozos', e.target.value)} />
          </div>
          <div className="vale-grid-cell">
            <span className="vale-cell-label">MALLA:</span>
            <input type="text" className="vale-cell-input" value={generalFields.malla} onChange={(e) => handleGeneralChange('malla', e.target.value)} />
          </div>
          <div className="vale-grid-cell">
            <span className="vale-cell-label">FASE:</span>
            <input type="text" className="vale-cell-input" value={generalFields.fase} onChange={(e) => handleGeneralChange('fase', e.target.value)} />
          </div>
        </div>

        {/* Tablas de Explosivos y Altos Explosivos */}
        <div className="vale-tables-row">
          
          {/* Tabla 1: Explosivos */}
          <div className="vale-table-container explosives-col">
            <div className="vale-table-title-bar">EXPLOSIVOS</div>
            <table className="vale-form-table">
              <thead>
                <tr>
                  <th style={{ width: '60%' }}>DESCRIPCIÓN</th>
                  <th style={{ width: '15%' }}>UND</th>
                  <th style={{ width: '25%' }}>UTILIZADO</th>
                </tr>
              </thead>
              <tbody>
                {explosivosRows.map((row, idx) => (
                  <tr key={idx}>
                    <td className="desc-cell">{row.descripcion}</td>
                    <td className="center-cell">{row.und}</td>
                    <td>
                      <input 
                        type="text" 
                        className="table-input-val" 
                        value={row.utilizado} 
                        onChange={(e) => handleExplosivosChange(idx, e.target.value)} 
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Columna Derecha: Altos Explosivos, Detonadores y Accesorios */}
          <div className="vale-tables-right-stack">
            
            {/* Tabla 2: Altos Explosivos */}
            <div className="vale-table-container">
              <div className="vale-table-title-bar">ALTOS EXPLOSIVOS</div>
              <table className="vale-form-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>DESCRIPCIÓN</th>
                    <th style={{ width: '10%' }}>UND</th>
                    <th style={{ width: '13%' }}>SOLICITADO</th>
                    <th style={{ width: '13%' }}>DEVOLUCIÓN</th>
                    <th style={{ width: '14%' }}>CONSUMO</th>
                  </tr>
                </thead>
                <tbody>
                  {altosExplosivosRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="desc-cell">{row.descripcion}</td>
                      <td className="center-cell">{row.und}</td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val" 
                          value={row.solicitado} 
                          onChange={(e) => handleRowChange('altos', idx, 'solicitado', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val" 
                          value={row.devolucion} 
                          onChange={(e) => handleRowChange('altos', idx, 'devolucion', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val bold-total" 
                          value={row.consumo} 
                          disabled
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tabla 3: Detonadores */}
            <div className="vale-table-container">
              <div className="vale-table-title-bar">DETONADORES</div>
              <table className="vale-form-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>DESCRIPCIÓN</th>
                    <th style={{ width: '10%' }}>UND</th>
                    <th style={{ width: '13%' }}>SOLICITADO</th>
                    <th style={{ width: '13%' }}>DEVOLUCIÓN</th>
                    <th style={{ width: '14%' }}>CONSUMO</th>
                  </tr>
                </thead>
                <tbody>
                  {detonadoresRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="desc-cell">{row.descripcion}</td>
                      <td className="center-cell">{row.und}</td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val" 
                          value={row.solicitado} 
                          onChange={(e) => handleRowChange('detonadores', idx, 'solicitado', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val" 
                          value={row.devolucion} 
                          onChange={(e) => handleRowChange('detonadores', idx, 'devolucion', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val bold-total" 
                          value={row.consumo} 
                          disabled
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tabla 4: Accesorios */}
            <div className="vale-table-container">
              <div className="vale-table-title-bar">ACCESORIOS</div>
              <table className="vale-form-table">
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>DESCRIPCIÓN</th>
                    <th style={{ width: '10%' }}>UND</th>
                    <th style={{ width: '13%' }}>SOLICITADO</th>
                    <th style={{ width: '13%' }}>DEVOLUCIÓN</th>
                    <th style={{ width: '14%' }}>CONSUMO</th>
                  </tr>
                </thead>
                <tbody>
                  {accesoriosRows.map((row, idx) => (
                    <tr key={idx}>
                      <td className="desc-cell">{row.descripcion}</td>
                      <td className="center-cell">{row.und}</td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val" 
                          value={row.solicitado} 
                          onChange={(e) => handleRowChange('accesorios', idx, 'solicitado', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val" 
                          value={row.devolucion} 
                          onChange={(e) => handleRowChange('accesorios', idx, 'devolucion', e.target.value)} 
                        />
                      </td>
                      <td>
                        <input 
                          type="text" 
                          className="table-input-val bold-total" 
                          value={row.consumo} 
                          disabled
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>

        {/* Tabla Responsable / Nombre / Firma */}
        <div className="vale-table-container signature-block-table">
          <table className="vale-form-table responsibles-table">
            <thead>
              <tr>
                <th style={{ width: '25%' }}>RESPONSABLE</th>
                <th style={{ width: '50%' }}>NOMBRE</th>
                <th style={{ width: '25%' }}>FIRMA</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="desc-cell bold-label">ENTREGADO POR</td>
                <td>
                  <input 
                    type="text" 
                    className="table-input-val text-left font-medium" 
                    value={responsables.entregadoPor} 
                    onChange={(e) => handleResponsableChange('entregadoPor', e.target.value)} 
                  />
                </td>
                <td className="signature-cell-placeholder"></td>
              </tr>
              <tr>
                <td className="desc-cell bold-label">RETIRADO POR</td>
                <td>
                  <input 
                    type="text" 
                    className="table-input-val text-left font-medium" 
                    value={responsables.retiradoPor} 
                    onChange={(e) => handleResponsableChange('retiradoPor', e.target.value)} 
                  />
                </td>
                <td className="signature-cell-placeholder"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Fila de Simples, Dobles, Triples, Doble Config, Backup */}
        <div className="vale-config-row">
          <div className="config-item">
            <span>Simples:</span>
            <input type="text" className="config-input" value={configValues.simples} onChange={(e) => handleConfigChange('simples', e.target.value)} />
          </div>
          <div className="config-item">
            <span>Dobles:</span>
            <input type="text" className="config-input" value={configValues.dobles} onChange={(e) => handleConfigChange('dobles', e.target.value)} />
          </div>
          <div className="config-item">
            <span>Triples:</span>
            <input type="text" className="config-input" value={configValues.triples} onChange={(e) => handleConfigChange('triples', e.target.value)} />
          </div>
          <div className="config-item">
            <span>Doble config:</span>
            <input type="text" className="config-input" value={configValues.dobleConfig} onChange={(e) => handleConfigChange('dobleConfig', e.target.value)} />
          </div>
          <div className="config-item">
            <span>Backup:</span>
            <input type="text" className="config-input" value={configValues.backup} onChange={(e) => handleConfigChange('backup', e.target.value)} />
          </div>
        </div>

        {/* Observaciones */}
        <div className="vale-observaciones-block">
          <span className="obs-label">OBSERVACIONES :</span>
          <textarea 
            className="obs-textarea" 
            rows="2" 
            value={configValues.observaciones}
            onChange={(e) => handleConfigChange('observaciones', e.target.value)}
          />
        </div>

        {/* Firma Supervisor al final de la página */}
        <div className="vale-supervisor-signature-block">
          <div className="supervisor-signature-line"></div>
          <span className="supervisor-signature-label">FIRMA SUPERVISOR</span>
        </div>

      </div>
    </div>
  );
}

export default ValeConsumoSection;
