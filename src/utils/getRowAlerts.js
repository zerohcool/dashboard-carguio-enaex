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

  // 6. Diámetro no es pulgada o vacío
  if (!row.diametro) {
    alerts.push('Diámetro vacío');
  } else {
    const diamStr = String(row.diametro).toLowerCase().trim();
    const hasMm = diamStr.includes('mm') || diamStr.includes('m.m');
    const hasErr = diamStr.includes('err') || diamStr.includes('error');
    const numPart = parseFloat(diamStr.replace(/[^0-9.]/g, ''));
    const isLargeNum = !isNaN(numPart) && numPart > 20;
    
    if (hasMm || hasErr || isLargeNum || isNaN(numPart)) {
      alerts.push('Diámetro no es pulgada');
    }
  }
  
  return alerts;
};
