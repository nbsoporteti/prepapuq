// Trimestres académicos chilenos default. Configurables en V2 vía PB.
// T1: mar-jun, T2: jul-sep, T3: oct-dic
export const trimestrePorFecha = (iso) => {
  if (!iso) return null;
  let d;
  try { d = new Date(iso); } catch (_e) { return null; }
  const m = d.getMonth() + 1; // 1-12
  if (m >= 3 && m <= 6) return 'T1';
  if (m >= 7 && m <= 9) return 'T2';
  if (m >= 10 && m <= 12) return 'T3';
  return null; // enero/febrero = receso
};

export const TRIMESTRES_OPCIONES = [
  { value: 'T1', label: 'Trimestre 1 (Mar-Jun)' },
  { value: 'T2', label: 'Trimestre 2 (Jul-Sep)' },
  { value: 'T3', label: 'Trimestre 3 (Oct-Dic)' },
];
