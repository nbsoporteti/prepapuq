import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { BookOpen, GraduationCap, ShieldAlert, ArrowLeft } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext.jsx';

// Manual de uso in-app para administradores y docentes. Contenido estático:
// describe los flujos reales del panel. Se mantiene a mano cuando cambian.

const Paso = ({ children }) => (
  <li className="leading-relaxed text-foreground/90">{children}</li>
);

const Bloque = ({ value, titulo, children }) => (
  <AccordionItem value={value} className="rounded-xl border bg-card px-5 shadow-sm">
    <AccordionTrigger className="text-left font-semibold hover:no-underline">{titulo}</AccordionTrigger>
    <AccordionContent className="pb-5 text-sm text-muted-foreground">{children}</AccordionContent>
  </AccordionItem>
);

const ManualPage = () => {
  const { rolActivo, rolesEffective = [], currentUser } = useAuth();
  const roles = [rolActivo, currentUser?.rol, ...(rolesEffective || [])].filter(Boolean);
  const defaultTab = roles.includes('admin') ? 'admin' : 'docente';

  return (
    <>
      <Helmet>
        <title>Manual de uso | PrePa</title>
      </Helmet>

      <div className="container mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="-ml-3 mb-4 text-muted-foreground">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Link>
        </Button>

        <h1 className="text-3xl font-bold tracking-tight">Manual de uso</h1>
        <p className="mt-2 text-muted-foreground">
          Guía rápida de las tareas más comunes en PrePa. Elegí tu rol abajo.
        </p>

        <Tabs defaultValue={defaultTab} className="mt-8">
          <TabsList className="mb-6">
            <TabsTrigger value="admin">
              <ShieldAlert className="mr-1.5 h-4 w-4" />
              Administradores
            </TabsTrigger>
            <TabsTrigger value="docente">
              <GraduationCap className="mr-1.5 h-4 w-4" />
              Docentes
            </TabsTrigger>
          </TabsList>

          {/* ============================ ADMIN ============================ */}
          <TabsContent value="admin">
            <Accordion type="single" collapsible className="space-y-3">
              <Bloque value="a-cursos" titulo="Cursos: crear y archivar">
                <ol className="ml-4 list-decimal space-y-1.5">
                  <Paso>Entrá a <strong className="text-foreground">Panel de administración → pestaña Cursos</strong>.</Paso>
                  <Paso>Completá <em>nombre</em>, <em>descripción</em> y (opcional) <em>portada</em>, y apretá <strong className="text-foreground">Guardar Curso</strong>.</Paso>
                  <Paso>Para sacar un curso de la lista: pasá el mouse por encima y tocá el ícono <strong className="text-foreground">Archivar</strong>. No se borra (conserva secciones, notas y asistencia); aparece abajo en <strong className="text-foreground">“Archivados”</strong> con botón <strong className="text-foreground">Restaurar</strong>.</Paso>
                </ol>
                <p className="mt-2">Nota: un curso no se puede borrar del todo si tiene contenido asociado; por eso se archiva.</p>
              </Bloque>

              <Bloque value="a-materiales" titulo="Materiales de un curso">
                <ol className="ml-4 list-decimal space-y-1.5">
                  <Paso>Pestaña <strong className="text-foreground">Materiales</strong> → elegí el curso en el selector.</Paso>
                  <Paso>Cargá el material con su <em>título</em>, <em>tipo</em> y <em>enlace</em> (o archivo).</Paso>
                </ol>
              </Bloque>

              <Bloque value="a-matriculas" titulo="Matricular estudiantes">
                <ol className="ml-4 list-decimal space-y-1.5">
                  <Paso>Pestaña <strong className="text-foreground">Matriculación</strong> → elegí el curso.</Paso>
                  <Paso>Buscá al estudiante por nombre y confirmá la matrícula. Los ya inscriptos aparecen en la lista.</Paso>
                </ol>
              </Bloque>

              <Bloque value="a-asistencia" titulo="Asistencia">
                <ol className="ml-4 list-decimal space-y-1.5">
                  <Paso>Pestaña <strong className="text-foreground">Asistencia</strong> → elegí curso y fecha.</Paso>
                  <Paso>Marcá presente/ausente por alumno y guardá.</Paso>
                </ol>
              </Bloque>

              <Bloque value="a-paes" titulo="Ensayos PAES: cargar la prueba y las respuestas">
                <p className="mb-2">El proceso tiene dos cargas (preguntas y clave) y un solo guardado:</p>
                <ol className="ml-4 list-decimal space-y-1.5">
                  <Paso>Entrá a <strong className="text-foreground">Crear ensayo PAES</strong> (<code className="font-mono text-xs">/dashboard/admin/paes</code>).</Paso>
                  <Paso>Completá arriba: <em>Título, Asignatura, Fecha, Duración</em> y el toggle <em>Publicado/Borrador</em>.</Paso>
                  <Paso><strong className="text-foreground">Cargás la prueba</strong>: botón <strong className="text-foreground">“Importar desde PDF”</strong> → subís el folleto de preguntas. El texto se extrae y la portada de instrucciones se separa sola al campo Instrucciones. Tocá <strong className="text-foreground">“Cargar al editor”</strong>.</Paso>
                  <Paso>Revisás las preguntas (numeración, alternativas, imágenes si hace falta).</Paso>
                  <Paso><strong className="text-foreground">Cargás las respuestas</strong>: botón <strong className="text-foreground">“Cargar respuestas”</strong> → pegás la clave (formato <code className="font-mono text-xs">1: A 2: C 3: D…</code> o <code className="font-mono text-xs">ACBD…</code>) → <strong className="text-foreground">“Marcar correctas”</strong>. Se marca sola la correcta de cada pregunta.</Paso>
                  <Paso>Revisás que cada correcta quede bien.</Paso>
                  <Paso>Apretá <strong className="text-foreground">“Crear simulacro”</strong>. Queda guardado y se auto-corrige cuando los alumnos lo rinden.</Paso>
                </ol>
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-300/50 bg-amber-50 p-3 text-xs text-amber-900">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <span>
                    Cargá solo contenido propio o autorizado. Los exámenes oficiales DEMRE no se pueden reproducir; su
                    clave oficial se publica en demre.cl y la pegás vos en “Cargar respuestas”.
                  </span>
                </div>
                <p className="mt-3">
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/dashboard/admin/paes">Ir a Crear ensayo PAES</Link>
                  </Button>
                </p>
              </Bloque>

              <Bloque value="a-resultados" titulo="Resultados que se muestran en el home">
                <p>
                  Los números de la sección “Resultados” del sitio (puntaje promedio, % de ingreso, mejora, N de alumnos)
                  viven en la colección <code className="font-mono text-xs">resultados_paes</code> y por ahora se cargan
                  desde el panel de <strong className="text-foreground">PocketBase</strong> (la URL del backend + <code className="font-mono text-xs">/_/</code>):
                </p>
                <ol className="ml-4 mt-2 list-decimal space-y-1.5">
                  <Paso>Collections → <code className="font-mono text-xs">resultados_paes</code> → New record.</Paso>
                  <Paso>Completá <em>anio_promocion</em> (uno por año), <em>puntaje_promedio_general</em>, <em>n_alumnos</em>, etc.</Paso>
                  <Paso>Marcá <strong className="text-foreground">publicado = true</strong> para que aparezca en el sitio.</Paso>
                </ol>
              </Bloque>

              <Bloque value="a-usuarios" titulo="Usuarios">
                <p>Pestaña <strong className="text-foreground">Usuarios</strong>: creás y gestionás cuentas y roles (estudiante, apoderado, profesor, admin).</p>
              </Bloque>
            </Accordion>
          </TabsContent>

          {/* =========================== DOCENTE =========================== */}
          <TabsContent value="docente">
            <Accordion type="single" collapsible className="space-y-3">
              <Bloque value="d-panel" titulo="Tu panel">
                <p>
                  Entrá a <strong className="text-foreground">Mi panel</strong> (<code className="font-mono text-xs">/dashboard/profesor</code>):
                  ahí ves las <strong className="text-foreground">secciones</strong> que tenés a cargo. Tocá una para entrar.
                </p>
              </Bloque>

              <Bloque value="d-seccion" titulo="Dentro de una sección">
                <p>Desde el detalle de la sección podés ver a tus alumnos, tomar asistencia, y gestionar tareas y notas de ese grupo.</p>
              </Bloque>

              <Bloque value="d-tareas" titulo="Calificar tareas">
                <ol className="ml-4 list-decimal space-y-1.5">
                  <Paso>Abrí la entrega del alumno desde la tarea.</Paso>
                  <Paso>Ponés la <em>nota</em> y un <em>comentario/feedback</em> y guardás. El alumno recibe la notificación.</Paso>
                </ol>
              </Bloque>

              <Bloque value="d-evaluaciones" titulo="Cargar notas de una evaluación">
                <p>
                  Desde una evaluación entrás a la <strong className="text-foreground">calificación masiva</strong>: cargás la nota de
                  cada alumno en una sola pantalla. Al publicar, se notifica y aparece en la libreta del estudiante.
                </p>
              </Bloque>

              <Bloque value="d-paes" titulo="Crear ensayos PAES">
                <p>
                  Los docentes también pueden armar ensayos en <code className="font-mono text-xs">/dashboard/admin/paes</code>.
                  El proceso es el mismo que para admin: <strong className="text-foreground">Importar desde PDF</strong> (la prueba) →
                  revisar → <strong className="text-foreground">Cargar respuestas</strong> (la clave) → revisar → Crear simulacro.
                  Mirá el detalle en la pestaña <strong className="text-foreground">Administradores → “Ensayos PAES”</strong>.
                </p>
              </Bloque>

              <Bloque value="d-mensajes" titulo="Mensajes y notificaciones">
                <p>
                  La campana (arriba a la derecha) muestra tus notificaciones; el ícono de mensajes abre la mensajería 1-a-1
                  con estudiantes y apoderados de tus grupos.
                </p>
              </Bloque>
            </Accordion>
          </TabsContent>
        </Tabs>

        <div className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          ¿Falta algo o algo no coincide con lo que ves? Avisanos y lo actualizamos.
        </div>
      </div>
    </>
  );
};

export default ManualPage;
