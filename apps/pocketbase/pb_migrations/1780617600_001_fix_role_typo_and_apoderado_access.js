/// <reference path="../pb_data/types.d.ts" />
// Fixes the `@request.auth.role` typo (the users field is `rol`, not `role`)
// introduced across all 1776144xxx_001_update_rules_for_* migrations, and
// grants apoderado read access to asistencia/justificaciones of their pupilos
// via the parent_student relation.
migrate((app) => {
  const apoderadoCanSeePupiloRule =
    '@collection.parent_student.parent_id ?= @request.auth.id && @collection.parent_student.student_id ?= user_id';

  // users
  {
    const c = app.findCollectionByNameOrId('users');
    c.listRule = 'id = @request.auth.id || @request.auth.rol = "admin"';
    c.viewRule =
      '@request.auth.rol = "admin" || @request.auth.rol = "apoderado" || id = @request.auth.id';
    app.save(c);
  }

  // cursos
  {
    const c = app.findCollectionByNameOrId('cursos');
    c.listRule = '@request.auth.id != ""';
    c.viewRule = '@request.auth.id != ""';
    c.createRule = '@request.auth.rol = "admin"';
    c.updateRule = '@request.auth.rol = "admin"';
    c.deleteRule = '@request.auth.rol = "admin"';
    app.save(c);
  }

  // materiales
  {
    const c = app.findCollectionByNameOrId('materiales');
    c.listRule = '@request.auth.id != ""';
    c.viewRule = '@request.auth.id != ""';
    c.createRule = '@request.auth.rol = "admin"';
    c.updateRule = '@request.auth.rol = "admin"';
    c.deleteRule = '@request.auth.rol = "admin"';
    app.save(c);
  }

  // asignaciones
  {
    const c = app.findCollectionByNameOrId('asignaciones');
    c.listRule = `@request.auth.rol = "admin" || user_id = @request.auth.id || (${apoderadoCanSeePupiloRule})`;
    c.viewRule = `@request.auth.rol = "admin" || user_id = @request.auth.id || (${apoderadoCanSeePupiloRule})`;
    c.createRule = '@request.auth.rol = "admin"';
    c.updateRule = '@request.auth.rol = "admin"';
    c.deleteRule = '@request.auth.rol = "admin"';
    app.save(c);
  }

  // asistencia
  {
    const c = app.findCollectionByNameOrId('asistencia');
    c.listRule = `@request.auth.rol = "admin" || user_id = @request.auth.id || (${apoderadoCanSeePupiloRule})`;
    c.viewRule = `@request.auth.rol = "admin" || user_id = @request.auth.id || (${apoderadoCanSeePupiloRule})`;
    c.createRule = '@request.auth.rol = "admin"';
    c.updateRule = '@request.auth.rol = "admin"';
    c.deleteRule = '@request.auth.rol = "admin"';
    app.save(c);
  }

  // justifications — apoderado may also create one for an absence of their pupilo
  {
    const c = app.findCollectionByNameOrId('justifications');
    c.listRule = `@request.auth.rol = "admin" || user_id = @request.auth.id || (${apoderadoCanSeePupiloRule})`;
    c.viewRule = `@request.auth.rol = "admin" || user_id = @request.auth.id || (${apoderadoCanSeePupiloRule})`;
    c.createRule = '@request.auth.id != ""';
    c.updateRule = '@request.auth.rol = "admin"';
    c.deleteRule = '@request.auth.rol = "admin"';
    app.save(c);
  }

  // parent_student
  {
    const c = app.findCollectionByNameOrId('parent_student');
    c.listRule =
      '@request.auth.rol = "admin" || @request.auth.id = parent_id || @request.auth.id = student_id';
    c.viewRule =
      '@request.auth.rol = "admin" || @request.auth.id = parent_id || @request.auth.id = student_id';
    c.createRule = '@request.auth.rol = "admin"';
    c.updateRule = '@request.auth.rol = "admin"';
    c.deleteRule = '@request.auth.rol = "admin"';
    app.save(c);
  }

  // leads — public create (contact form), admins manage
  {
    const c = app.findCollectionByNameOrId('leads');
    c.listRule = '@request.auth.rol = "admin"';
    c.viewRule = '@request.auth.rol = "admin"';
    app.save(c);
  }
}, (app) => {
  // Revert to the buggy `role` state from the 1776144xxx series.
  const collections = [
    'users',
    'cursos',
    'materiales',
    'asignaciones',
    'asistencia',
    'justifications',
    'parent_student',
    'leads',
  ];
  for (const name of collections) {
    try {
      const c = app.findCollectionByNameOrId(name);
      // Restore the (broken) prior rules verbatim.
      if (name === 'users') {
        c.listRule = 'id = @request.auth.id || @request.auth.role = "admin"';
        c.viewRule = '@request.auth.role = \'apoderado\' || id = @request.auth.id';
      } else if (name === 'leads') {
        c.listRule = '@request.auth.id != ""';
        c.viewRule = '';
      } else {
        // generic role-based revert
        if (name === 'cursos') {
          c.listRule = '';
          c.viewRule = "@request.auth.role = 'estudiante'";
        } else {
          c.listRule = '';
          c.viewRule = '';
        }
        c.createRule = '@request.auth.role = "admin"';
        c.updateRule = '@request.auth.role = "admin"';
        c.deleteRule = '@request.auth.role = "admin"';
      }
      app.save(c);
    } catch (_e) {
      // ignore missing collections
    }
  }
});
