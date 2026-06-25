/// <reference path="../pb_data/types.d.ts" />
// Soft-delete de cursos: agrega `archivado` para "archivar" en lugar de borrar.
//
// Borrar un curso fallaba en PocketBase porque está referenciado por relaciones
// obligatorias (p. ej. secciones.curso_id es required + cascadeDelete:false),
// y PB no permite borrar un registro que es parte de una "required relation
// reference". Archivar lo oculta de la gestión sin perder secciones, matrículas,
// asistencia ni notas. El filtrado de archivados es client-side, así que el
// front no se rompe aunque el campo todavía no exista.
migrate((app) => {
  const collection = app.findCollectionByNameOrId("cursos");
  if (!collection.fields.getByName("archivado")) {
    collection.fields.add(new BoolField({
      name: "archivado",
      required: false,
    }));
  }
  app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("cursos");
  if (collection.fields.getByName("archivado")) {
    collection.fields.removeByName("archivado");
  }
  app.save(collection);
});
