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
  
  return alerts;
};
