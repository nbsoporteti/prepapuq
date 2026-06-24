import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Library,
  Dna,
  Atom,
  FlaskConical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

const BASE = '/biblioteca';

const TEMARIOS = [
  {
    titulo: 'Temario Biología PAES',
    desc: 'Ejes y contenidos oficiales para Ciencias — Biología.',
    file: 'temario-biologia.pdf',
    icon: Dna,
    cls: 'bg-success/10 text-success',
  },
  {
    titulo: 'Temario Física PAES',
    desc: 'Ejes y contenidos oficiales para Ciencias — Física.',
    file: 'temario-fisica.pdf',
    icon: Atom,
    cls: 'bg-info/10 text-info',
  },
  {
    titulo: 'Temario Química PAES',
    desc: 'Ejes y contenidos oficiales para Ciencias — Química.',
    file: 'temario-quimica.pdf',
    icon: FlaskConical,
    cls: 'bg-accent/10 text-accent',
  },
];

const ASIGNATURA_COLOR = {
  competencia_lectora: 'bg-info/10 text-info border-info/30',
  matematica_m1: 'bg-primary/10 text-primary border-primary/30',
  matematica_m2: 'bg-secondary/10 text-secondary border-secondary/30',
  historia: 'bg-accent/15 text-accent border-accent/30',
  ciencias: 'bg-success/10 text-success border-success/30',
};

const ASIGNATURA_LABEL = {
  competencia_lectora: 'Competencia Lectora',
  matematica_m1: 'Matemática M1',
  matematica_m2: 'Matemática M2',
  historia: 'Historia y Cs. Sociales',
  ciencias: 'Ciencias',
};

const ENSAYOS = [
  { titulo: 'Ensayo Competencia Lectora 2027', file: 'ensayo-competencia-lectora-2027.pdf', asignatura: 'competencia_lectora' },
  { titulo: 'Ensayo Matemática M1 2027', file: 'ensayo-matematica-m1-2027.pdf', asignatura: 'matematica_m1' },
  { titulo: 'Ensayo Matemática M2 2027', file: 'ensayo-matematica-m2-2027.pdf', asignatura: 'matematica_m2' },
  { titulo: 'Ensayo Historia y Cs. Sociales 2027', file: 'ensayo-historia-2027.pdf', asignatura: 'historia' },
  { titulo: 'Ensayo Ciencias — Módulo Común 2027', file: 'ensayo-ciencias-comun-tp-2027.pdf', asignatura: 'ciencias' },
  { titulo: 'Ensayo Ciencias — Biología 2027', file: 'ensayo-ciencias-biologia-2027.pdf', asignatura: 'ciencias' },
  { titulo: 'Ensayo Ciencias — Física 2027', file: 'ensayo-ciencias-fisica-2027.pdf', asignatura: 'ciencias' },
  { titulo: 'Ensayo Ciencias — Química 2027', file: 'ensayo-ciencias-quimica-2027.pdf', asignatura: 'ciencias' },
];

const DocActions = ({ href }) => (
  <div className="flex gap-2">
    <Button variant="default" size="sm" asChild className="flex-1">
      <a href={href} target="_blank" rel="noopener noreferrer">
        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
        Abrir
      </a>
    </Button>
    <Button variant="outline" size="sm" asChild>
      <a href={href} download aria-label="Descargar PDF">
        <Download className="h-3.5 w-3.5" />
      </a>
    </Button>
  </div>
);

const BibliotecaPage = () => {
  return (
    <>
      <Helmet>
        <title>Biblioteca PAES | PrePa</title>
      </Helmet>

      <div className="min-h-screen bg-muted/30 pb-16">
        {/* Hero */}
        <div className="border-b border-border bg-primary/5">
          <div className="container mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="-ml-3 mb-6 text-muted-foreground hover:text-foreground"
            >
              <Link to="/dashboard/estudiante">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver al panel
              </Link>
            </Button>
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Library className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Biblioteca PAES</h1>
                <p className="mt-2 max-w-2xl text-muted-foreground">
                  Temarios oficiales y ensayos para practicar. Ábrelos en el navegador o descárgalos
                  para estudiar sin conexión.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto max-w-5xl space-y-12 px-4 py-10 sm:px-6 lg:px-8">
          {/* Temarios */}
          <section>
            <h2 className="mb-1 text-2xl font-bold">Temarios</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Qué entra en la PAES de Ciencias, eje por eje.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {TEMARIOS.map((t) => {
                const Icon = t.icon;
                return (
                  <Card key={t.file} className="flex flex-col">
                    <CardContent className="flex flex-1 flex-col gap-3 p-5">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${t.cls}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold leading-snug">{t.titulo}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
                      </div>
                      <DocActions href={`${BASE}/${t.file}`} />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          {/* Ensayos */}
          <section>
            <h2 className="mb-1 text-2xl font-bold">Ensayos</h2>
            <p className="mb-5 text-sm text-muted-foreground">
              Modelos de prueba por asignatura. Para rendirlos con cronómetro y hoja de respuestas,
              entra a{' '}
              <Link to="/dashboard/estudiante" className="text-primary underline underline-offset-2">
                Mi PAES
              </Link>
              .
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {ENSAYOS.map((e) => (
                <Card key={e.file}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <Badge
                        variant="secondary"
                        className={`mb-1.5 text-[10px] ${ASIGNATURA_COLOR[e.asignatura] || ''}`}
                      >
                        {ASIGNATURA_LABEL[e.asignatura] || e.asignatura}
                      </Badge>
                      <h3 className="truncate font-medium" title={e.titulo}>
                        {e.titulo}
                      </h3>
                    </div>
                    <DocActions href={`${BASE}/${e.file}`} />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
};

export default BibliotecaPage;
