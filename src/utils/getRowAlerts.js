const isNotPureInches = (diamStr) => {
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
  
  // 1. Decimales en carga de fondo
  if (row.cargaFondo !== null && row.cargaFondo % 1 !== 0) {
    alerts.push('Fondo con decimales');
  }
  
  // 2. Vacío en carga
  if (row.cargaFondo === null && row.cargaColumna === null) {
    alerts.push('Carga vacía');
  }
  
  // 3. Vacío en tipo
  if (row.tipoFondo === null && row.tipoColumna === null) {
    alerts.push('Tipo vacío');
  }
  
  // 4. Vacío en camión
  if (row.camionFondo === null && row.camionColumna === null) {
    alerts.push('Camión vacío');
  }
  
  // 5. Vacío en operador
  if (row.operador === null || row.operador.trim() === '') {
    alerts.push('Operador vacío');
  }

  // 6. Formato de diámetro no en pulgadas
  if (isNotPureInches(row.diametro)) {
    alerts.push('Diámetro en mm/err');
  }
  
  // 7. Inconsistencia en Carga Total (Suma de cargas no coincide)
  if (row.cargaTotal !== null && row.cargaTotal !== undefined) {
    const expectedTotal = (row.cargaFondo || 0) + (row.cargaColumna || 0);
    if (Math.abs(row.cargaTotal - expectedTotal) > 0.1) {
      alerts.push('Inconsistencia en Carga Total');
    }
  }
  
  return alerts;
};
