/// <reference path="../pb_data/types.d.ts" />
// Fase 1 — extiende `leads` con campos UTM para tracking de origen,
// y un campo de honeypot anti-bot.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("leads");

  const addIfMissing = (name, factory) => {
    if (!collection.fields.getByName(name)) {
      collection.fields.add(factory());
    }
  };

  addIfMissing("utm_source", () => new TextField({ name: "utm_source", required: false, max: 100 }));
  addIfMissing("utm_medium", () => new TextField({ name: "utm_medium", required: false, max: 100 }));
  addIfMissing("utm_campaign", () => new TextField({ name: "utm_campaign", required: false, max: 100 }));
  addIfMissing("utm_term", () => new TextField({ name: "utm_term", required: false, max: 100 }));
  addIfMissing("utm_content", () => new TextField({ name: "utm_content", required: false, max: 100 }));
  addIfMissing("referer", () => new TextField({ name: "referer", required: false, max: 500 }));
  addIfMissing("honeypot", () => new TextField({ name: "honeypot", required: false, max: 200 }));
  addIfMissing("estado_seguimiento", () => new SelectField({
    name: "estado_seguimiento",
    required: false,
    maxSelect: 1,
    values: ["nuevo", "contactado", "cotizando", "matriculado", "no_interesado", "descartado"],
  }));
  addIfMissing("notas_internas", () => new TextField({ name: "notas_internas", required: false, max: 2000 }));

  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("leads");
  for (const name of [
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "referer", "honeypot", "estado_seguimiento", "notas_internas",
  ]) {
    if (collection.fields.getByName(name)) {
      collection.fields.removeByName(name);
    }
  }
  app.save(collection);
});
