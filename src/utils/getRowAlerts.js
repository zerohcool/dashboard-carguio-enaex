export const isNotPureInches = (diamStr) => {
  if (!diamStr) return false;
  const cleanStr = String(diamStr).toLowerCase();
  if (cleanStr.includes('err') || cleanStr.includes('mm') || cleanStr.includes('m.m')) {
    return true;
  }
  
  // Quitar comillas y limpiar
  let numVal = parseFloat(cleanStr.replace(/"/g, '').trim());
  if (cleanStr.includes('/')) {
    return false; // Las fracciones como "6 1/2" son normales en pulgadas
  }
  
  if (!isNaN(numVal) && numVal > 20) {
    return true; // Si el valor es mayor a 20 (ej: 160, 251), está en milímetros
  }
  
  return false;
};

export const getRowAlerts = (row) => {
  const alerts = [];
  
  // 1. Carga con decimales, vacía o con descuadre
  const hasFondoColumna = (row.cargaFondo !== null && row.cargaFondo !== undefined) || (row.cargaColumna !== null && row.cargaColumna !== undefined);
  const sumFondoColumna = (row.cargaFondo || 0) + (row.cargaColumna || 0);
  const isSumDecimal = hasFondoColumna && (sumFondoColumna % 1 !== 0);
  const isSumEmpty = !hasFondoColumna;
  const isTotalEmpty = row.cargaTotal === null || row.cargaTotal === undefined;
  const isTotalDecimal = !isTotalEmpty && (row.cargaTotal % 1 !== 0);
  
  // Descuadre entre suma y total (si hay total y hay cargas)
  const isMismatch = (row.cargaTotal !== null && row.cargaTotal !== undefined) && Math.abs(row.cargaTotal - sumFondoColumna) > 0.1;

  if (isSumDecimal || isSumEmpty || isTotalEmpty || isTotalDecimal || isMismatch) {
    alerts.push('Carga con decimales/vacía/descuadre');
  }
  
  // 2. Celdas vacías críticas (Trazabilidad mandatoria)
  const isAllCargasEmpty = isTotalEmpty && isSumEmpty;
  
  const isAllTiposEmpty = (row.tipoFondo === null || row.tipoFondo === undefined || String(row.tipoFondo).trim() === '') &&
                          (row.tipoColumna === null || row.tipoColumna === undefined || String(row.tipoColumna).trim() === '');
                          
  const isAllCamionesEmpty = (row.camionFondo === null || row.camionFondo === undefined || String(row.camionFondo).trim() === '') &&
                             (row.camionColumna === null || row.camionColumna === undefined || String(row.camionColumna).trim() === '');
                             
  const isOperadorEmpty = row.operador === null || row.operador === undefined || String(row.operador).trim() === '';

  // Validación Cruzada:
  const hasFondoLoad = row.cargaFondo !== null && row.cargaFondo > 0;
  const missingFondoTrazabilidad = hasFondoLoad && (
    !row.tipoFondo || String(row.tipoFondo).trim() === '' ||
    !row.camionFondo || String(row.camionFondo).trim() === ''
  );
  
  const hasColumnaLoad = row.cargaColumna !== null && row.cargaColumna > 0;
  const missingColumnaTrazabilidad = hasColumnaLoad && (
    !row.tipoColumna || String(row.tipoColumna).trim() === '' ||
    !row.camionColumna || String(row.camionColumna).trim() === ''
  );

  if (isAllCargasEmpty || isAllTiposEmpty || isAllCamionesEmpty || isOperadorEmpty || missingFondoTrazabilidad || missingColumnaTrazabilidad) {
    alerts.push('Celdas vacías críticas');
  }

  // 3. Formato de diámetro no en pulgadas
  if (isNotPureInches(row.diametro)) {
    alerts.push('Diámetro en mm/err');
  }
  
  return alerts;
};
