/**
 * Utilidades unificadas para el manejo y parseo de fechas sin desfase de zona horaria.
 */

export const getRowDateStr = (fechaVal) => {
  if (!fechaVal) return null;

  // 1. Si ya es una instancia de Date
  if (fechaVal instanceof Date) {
    const hours = fechaVal.getHours();
    // Si la hora local es tarde en la noche (ej. >= 20), es por desfase de zona horaria (UTC medianoche del día siguiente)
    const useUTC = hours >= 20 || (fechaVal.getUTCHours() === 0 && fechaVal.getUTCMinutes() === 0);
    
    const year = useUTC ? fechaVal.getUTCFullYear() : fechaVal.getFullYear();
    const month = String((useUTC ? fechaVal.getUTCMonth() : fechaVal.getMonth()) + 1).padStart(2, '0');
    const day = String(useUTC ? fechaVal.getUTCDate() : fechaVal.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 2. Si viene como número (número de serie de fecha de Excel)
  if (typeof fechaVal === 'number') {
    const dateObj = new Date((fechaVal - 25569) * 86400 * 1000);
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const day = String(dateObj.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
  }

  // 3. Si viene como string
  const str = String(fechaVal).trim();
  if (!str) return null;

  // Si contiene formato largo de Date JS: "Thu Apr 16 2026..."
  if (str.includes('GMT') && !isNaN(Date.parse(str))) {
    return getRowDateStr(new Date(str));
  }

  // Intenta matchear DD/MM/YYYY o DD-MM-YYYY o DD/MM/YY o DD-MM-YY
  const matchDmy = str.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (matchDmy) {
    let day = parseInt(matchDmy[1], 10);
    let month = parseInt(matchDmy[2], 10);
    let year = parseInt(matchDmy[3], 10);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    return `${year}-${monthStr}-${dayStr}`;
  }

  // Intenta matchear YYYY-MM-DD
  const matchYmd = str.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (matchYmd) {
    const year = matchYmd[1];
    const month = String(parseInt(matchYmd[2], 10)).padStart(2, '0');
    const day = String(parseInt(matchYmd[3], 10)).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Intento de fallback general usando new Date
  const dateObj = new Date(fechaVal);
  if (!isNaN(dateObj.getTime())) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
};
