// Cálculo de promedio ponderado de notas chilenas.
//
// Estrategia: si una categoría no tiene notas, se re-normaliza el resto
// para sumar 100% (en vez de penalizar al alumno con 0 en esa categoría).
//
// Estructura esperada:
//   categorias: [{ id, nombre, ponderacion_pct }]
//   notasPorCategoria: Map<categoria_id, number[]>  (solo notas finales,
//                                                    eximidas/anuladas excluidas)
//
// Devuelve: { promedio (1.0-7.0 o null), detalle: [...] }

export const calcularPromedio = (categorias, notasPorCategoria) => {
  const detalle = categorias.map((cat) => {
    const notas = notasPorCategoria.get(cat.id) || [];
    const validas = notas.filter((n) => typeof n === 'number' && !isNaN(n));
    const promCategoria = validas.length === 0
      ? null
      : Math.round((validas.reduce((a, b) => a + b, 0) / validas.length) * 10) / 10;
    return {
      categoria: cat,
      n_notas: validas.length,
      promedio: promCategoria,
      ponderacion_efectiva: 0, // se setea abajo
    };
  });

  const conNotas = detalle.filter((d) => d.promedio !== null);
  const totalPonderacionConNotas = conNotas.reduce((sum, d) => sum + (d.categoria.ponderacion_pct || 0), 0);

  if (conNotas.length === 0 || totalPonderacionConNotas === 0) {
    return { promedio: null, detalle };
  }

  // Re-normalizar para que la suma de ponderaciones de las categorías con
  // notas dé 100. Las categorías sin notas quedan en 0.
  for (const d of conNotas) {
    d.ponderacion_efectiva = ((d.categoria.ponderacion_pct || 0) / totalPonderacionConNotas) * 100;
  }

  const promedio = conNotas.reduce((sum, d) => sum + (d.promedio * d.ponderacion_efectiva) / 100, 0);

  return {
    promedio: Math.round(promedio * 10) / 10,
    detalle,
  };
};

// Para un set plano de notas (sin categorías): promedio aritmético simple.
export const promedioSimple = (notas) => {
  const validas = (notas || []).filter((n) => typeof n === 'number' && !isNaN(n));
  if (validas.length === 0) return null;
  return Math.round((validas.reduce((a, b) => a + b, 0) / validas.length) * 10) / 10;
};
