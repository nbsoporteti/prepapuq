/// <reference path="../pb_data/types.d.ts" />
// Seed de feriados Chile 2026. Idempotente: solo crea si no existe ya el feriado
// para la fecha. Los hooks de recurrencia consultan esta tabla para saltear
// días al generar clases en serie.
migrate((app) => {
  const collection = (() => { try { return app.findCollectionByNameOrId("feriados_cl"); } catch (_e) { return null; } })();
  if (!collection) {
    console.log("[1780619000] feriados_cl no existe aún, skip");
    return;
  }

  const FERIADOS_2026 = [
    { fecha: "2026-01-01", nombre: "Año Nuevo", tipo: "civil", irrenunciable: true },
    { fecha: "2026-04-03", nombre: "Viernes Santo", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-04-04", nombre: "Sábado Santo", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-05-01", nombre: "Día Nacional del Trabajo", tipo: "civil", irrenunciable: true },
    { fecha: "2026-05-21", nombre: "Día de las Glorias Navales", tipo: "civil", irrenunciable: false },
    { fecha: "2026-06-21", nombre: "Día Nacional de los Pueblos Indígenas", tipo: "civil", irrenunciable: false },
    { fecha: "2026-06-29", nombre: "San Pedro y San Pablo", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-07-16", nombre: "Día de la Virgen del Carmen", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-08-15", nombre: "Asunción de la Virgen", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-09-18", nombre: "Independencia Nacional", tipo: "civil", irrenunciable: true },
    { fecha: "2026-09-19", nombre: "Día de las Glorias del Ejército", tipo: "civil", irrenunciable: true },
    { fecha: "2026-10-12", nombre: "Encuentro de Dos Mundos", tipo: "civil", irrenunciable: false },
    { fecha: "2026-10-31", nombre: "Día de las Iglesias Evangélicas", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-11-01", nombre: "Día de Todos los Santos", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-12-08", nombre: "Inmaculada Concepción", tipo: "religioso", irrenunciable: false },
    { fecha: "2026-12-25", nombre: "Navidad", tipo: "religioso", irrenunciable: true },
  ];

  for (const f of FERIADOS_2026) {
    // Idempotencia: si existe el feriado para esa fecha, saltar.
    try {
      const existing = app.findFirstRecordByFilter("feriados_cl", "fecha = {:f}", { f: f.fecha });
      if (existing) continue;
    } catch (_e) {
      // not found → continuar al insert
    }

    const rec = new Record(collection);
    rec.set("fecha", f.fecha + " 00:00:00.000Z");
    rec.set("nombre", f.nombre);
    rec.set("tipo", f.tipo);
    rec.set("irrenunciable", f.irrenunciable);
    rec.set("anio", 2026);
    try {
      app.saveNoValidate(rec);
    } catch (e) {
      console.log("[1780619000] error en " + f.fecha + ": " + e.message);
    }
  }
}, (app) => {
  // Down: borrar todos los feriados 2026
  try {
    const records = app.findAllRecords("feriados_cl");
    for (const r of records) {
      if (r.get("anio") === 2026) {
        try { app.delete(r); } catch (_e) {}
      }
    }
  } catch (_e) {}
});
