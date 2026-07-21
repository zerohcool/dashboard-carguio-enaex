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
  
  // 1. Decimales o vacío en carga
  const hasFondoColumna = (row.cargaFondo !== null && row.cargaFondo !== undefined) || (row.cargaColumna !== null && row.cargaColumna !== undefined);
  const sumFondoColumna = (row.cargaFondo || 0) + (row.cargaColumna || 0);
  const isSumDecimal = hasFondoColumna && (sumFondoColumna % 1 !== 0);
  const isSumEmpty = !hasFondoColumna;
  const isTotalEmpty = row.cargaTotal === null || row.cargaTotal === undefined;
  const isTotalDecimal = !isTotalEmpty && (row.cargaTotal % 1 !== 0);

  if (isSumDecimal || isSumEmpty || isTotalEmpty || isTotalDecimal) {
    alerts.push('Carga con decimales/vacía');
  }
  
  // 2. Celdas vacías críticas
  const isCargaEmpty = (row.cargaTotal === null || row.cargaTotal === undefined) || (row.cargaFondo === null && row.cargaColumna === null);
  const isTipoEmpty = row.tipoFondo === null && row.tipoColumna === null;
  const isCamionEmpty = row.camionFondo === null && row.camionColumna === null;
  const isOperadorEmpty = row.operador === null || row.operador.trim() === '';

  if (isCargaEmpty || isTipoEmpty || isCamionEmpty || isOperadorEmpty) {
    alerts.push('Celdas vacías críticas');
  }

  // 3. Formato de diámetro no en pulgadas
  if (isNotPureInches(row.diametro)) {
    alerts.push('Diámetro en mm/err');
  }
  
  // 4. Inconsistencia en Carga Total (Suma de cargas no coincide)
  if (row.cargaTotal !== null && row.cargaTotal !== undefined) {
    const expectedTotal = (row.cargaFondo || 0) + (row.cargaColumna || 0);
    if (Math.abs(row.cargaTotal - expectedTotal) > 0.1) {
      alerts.push('Inconsistencia en Carga Total');
    }
  }
  
  return alerts;
};
